from datetime import timedelta
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

from fastapi import UploadFile
from minio import Minio

from .config import get_settings


def client() -> Minio:
    settings = get_settings()
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=False,
        region="us-east-1",
    )


def ensure_bucket() -> None:
    settings = get_settings()
    mc = client()
    if not mc.bucket_exists(settings.minio_bucket):
        mc.make_bucket(settings.minio_bucket)


def content_type_for(filename: str, fallback: str | None = None) -> str:
    lower = filename.lower()
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".jpg") or lower.endswith(".jpeg"):
        return "image/jpeg"
    if lower.endswith(".svg"):
        return "image/svg+xml"
    return fallback or "application/octet-stream"


async def put_upload(patient_id: str, upload: UploadFile, kind: str = "source") -> tuple[str, str]:
    settings = get_settings()
    ensure_bucket()
    raw = await upload.read()
    filename = upload.filename or "image.bin"
    safe_name = filename.replace("\\", "_").replace("/", "_").replace(" ", "_")
    object_name = f"patients/{patient_id}/{kind}/{safe_name}"
    ctype = content_type_for(filename, upload.content_type)
    client().put_object(
        settings.minio_bucket,
        object_name,
        BytesIO(raw),
        length=len(raw),
        content_type=ctype,
    )
    return object_name, ctype


def put_file(patient_id: str, path: Path, kind: str = "source", object_name: str | None = None) -> tuple[str, str]:
    settings = get_settings()
    ensure_bucket()
    safe_name = path.name.replace("\\", "_").replace("/", "_").replace(" ", "_")
    target_name = object_name or f"patients/{patient_id}/{kind}/{safe_name}"
    ctype = content_type_for(path.name)
    raw = path.read_bytes()
    client().put_object(
        settings.minio_bucket,
        target_name,
        BytesIO(raw),
        length=len(raw),
        content_type=ctype,
    )
    return target_name, ctype


def presigned_url(object_name: str, expires_seconds: int = 300) -> str:
    settings = get_settings()
    public = urlparse(settings.minio_public_endpoint.rstrip("/"))
    signer = Minio(
        public.netloc,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=public.scheme == "https",
        region="us-east-1",
    )
    return signer.presigned_get_object(
        settings.minio_bucket,
        object_name,
        expires=timedelta(seconds=expires_seconds),
    )
