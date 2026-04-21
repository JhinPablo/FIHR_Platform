"""Create API-key users for local testing or staging.

This script only creates operators and keys. It does not create patient records
or clinical data. Patient records must come from the authorized MIMIC seed.

Run from project2:
    python scripts/create_test_users.py
"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "backend"))

from app.config import get_settings  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.models import ApiKey, User  # noqa: E402


def upsert_user(db, username, display_name, role, access_key, permission_key):
    user = db.query(User).filter_by(username=username).first()
    if not user:
        user = User(username=username, display_name=display_name, role=role)
        db.add(user)
        db.flush()
    user.display_name = display_name
    user.role = role
    user.active = True

    key = db.query(ApiKey).filter_by(access_key=access_key).first()
    if not key:
        key = ApiKey(user_id=user.id, access_key=access_key, permission_key=permission_key, role=role)
        db.add(key)
    key.user_id = user.id
    key.permission_key = permission_key
    key.role = role
    key.active = True
    return user


def main():
    settings = get_settings()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        upsert_user(db, "admin", "Admin Test User", "admin", settings.access_key_admin, settings.permission_key_admin)
        upsert_user(
            db,
            "medico1",
            "Medico Test User 1",
            "medico",
            settings.access_key_medico_1,
            settings.permission_key_medico_1,
        )
        upsert_user(
            db,
            "medico2",
            "Medico Test User 2",
            "medico",
            settings.access_key_medico_2,
            settings.permission_key_medico_2,
        )
        upsert_user(
            db,
            "paciente",
            "Patient Test User",
            "paciente",
            settings.access_key_patient,
            settings.permission_key_patient,
        )
        db.commit()
        print("Test users ready. Bind patient users to real Patient IDs after MIMIC seed if needed.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
