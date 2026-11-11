import argparse
import getpass
import json
import os
import secrets
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.orm import Session
from .config import get_settings
from .database import engine
from .models import AuditLog, Company, CompanyAuthorization, Membership, Organization, User
from .policy import PERMISSIONS
from .security import hasher


def bootstrap(email, name):
    from pydantic import TypeAdapter, EmailStr, ValidationError

    try:
        email = str(TypeAdapter(EmailStr).validate_python(email))
    except ValidationError:
        raise SystemExit("E-mail do administrador inválido.") from None
    password = getpass.getpass("Senha inicial (mínimo 12 caracteres, não será exibida): ")
    if len(password.strip()) < 12 or len(set(password)) < 6 or password != getpass.getpass("Confirme a senha: "):
        raise SystemExit("Senha inválida ou confirmação divergente.")
    with Session(engine()) as db:
        if db.scalar(select(User.id).limit(1)):
            raise SystemExit("Bootstrap já realizado. Use convites autenticados para novos acessos.")
        org = Organization(name="Grupo IA Compliance", kind="OFFICE")
        db.add(org)
        db.flush()
        user = User(email=email.lower(), name=name, password_hash=hasher.hash(password))
        db.add(user)
        db.flush()
        db.add(Membership(user_id=user.id, organization_id=org.id, role="SUPERADMIN_ESCRITORIO"))
        db.add(AuditLog(actor_id=user.id, organization_id=org.id, action="bootstrap.completed"))
        db.commit()
    print("Administrador criado. O primeiro acesso exigirá cadastro do autenticador MFA.")


def development_fixtures():
    settings = get_settings()
    if settings.app_env != "development" or not settings.enable_dev_tools:
        raise SystemExit("Fixtures só podem ser criadas no desenvolvimento explicitamente habilitado.")
    with Session(engine()) as db:
        if db.scalar(select(User.id).limit(1)):
            raise SystemExit("Banco não vazio: fixtures não foram aplicadas. Dados existentes preservados.")
        office = Organization(name="Escritório de desenvolvimento IA Compliance", kind="OFFICE")
        db.add(office)
        db.flush()
        organizations = []
        companies = []
        for label in ["A", "B"]:
            org = Organization(name=f"Cliente local {label} — sem dados reais", kind="CLIENT", office_id=office.id)
            db.add(org)
            db.flush()
            company = Company(
                organization_id=org.id,
                name=f"Empresa local {label}",
                cnpj=f"DEMO-M1-{label}",
                municipality="Itumbiara/GO",
                tax_regime="A parametrizar",
            )
            db.add(company)
            db.flush()
            db.add(
                CompanyAuthorization(
                    office_organization_id=office.id,
                    company_id=company.id,
                    permissions=sorted(PERMISSIONS["SUPERADMIN_ESCRITORIO"] - {"organization:create"}),
                )
            )
            organizations.append(org)
            companies.append(company)
        access = []
        for key, name, role, org, company in [
            ("office", "Administrador local", "SUPERADMIN_ESCRITORIO", office, None),
            ("manager_a", "Gestor local A", "ADMIN_CLIENTE", organizations[0], None),
            ("emitter_a", "Emissor local A", "EMISSOR_CLIENTE", organizations[0], companies[0]),
            ("consult_a", "Consulta local A", "CONSULTA_CLIENTE", organizations[0], companies[0]),
            ("emitter_b", "Emissor local B", "EMISSOR_CLIENTE", organizations[1], companies[1]),
        ]:
            password = secrets.token_urlsafe(24)
            user = User(name=name, email=f"{key}@m1.example.com", password_hash=hasher.hash(password))
            db.add(user)
            db.flush()
            db.add(
                Membership(
                    user_id=user.id, organization_id=org.id, company_id=company.id if company else None, role=role
                )
            )
            access.append(
                {
                    "key": key,
                    "email": user.email,
                    "password": password,
                    "company_id": company.id if company else None,
                    "user_id": user.id,
                }
            )
        db.add(AuditLog(action="development.fixtures_created", organization_id=office.id))
        destination = (
            Path(os.environ.get("LOCAL_STATE_DIR", str(Path(__file__).resolve().parents[2] / ".local")))
            / "m1-access.json"
        )
        destination.parent.mkdir(parents=True, exist_ok=True)
        # Falha de escrita não deve deixar contas criadas com senhas inacessíveis.
        with destination.open("x", encoding="utf8") as stream:
            json.dump(
                {
                    "notice": "Somente acessos locais de desenvolvimento, senhas aleatórias, apagar após uso.",
                    "users": access,
                },
                stream,
                indent=2,
            )
        destination.chmod(0o600)
        db.commit()
    print("Acessos de desenvolvimento gerados em .local/m1-access.json; nenhum segredo foi exibido.")


def reset_development_auth():
    from .models import AuthSession, LoginThrottle
    from sqlalchemy import delete

    if get_settings().app_env != "development" or not get_settings().enable_dev_tools:
        raise SystemExit("Reset permitido apenas em desenvolvimento explicitamente habilitado.")
    with Session(engine()) as db:
        users = db.scalars(select(User).where(User.email.like("%@m1.example.com"))).all()
        for user in users:
            if user.email == "office@m1.example.com":
                user.totp_encrypted = None
                user.last_totp_step = -1
                user.recovery_hashes = []
            for session in db.scalars(select(AuthSession).where(AuthSession.user_id == user.id)):
                session.revoked = True
        db.execute(delete(LoginThrottle))
        db.add(AuditLog(action="development.test_auth_reset"))
        db.commit()
    print("Autenticação das fixtures locais preparada para testes. Nenhuma credencial foi exibida.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["bootstrap", "development-fixtures", "reset-development-auth"])
    parser.add_argument("--email")
    parser.add_argument("--name", default="Administrador IA Compliance")
    args = parser.parse_args()
    if args.command == "bootstrap":
        if not args.email:
            parser.error("--email é obrigatório para bootstrap")
        bootstrap(args.email, args.name)
    elif args.command == "development-fixtures":
        development_fixtures()
    else:
        reset_development_auth()


if __name__ == "__main__":
    main()
