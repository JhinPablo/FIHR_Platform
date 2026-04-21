"""Seed local demo datasets through the public API and MinIO upload endpoint.

Run after docker compose is up:
    python scripts/seed_local_datasets.py
"""

import csv
import json
import mimetypes
import uuid
from pathlib import Path
from urllib import parse, request
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


def get_json(path: str) -> dict:
    req = request.Request(API + path, method="GET", headers=HEADERS)
    with request.urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode("utf-8"))


def bundle_resources(bundle: dict) -> list[dict]:
    return [entry.get("resource", {}) for entry in bundle.get("entry", [])]


def load_existing_patients() -> dict[str, str]:
    existing: dict[str, str] = {}
    offset = 0
    limit = 100
    while True:
        bundle = get_json(f"/fhir/Patient?limit={limit}&offset={offset}")
        resources = bundle_resources(bundle)
        for patient in resources:
            for extension in patient.get("extension", []):
                if extension.get("url") == "urn:uao:mimic-subject-id":
                    source_subject_id = str(extension.get("valueString") or "")
                    if source_subject_id:
                        existing[source_subject_id] = patient["id"]
        if offset + limit >= int(bundle.get("total", 0)):
            break
        offset += limit
    return existing


def load_existing_media(patient_id: str) -> set[str]:
    encoded = parse.quote(patient_id)
    bundle = get_json(f"/fhir/Media?patient_id={encoded}&limit=100&offset=0")
    object_names: set[str] = set()
    for media in bundle_resources(bundle):
        for extension in media.get("extension", []):
            if extension.get("url") == "urn:uao:minio-object" and extension.get("valueString"):
                object_names.add(str(extension["valueString"]))
    return object_names


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
    patient_ids: dict[str, str] = load_existing_patients()
    seed_existing_subjects = os.environ.get("SEED_EXISTING_SUBJECTS", "false").lower() == "true"
    seeded_subjects: set[str] = set()
    created_patients = 0
    created_observations = 0
    uploaded_images = 0

    for row in patients:
        if row["subject_id"] not in patient_ids:
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
            created_patients += 1
            seeded_subjects.add(row["subject_id"])
        elif seed_existing_subjects:
            seeded_subjects.add(row["subject_id"])

    for row in labs:
        if row["subject_id"] not in seeded_subjects:
            continue
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
        created_observations += 1

    for row in images:
        if row["subject_id"] not in seeded_subjects:
            continue
        file_path = DATA / "mimic-cxr-jpg" / row["image_path"]
        patient_id = patient_ids[row["subject_id"]]
        expected_object = f"patients/{patient_id}/source/{file_path.name.replace(' ', '_')}"
        if expected_object in load_existing_media(patient_id):
            continue
        multipart_upload(
            "/images",
            {
                "patient_id": patient_id,
                "source_study_id": row["study_id"],
                "source_dicom_id": row["dicom_id"],
                "modality": row["modality"],
                "conclusion": row["conclusion"],
                "conclusion_code": row["conclusion_code"],
            },
            "file",
            file_path,
        )
        uploaded_images += 1

    print(
        "Seed complete: "
        f"{created_patients} new patients ({len(patient_ids)} mapped), "
        f"{created_observations} observations posted, "
        f"{uploaded_images} MinIO images uploaded from dataset files."
    )


if __name__ == "__main__":
    main()
