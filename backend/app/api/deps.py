from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from app import crud
from app.core import oidc, security
from app.core.config import settings
from app.core.db import SessionLocal, configure_session
from app.models import TokenPayload, User

CF_ACCESS_HEADER = "Cf-Access-Jwt-Assertion"
CF_ACCESS_COOKIE = "CF_Authorization"


reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token",
    auto_error=False,
)


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        configure_session(session)
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
LocalTokenDep = Annotated[str | None, Depends(reusable_oauth2)]


def _extract_cf_token(request: Request) -> str | None:
    """Read the CF Access JWT from the header (preferred) or cookie."""
    header = request.headers.get(CF_ACCESS_HEADER)
    if header:
        return header
    cookie = request.cookies.get(CF_ACCESS_COOKIE)
    if cookie:
        return cookie
    return None


def _get_current_user_local(session: Session, token: str) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = session.get(User, token_data.sub)
    if not user:
        # Token signature is valid but the user record is gone (e.g. DB reset
        # while the browser still holds a stale JWT). Treat as auth failure so
        # the frontend's 401/403 interceptor clears the token and redirects.
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def _get_current_user_oidc(session: Session, token: str) -> User:
    try:
        claims = oidc.verify_oidc_token(token)
    except oidc.OIDCError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"OIDC token invalid: {e}",
        )
    user = crud.get_or_create_user_from_claims(session=session, claims=claims)
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User not active")
    return user


def get_current_user(
    request: Request,
    session: SessionDep,
    local_token: LocalTokenDep,
) -> User:
    mode = settings.AUTH_MODE
    cf_token = _extract_cf_token(request)

    user: User | None = None

    if mode == "local":
        if not local_token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        user = _get_current_user_local(session, local_token)
    elif mode == "oidc":
        if not cf_token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        user = _get_current_user_oidc(session, cf_token)
    else:
        # both: prefer OIDC (CF), fall back to local Bearer
        if cf_token:
            try:
                user = _get_current_user_oidc(session, cf_token)
            except HTTPException:
                pass
        if user is None and local_token:
            user = _get_current_user_local(session, local_token)
        if user is None:
            raise HTTPException(status_code=401, detail="Not authenticated")

    session.info["actor_id"] = user.id
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user
