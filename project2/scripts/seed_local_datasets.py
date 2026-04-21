"""Seed local demo datasets through the public API and MinIO upload endpoint.

Run after docker compose is up:
    python scripts/seed_local_datasets.py
"""

import csv
import json
import mimetypes
import uuid
from pathlib import Path
from urllib import request
from urllib.error import HTTPError


import os

ROOT = Path(__file__).resolve().parents[1]
DATA = Path(os.environ.get("SEED_DATA_DIR", str(ROOT / "datasets" / "local-demo")))
API = os.environ.get("API_BASE_URL", "http://localhost:8000")
HEADERS = {
    "X-Access-Key": "dev-access-medico-1",
    "X-Permission-Key": "dev-permission-medico-1",
}


def post_json(path: str, payload: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        API + path,
        data=body,
        method="POST",
        headers={**HEADERS, "Content-Type": "application/json"},
    )
    try:
        with request.urlopen(req, timeout=30) as res:
            return json.loads(res.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise RuntimeError(f"POST {path} failed: {exc.code} {detail}") from exc


def multipart_upload(path: str, fields: dict[str, str], file_field: str, file_path: Path) -> dict:
    boundary = f"----local-demo-{uuid.uuid4().hex}"
    chunks: list[bytes] = []
    for name, value in fields.items():
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                str(value).encode(),
                b"\r\n",
            ]
        )
    ctype = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    chunks.extend(
        [
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="{file_field}"; filename="{file_path.name}"\r\n'.encode(),
            f"Content-Type: {ctype}\r\n\r\n".encode(),
            file_path.read_bytes(),
            b"\r\n",
            f"--{boundary}--\r\n".encode(),
        ]
    )
    body = b"".join(chunks)
    req = request.Request(
        API + path,
        data=body,
        method="POST",
        headers={**HEADERS, "Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    try:
        with request.urlopen(req, timeout=60) as res:
            return json.loads(res.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise RuntimeError(f"POST {path} failed: {exc.code} {detail}") from exc


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def main() -> None:
    patients = read_csv(DATA / "mimic-iv" / "patients.csv")
    labs = read_csv(DATA / "mimic-iv" / "labs.csv")
    images = read_csv(DATA / "mimic-cxr-jpg" / "metadata.csv")
    patient_ids: dict[str, str] = {}

    for row in patients:
        created = post_json(
            "/fhir/Patient",
            {
                "resourceType": "Patient",
                "name": row["name"],
                "gender": row["gender"],
                "birthDate": row["birth_date"],
                "source_subject_id": row["subject_id"],
                "source_dataset": "MIMIC-IV local-demo",
                "identification_doc": f"local-demo:{row['subject_id']}",
                "medical_summary": row["medical_summary"],
            },
        )
        patient_ids[row["subject_id"]] = created["id"]

    for row in labs:
        post_json(
            "/fhir/Observation",
            {
                "resourceType": "Observation",
                "patient_id": patient_ids[row["subject_id"]],
                "code": row["loinc"],
                "display": row["display"],
                "value": float(row["value"]),
                "unit": row["unit"],
                "source_itemid": row["itemid"],
            },
        )

    for row in images:
        file_path = DATA / "mimic-cxr-jpg" / row["image_path"]
        multipart_upload(
            "/images",
            {
                "patient_id": patient_ids[row["subject_id"]],
                "source_study_id": row["study_id"],
                "source_dicom_id": row["dicom_id"],
                "modality": row["modality"],
                "conclusion": row["conclusion"],
                "conclusion_code": row["conclusion_code"],
            },
            "file",
            file_path,
        )

    print(f"Seeded {len(patients)} patients, {len(labs)} observations and {len(images)} MinIO images.")


if __name__ == "__main__":
    main()

