import base64
import hashlib

from cryptography.fernet import Fernet

from .config import get_settings


def _fernet() -> Fernet:
    raw = get_settings().data_encryption_key.encode("utf-8")
    if len(raw) == 44:
        return Fernet(raw)
    digest = hashlib.sha256(raw).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_text(value: str | None) -> str | None:
    if value is None:
        return None
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_text(value: str | None) -> str | None:
    if value is None:
        return None
    return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")

