"""Create local test users and API keys for local or Supabase PostgreSQL.

Run from project2:
    python scripts/create_demo_users.py
"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "backend"))

from app.config import get_settings  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.models import ApiKey, Patient, User  # noqa: E402


def upsert_user(db, username, display_name, role, access_key, permission_key, patient_id=None):
    user = db.query(User).filter_by(username=username).first()
    if not user:
        user = User(username=username, display_name=display_name, role=role, patient_id=patient_id)
        db.add(user)
        db.flush()
    user.display_name = display_name
    user.role = role
    user.patient_id = patient_id

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
        first_real_patient = (
            db.query(Patient)
            .filter(Patient.source_dataset == "MIMIC-IV + MIMIC-CXR-JPG")
            .order_by(Patient.created_at.asc())
            .first()
        )

        upsert_user(db, "admin", "Admin Demo", "admin", settings.access_key_admin, settings.permission_key_admin)
        upsert_user(
            db,
            "medico1",
            "Medico Demo 1",
            "medico",
            settings.access_key_medico_1,
            settings.permission_key_medico_1,
        )
        upsert_user(
            db,
            "medico2",
            "Medico Demo 2",
            "medico",
            settings.access_key_medico_2,
            settings.permission_key_medico_2,
        )
        upsert_user(
            db,
            "paciente",
            "Paciente Demo",
            "paciente",
            settings.access_key_patient,
            settings.permission_key_patient,
            first_real_patient.id if first_real_patient else None,
        )
        db.commit()
        print("Local test users ready:")
        print(f"  admin    {settings.access_key_admin} / {settings.permission_key_admin}")
        print(f"  medico1  {settings.access_key_medico_1} / {settings.permission_key_medico_1}")
        print(f"  medico2  {settings.access_key_medico_2} / {settings.permission_key_medico_2}")
        print(f"  paciente {settings.access_key_patient} / {settings.permission_key_patient}")
        if first_real_patient:
            print(f"  paciente is bound to real MIMIC patient_id={first_real_patient.id}")
        else:
            print("  paciente is not bound yet; run scripts/seed_mimic.py after placing real MIMIC files.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
