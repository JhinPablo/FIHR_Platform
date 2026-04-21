from collections.abc import Iterable

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from . import models
from .config import get_settings
from .db import get_db
from .schemas import Principal


def _env_principals() -> list[tuple[str, str, Principal]]:
    settings = get_settings()
    return [
        (
            settings.access_key_admin,
            settings.permission_key_admin,
            Principal(user_id="env-admin", username="admin", display_name="Admin Test User", role="admin"),
        ),
        (
            settings.access_key_medico_1,
            settings.permission_key_medico_1,
            Principal(user_id="env-medico-1", username="medico1", display_name="Medico 1", role="medico"),
        ),
        (
            settings.access_key_medico_2,
            settings.permission_key_medico_2,
            Principal(user_id="env-medico-2", username="medico2", display_name="Medico 2", role="medico"),
        ),
        (
            settings.access_key_patient,
            settings.permission_key_patient,
            Principal(user_id="env-patient", username="paciente", display_name="Patient Test User", role="paciente"),
        ),
    ]


def current_principal(
    request: Request,
    x_access_key: str | None = Header(default=None, alias="X-Access-Key"),
    x_permission_key: str | None = Header(default=None, alias="X-Permission-Key"),
    db: Session = Depends(get_db),
) -> Principal:
    if not x_access_key:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing X-Access-Key")
    if not x_permission_key:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing X-Permission-Key")

    for access, permission, principal in _env_principals():
        if x_access_key == access and x_permission_key == permission:
            db_user = db.query(models.User).filter_by(username=principal.username, active=True).first()
            if db_user:
                principal = Principal(
                    user_id=db_user.id,
                    username=db_user.username,
                    display_name=db_user.display_name,
                    role=db_user.role,  # type: ignore[arg-type]
                    patient_id=db_user.patient_id,
                )
            request.state.principal = principal
            return principal

    row = db.query(models.ApiKey).filter_by(access_key=x_access_key, permission_key=x_permission_key, active=True).first()
    if not row or not row.user or not row.user.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API keys")

    principal = Principal(
        user_id=row.user.id,
        username=row.user.username,
        display_name=row.user.display_name,
        role=row.role,  # type: ignore[arg-type]
        patient_id=row.user.patient_id,
    )
    request.state.principal = principal
    return principal


def require_roles(roles: Iterable[str]):
    def dependency(principal: Principal = Depends(current_principal)) -> Principal:
        if principal.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Role {principal.role} is not allowed")
        return principal

    return dependency


require_admin = require_roles(["admin"])
require_medico = require_roles(["admin", "medico"])
require_reader = require_roles(["admin", "medico", "paciente", "auditor"])
