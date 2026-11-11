import secrets
from uuid import uuid4
import pytest
import pyotp
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker
from app.config import get_settings
from app.database import Base, get_db
from app.main import app
from app import models as m
from app.policy import PERMISSIONS
from app.security import hasher

ORIGIN = "http://localhost:3001"
HEADERS = {"Origin": ORIGIN, "X-Requested-With": "IA-Compliance"}


@pytest.fixture
def world():
    settings = get_settings()
    if settings.app_env not in {"development", "test"}:
        raise RuntimeError("Testes de infraestrutura não são permitidos no ambiente de produção.")
    url = make_url(settings.migration_database_url or settings.database_url).set(database="compliance_test")
    if not url.drivername.startswith("postgresql") or url.database != "compliance_test":
        raise RuntimeError("Testes exigem PostgreSQL no banco isolado compliance_test.")
    base = create_engine(url)
    schema = "test_" + uuid4().hex
    with base.begin() as db:
        db.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = base.execution_options(schema_translate_map={None: schema})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    password = secrets.token_urlsafe(24)
    with factory() as db:
        office = m.Organization(name="Escritório teste", kind="OFFICE")
        db.add(office)
        db.flush()
        orgs = {}
        companies = {}
        users = {}
        members = {}
        for key in ["a", "b"]:
            org = m.Organization(name="Organização " + key, kind="CLIENT", office_id=office.id)
            db.add(org)
            db.flush()
            orgs[key] = org
            company = m.Company(
                name="Empresa " + key,
                organization_id=org.id,
                cnpj="DEMO-TEST-" + key,
                municipality="Itumbiara/GO",
                tax_regime="A parametrizar",
            )
            db.add(company)
            db.flush()
            companies[key] = company
        extra = m.Company(
            name="Filial A",
            organization_id=orgs["a"].id,
            cnpj="DEMO-TEST-A2",
            municipality="Goiânia/GO",
            tax_regime="A parametrizar",
        )
        db.add(extra)
        db.flush()
        companies["a2"] = extra
        db.add(
            m.CompanyAuthorization(
                office_organization_id=office.id,
                company_id=companies["a"].id,
                permissions=sorted(PERMISSIONS["SUPERADMIN_ESCRITORIO"] - {"organization:create"}),
            )
        )
        for key, role, org, company in [
            ("office", "SUPERADMIN_ESCRITORIO", office, None),
            ("manager", "ADMIN_CLIENTE", orgs["a"], None),
            ("a", "EMISSOR_CLIENTE", orgs["a"], companies["a"]),
            ("b", "EMISSOR_CLIENTE", orgs["b"], companies["b"]),
            ("read", "CONSULTA_CLIENTE", orgs["a"], companies["a"]),
            ("support", "SUPORTE", office, None),
            ("scoped_manager", "ADMIN_CLIENTE", orgs["a"], companies["a"]),
        ]:
            user = m.User(name="Usuário " + key, email=key + "@tests.example.com", password_hash=hasher.hash(password))
            db.add(user)
            db.flush()
            member = m.Membership(
                user_id=user.id, organization_id=org.id, company_id=company.id if company else None, role=role
            )
            db.add(member)
            db.flush()
            users[key] = user
            members[key] = member
        customers = {}
        services = {}
        for key in ["a", "b"]:
            customer = m.Customer(
                company_id=companies[key].id,
                organization_id=orgs[key].id,
                name="Tomador " + key,
                document="DEMO-" + key,
            )
            service = m.Service(
                company_id=companies[key].id,
                organization_id=orgs[key].id,
                name="Serviço " + key,
                description="Descrição de teste",
            )
            db.add_all([customer, service])
            db.flush()
            customers[key] = customer
            services[key] = service
        db.commit()

    def override():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = override
    clients = []

    def login(key, mfa=True):
        client = TestClient(app, headers=HEADERS)
        clients.append(client)
        response = client.post("/api/auth/login", json={"email": users[key].email, "password": password})
        assert response.status_code == 200, response.text
        info = response.json()
        client.headers["X-CSRF-Token"] = info["csrf_token"]
        if info["phase"] == "MFA_ENROLLMENT_REQUIRED" and mfa:
            secret = client.post("/api/auth/mfa/enroll", json={}).json()["secret"]
            confirmed = client.post("/api/auth/mfa/confirm", json={"code": pyotp.TOTP(secret).now()})
            assert confirmed.status_code == 200, confirmed.text
            info = confirmed.json()
            client.headers["X-CSRF-Token"] = info["csrf_token"]
        return client, info

    yield {
        "app": app,
        "factory": factory,
        "engine": engine,
        "schema": schema,
        "base": base,
        "office": office,
        "orgs": orgs,
        "companies": companies,
        "users": users,
        "members": members,
        "customers": customers,
        "services": services,
        "login": login,
        "password": password,
        "headers": HEADERS,
    }
    for client in clients:
        client.close()
    app.dependency_overrides.clear()
    with base.begin() as db:
        db.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
    base.dispose()
