import hashlib
import hmac
import secrets
from datetime import timedelta, timezone
from cryptography.fernet import Fernet
from fastapi import Depends, HTTPException, Request, Response
from fastapi.security import APIKeyCookie
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session
from .config import get_settings
from .database import get_db
from .models import AuthSession, LoginThrottle, Membership, User, now

hasher = PasswordHash.recommended()
_dummy = hasher.hash(secrets.token_urlsafe(24))
MFA_ROLES = {"SUPERADMIN_ESCRITORIO", "GESTOR_ESCRITORIO", "ADMIN_CLIENTE"}
COOKIE = "__Host-ia_session" if get_settings().secure_cookies else "ia_session"
session_cookie = APIKeyCookie(name=COOKIE, auto_error=False)


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def encrypt(value: str) -> str:
    return Fernet(get_settings().mfa_encryption_key.encode()).encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    return Fernet(get_settings().mfa_encryption_key.encode()).decrypt(value.encode()).decode()


def aware(value):
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def csrf(raw: str) -> str:
    return hmac.new(get_settings().secret_key.encode(), ("csrf:" + raw).encode(), hashlib.sha256).hexdigest()


def origin_guard(request: Request):
    if request.headers.get("origin", "").rstrip("/") not in get_settings().origins:
        raise HTTPException(403, "Origem da solicitação não permitida.")
    if request.headers.get("x-requested-with") != "IA-Compliance":
        raise HTTPException(403, "Cabeçalho de proteção da aplicação ausente.")


def requires_mfa(db: Session, user: User) -> bool:
    roles = db.scalars(select(Membership.role).where(Membership.user_id == user.id, Membership.active.is_(True))).all()
    return bool(user.totp_encrypted or MFA_ROLES.intersection(roles))


def new_session(db: Session, user: User, response: Response, *, verified=False, old: AuthSession | None = None):
    if old:
        old.revoked = True
    phase = (
        "AUTHENTICATED"
        if verified or not requires_mfa(db, user)
        else ("MFA_REQUIRED" if user.totp_encrypted else "MFA_ENROLLMENT_REQUIRED")
    )
    raw = secrets.token_urlsafe(48)
    session = AuthSession(
        id=digest(raw),
        user_id=user.id,
        phase=phase,
        mfa_verified=verified,
        expires_at=now() + timedelta(hours=get_settings().session_hours)
        if phase == "AUTHENTICATED"
        else now() + timedelta(minutes=10),
    )
    db.add(session)
    db.flush()
    response.set_cookie(
        COOKIE,
        raw,
        httponly=True,
        secure=get_settings().secure_cookies,
        samesite="strict",
        path="/",
        max_age=get_settings().session_hours * 3600 if phase == "AUTHENTICATED" else 600,
    )
    return session, raw


def pending_session(request: Request, db: Session = Depends(get_db), raw_cookie: str | None = Depends(session_cookie)):
    raw = raw_cookie or ""
    if len(raw) != 64:
        raise HTTPException(401, "Sessão ausente ou expirada.")
    session = db.get(AuthSession, digest(raw))
    if (
        not session
        or session.revoked
        or aware(session.expires_at) <= now()
        or aware(session.last_seen) + timedelta(minutes=get_settings().idle_minutes) <= now()
    ):
        raise HTTPException(401, "Sessão ausente ou expirada.")
    user = db.get(User, session.user_id)
    if not user or not user.active:
        raise HTTPException(401, "Sessão indisponível.")
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        origin_guard(request)
        if not hmac.compare_digest(request.headers.get("x-csrf-token", ""), csrf(raw)):
            raise HTTPException(403, "Proteção CSRF inválida. Recarregue sua sessão.")
    if session.phase == "AUTHENTICATED" and requires_mfa(db, user) and not session.mfa_verified:
        session.phase = "MFA_REQUIRED" if user.totp_encrypted else "MFA_ENROLLMENT_REQUIRED"
    session.last_seen = now()
    db.commit()
    return user, session, raw


def current_user(context=Depends(pending_session)) -> User:
    user, session, _ = context
    if session.phase != "AUTHENTICATED":
        raise HTTPException(403, "Conclua a autenticação de dois fatores.")
    return user


def throttle(db: Session, action: str, value: str, maximum: int = 10, minutes: int = 15):
    key = hmac.new(get_settings().secret_key.encode(), (action + ":" + value).encode(), hashlib.sha256).hexdigest()
    record = db.scalar(select(LoginThrottle).where(LoginThrottle.key == key).with_for_update())
    if not record:
        record = LoginThrottle(key=key, attempts=0, reset_at=now() + timedelta(minutes=minutes))
        db.add(record)
    if aware(record.reset_at) <= now():
        record.attempts = 0
        record.reset_at = now() + timedelta(minutes=minutes)
    if record.attempts >= maximum:
        raise HTTPException(429, "Muitas tentativas. Aguarde para tentar novamente.")
    record.attempts += 1
    db.commit()


def verify_password(password: str, user: User | None) -> bool:
    return hasher.verify(password, user.password_hash if user else _dummy) and bool(user and user.active)
