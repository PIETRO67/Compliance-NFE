from test_m1 import path


def test_company_scoped_admin_cannot_expand_role_or_read_other_company_members(world):
    client, _ = world["login"]("scoped_manager")
    company = world["companies"]["a"]
    rows = client.get("/api/admin/users").json()
    assert all(row["company_id"] == company.id for row in rows)
    payload = {
        "organization_id": world["orgs"]["a"].id,
        "company_id": None,
        "role": "ADMIN_CLIENTE",
        "name": "Tentativa",
        "email": "escalation@tests.example.com",
    }
    assert client.post("/api/admin/invitations", json=payload).status_code == 403
    assert (
        client.post(
            "/api/admin/invitations",
            json={**payload, "role": "CONSULTA_CLIENTE", "company_id": world["companies"]["a2"].id},
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/admin/companies",
            json={
                "organization_id": world["orgs"]["a"].id,
                "name": "Nova indevida",
                "cnpj": "DEMO-SCOPE",
                "municipality": "Itumbiara",
                "tax_regime": "Teste",
            },
        ).status_code
        == 403
    )
    assert (
        client.patch("/api/admin/memberships/" + world["members"]["manager"].id, json={"active": False}).status_code
        == 403
    )
    assert client.get(path(world, "a2")).status_code == 404


def test_office_partial_delegation_cannot_create_orgwide_admin_or_new_company(world):
    client, _ = world["login"]("office")
    payload = {
        "organization_id": world["orgs"]["a"].id,
        "company_id": None,
        "role": "ADMIN_CLIENTE",
        "name": "Tentativa",
        "email": "escalation-office@tests.example.com",
    }
    assert client.post("/api/admin/invitations", json=payload).status_code == 403
    assert (
        client.post("/api/admin/invitations", json={**payload, "company_id": world["companies"]["a2"].id}).status_code
        == 404
    )
    assert (
        client.post(
            "/api/admin/companies",
            json={
                "organization_id": world["orgs"]["a"].id,
                "name": "Nova indevida",
                "cnpj": "DEMO-OFFICE-SCOPE",
                "municipality": "Itumbiara",
                "tax_regime": "Teste",
            },
        ).status_code
        == 403
    )
    allowed = client.post(
        "/api/admin/invitations", json={**payload, "company_id": world["companies"]["a"].id, "role": "CONSULTA_CLIENTE"}
    )
    assert allowed.status_code == 201
