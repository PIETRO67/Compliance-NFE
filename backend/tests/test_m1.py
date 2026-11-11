from datetime import timedelta
import json
import pyotp
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from app import models as m
from app.config import get_settings
from app.providers import MockFiscalProvider, ProviderUnavailable, DisabledPaymentProvider
from app.security import COOKIE, decrypt, digest


def path(w, key, resource="customers"):
    return f"/api/client/companies/{w['companies'][key].id}/{resource}"


def test_anonymous_is_blocked(world):
    with TestClient(world["app"]) as c:
        assert c.get("/api/companies").status_code == 401
        assert c.get(path(world, "a")).status_code == 401


def test_metrics_company_filter_obeys_scope(world):
    c, _ = world["login"]("manager")
    assert c.get("/api/admin/metrics").json()["companies"] == 2
    assert c.get("/api/admin/metrics", params={"company_id": world["companies"]["a"].id}).json()["companies"] == 1
    assert c.get("/api/admin/metrics", params={"company_id": world["companies"]["b"].id}).status_code == 404


def test_login_cookie_and_logout(world):
    c, info = world["login"]("a")
    assert info["phase"] == "AUTHENTICATED"
    assert "password_hash" not in json.dumps(info)
    assert len(c.cookies[COOKIE]) == 64
    raw = c.cookies[COOKIE]
    with world["factory"]() as db:
        assert db.get(m.AuthSession, raw) is None
        assert db.get(m.AuthSession, digest(raw)) is not None
    assert c.post("/api/auth/logout", json={}).status_code == 204
    assert c.get("/api/me").status_code == 401


def test_cookie_flags(world):
    with TestClient(world["app"], headers=world["headers"]) as c:
        r = c.post("/api/auth/login", json={"email": world["users"]["a"].email, "password": world["password"]})
        cookie = r.headers["set-cookie"].lower()
        assert "httponly" in cookie and "samesite=strict" in cookie and "path=/" in cookie


def test_cross_company_paths_and_lists(world):
    c, _ = world["login"]("a")
    assert [r["id"] for r in c.get("/api/companies").json()] == [world["companies"]["a"].id]
    for resource in ["customers", "services", "invoices", "invoices/drafts", "providers"]:
        assert c.get(path(world, "b", resource)).status_code == 404
        assert c.get(path(world, "a2", resource)).status_code == 404
    assert c.get("/api/client/companies/" + world["companies"]["b"].id).status_code == 404


def test_client_admin_only_own_organization(world):
    c, _ = world["login"]("manager")
    assert {r["id"] for r in c.get("/api/companies").json()} == {
        world["companies"]["a"].id,
        world["companies"]["a2"].id,
    }
    assert {u["organization_id"] for u in c.get("/api/admin/users").json()} == {world["orgs"]["a"].id}
    assert (
        c.post(
            "/api/admin/companies",
            json={
                "organization_id": world["orgs"]["b"].id,
                "name": "Ataque",
                "cnpj": "DEMO-ATTACK",
                "municipality": "Itumbiara",
                "tax_regime": "Teste",
            },
        ).status_code
        == 404
    )


def test_office_needs_explicit_company_authorization(world):
    c, _ = world["login"]("office")
    assert [r["id"] for r in c.get("/api/companies").json()] == [world["companies"]["a"].id]
    assert c.get(path(world, "b")).status_code == 404
    manager, _ = world["login"]("manager")
    assert manager.patch(path(world, "a", "office-authorization"), json={"active": False}).status_code == 200
    assert c.get(path(world, "a")).status_code == 404
    assert (
        c.post(
            "/api/admin/invitations",
            json={
                "organization_id": world["orgs"]["a"].id,
                "company_id": world["companies"]["a"].id,
                "role": "ADMIN_CLIENTE",
                "name": "Teste",
                "email": "new@tests.example.com",
            },
        ).status_code
        == 404
    )


def test_forged_tenant_payload_is_rejected(world):
    c, _ = world["login"]("a")
    r = c.post(
        path(world, "a"),
        json={"name": "Tomador teste", "document": "DEMO-TEST", "organization_id": world["orgs"]["b"].id},
    )
    assert r.status_code == 422
    body = {"name": "Tomador novo", "document": "DEMO-TEST", "email": "", "municipality": "Itumbiara", "active": True}
    assert c.put(path(world, "a") + "/" + world["customers"]["b"].id, json=body).status_code == 404


def test_readonly_and_support_permissions(world):
    c, _ = world["login"]("read")
    assert c.get(path(world, "a")).status_code == 200
    assert c.post(path(world, "a"), json={"name": "Novo", "document": "DEMO-NEW"}).status_code == 403
    assert c.get("/api/admin/users").status_code == 403
    support, _ = world["login"]("support")
    assert support.get("/api/companies").status_code == 200
    assert support.get(path(world, "a")).status_code == 403


def test_catalog_and_draft_persist_scope_and_references(world):
    c, _ = world["login"]("a")
    customer = c.post(path(world, "a"), json={"name": "Tomador persistido", "document": "DEMO-123"}).json()
    service = c.post(
        path(world, "a", "services"), json={"name": "Serviço persistido", "description": "Descrição persistida"}
    ).json()
    body = {
        "customer_id": customer["id"],
        "service_id": service["id"],
        "description": "Rascunho persistido",
        "competence_date": "2026-11-11",
        "amount": "1250.50",
        "step": 3,
    }
    created = c.post(path(world, "a", "invoices/drafts"), json=body)
    assert created.status_code == 201, created.text
    draft = created.json()
    assert draft["company_id"] == world["companies"]["a"].id
    assert c.get(path(world, "a", "invoices/drafts")).json()[0]["step"] == 3
    body["customer_id"] = world["customers"]["b"].id
    assert c.post(path(world, "a", "invoices/drafts"), json=body).status_code == 404
    assert c.request("DELETE", path(world, "b", "invoices/drafts") + "/" + draft["id"], json={}).status_code == 404


def test_database_foreign_keys_also_reject_cross_tenant_reference(world):
    with world["factory"]() as db:
        db.add(
            m.InvoiceDraft(
                company_id=world["companies"]["a"].id,
                organization_id=world["orgs"]["a"].id,
                customer_id=world["customers"]["b"].id,
                competence_date="2026-11-11",
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()


def test_csrf_and_origin(world):
    c, _ = world["login"]("a")
    c.headers.pop("X-CSRF-Token")
    assert c.post(path(world, "a"), json={"name": "Tomador", "document": "DEMO"}).status_code == 403
    c.headers["X-CSRF-Token"] = c.get("/api/me").json()["csrf_token"]
    c.headers["Origin"] = "https://attacker.example"
    assert c.post(path(world, "a"), json={"name": "Tomador", "document": "DEMO"}).status_code == 403


def test_expiry_and_membership_revocation(world):
    c, _ = world["login"]("a")
    manager, _ = world["login"]("manager")
    assert (
        manager.patch("/api/admin/memberships/" + world["members"]["a"].id, json={"active": False}).status_code == 200
    )
    assert c.get("/api/me").status_code == 401
    other, _ = world["login"]("b")
    with world["factory"]() as db:
        db.get(m.AuthSession, digest(other.cookies[COOKIE])).expires_at = m.now() - timedelta(seconds=1)
        db.commit()
    assert other.get("/api/me").status_code == 401


def test_last_admin_cannot_be_revoked(world):
    c, _ = world["login"]("office")
    assert c.patch("/api/admin/memberships/" + world["members"]["office"].id, json={"active": False}).status_code == 409


def test_mfa_enrollment_blocks_resources_and_encrypts_secret(world):
    c, info = world["login"]("office", mfa=False)
    assert info["phase"] == "MFA_ENROLLMENT_REQUIRED"
    assert c.get("/api/companies").status_code == 403
    secret = c.post("/api/auth/mfa/enroll", json={}).json()["secret"]
    confirmed = c.post("/api/auth/mfa/confirm", json={"code": pyotp.TOTP(secret).now()})
    assert confirmed.status_code == 200
    assert len(confirmed.json()["recovery_codes"]) == 10
    with world["factory"]() as db:
        user = db.get(m.User, world["users"]["office"].id)
        assert user.totp_encrypted != secret and decrypt(user.totp_encrypted) == secret
        assert confirmed.json()["recovery_codes"][0] not in user.recovery_hashes


def test_mfa_replay_recovery_and_token_rotation(world):
    c, info = world["login"]("office")
    recovery = info["recovery_codes"][0]
    raw = c.cookies[COOKIE]
    assert c.post("/api/auth/logout", json={}).status_code == 204
    login = c.post(
        "/api/auth/login", json={"email": world["users"]["office"].email, "password": world["password"]}
    ).json()
    c.headers["X-CSRF-Token"] = login["csrf_token"]
    with world["factory"]() as db:
        secret = decrypt(db.get(m.User, world["users"]["office"].id).totp_encrypted)
    assert c.post("/api/auth/mfa/verify", json={"code": pyotp.TOTP(secret).now()}).status_code == 401
    verified = c.post("/api/auth/mfa/verify", json={"code": recovery})
    assert verified.status_code == 200 and c.cookies[COOKIE] != raw
    c.headers["X-CSRF-Token"] = verified.json()["csrf_token"]
    c.post("/api/auth/logout", json={})
    login = c.post(
        "/api/auth/login", json={"email": world["users"]["office"].email, "password": world["password"]}
    ).json()
    c.headers["X-CSRF-Token"] = login["csrf_token"]
    assert c.post("/api/auth/mfa/verify", json={"code": recovery}).status_code == 401


def test_invite_scope_expiration_acceptance_and_single_use(world):
    c, _ = world["login"]("manager")
    payload = {
        "organization_id": world["orgs"]["a"].id,
        "company_id": world["companies"]["a"].id,
        "role": "EMISSOR_CLIENTE",
        "name": "Convidado",
        "email": "invite@tests.example.com",
    }
    assert c.post("/api/admin/invitations", json={**payload, "role": "SUPERADMIN_ESCRITORIO"}).status_code == 403
    assert (
        c.post("/api/admin/invitations", json={**payload, "company_id": world["companies"]["b"].id}).status_code == 404
    )
    inv = c.post("/api/admin/invitations", json=payload).json()
    with TestClient(world["app"], headers=world["headers"]) as newcomer:
        accepted = newcomer.post(
            "/api/auth/invitations/accept", json={"token": inv["token"], "password": world["password"]}
        )
        assert accepted.status_code == 200, accepted.text
        assert accepted.json()["companies"][0]["id"] == world["companies"]["a"].id
        assert (
            newcomer.post(
                "/api/auth/invitations/accept", json={"token": inv["token"], "password": world["password"]}
            ).status_code
            == 400
        )
    expired = c.post("/api/admin/invitations", json={**payload, "email": "expired@tests.example.com"}).json()
    with world["factory"]() as db:
        db.get(m.Invitation, expired["id"]).expires_at = m.now() - timedelta(seconds=1)
        db.commit()
    with TestClient(world["app"], headers=world["headers"]) as newcomer:
        assert (
            newcomer.post(
                "/api/auth/invitations/accept", json={"token": expired["token"], "password": world["password"]}
            ).status_code
            == 400
        )


def test_invite_existing_account_does_not_reset_password(world):
    c, _ = world["login"]("manager")
    inv = c.post(
        "/api/admin/invitations",
        json={
            "organization_id": world["orgs"]["a"].id,
            "company_id": world["companies"]["a2"].id,
            "role": "CONSULTA_CLIENTE",
            "name": "Já existente",
            "email": world["users"]["a"].email,
        },
    ).json()
    with TestClient(world["app"], headers=world["headers"]) as fresh:
        assert (
            fresh.post(
                "/api/auth/invitations/accept", json={"token": inv["token"], "password": "another-password-2026"}
            ).status_code
            == 409
        )
    existing, _ = world["login"]("a")
    assert existing.post("/api/invitations/accept-existing", json={"token": inv["token"]}).status_code == 200
    assert {row["id"] for row in existing.get("/api/companies").json()} == {
        world["companies"]["a"].id,
        world["companies"]["a2"].id,
    }


def test_provider_disabled_no_fake_authorization(world):
    c, _ = world["login"]("a")
    draft = c.post(path(world, "a", "invoices/drafts"), json={"competence_date": "2026-11-11"}).json()
    assert c.post(path(world, "a", f"invoices/{draft['id']}/issue"), json={}).status_code == 501
    assert c.get(path(world, "a", "invoices")).json() == []
    assert c.get(path(world, "a", "providers")).json()["fiscal"]["issue"] is False
    with pytest.raises(ProviderUnavailable):
        MockFiscalProvider("production")
    with pytest.raises(ProviderUnavailable):
        DisabledPaymentProvider().create_charge({}, "1.00", "key")


def test_no_secret_in_validation_or_audit(world):
    c, _ = world["login"]("office")
    response = c.post("/api/auth/login", json={"email": "not-an-email", "password": "a-secret-that-must-not-echo"})
    assert response.status_code == 422 and "a-secret-that-must-not-echo" not in response.text
    logs = c.get("/api/admin/audit").text
    assert world["password"] not in logs and get_settings().secret_key not in logs


def test_rate_limit_is_persisted(world):
    with TestClient(world["app"], headers=world["headers"]) as c:
        responses = [
            c.post("/api/auth/login", json={"email": "missing@tests.example.com", "password": "wrong"}).status_code
            for _ in range(11)
        ]
        assert responses[-1] == 429
