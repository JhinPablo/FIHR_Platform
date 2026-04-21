"""MIMIC-IV-ECG DL inference adapter.

This service keeps the deployment contract ready for a real ECG waveform model.
It accepts a patient/study/image reference, derives a deterministic score from
the available request metadata, and returns a FHIR-platform friendly payload.
Replace `infer_dl` internals with an ONNX/PyTorch model when the trained
artifact is available.
"""
from __future__ import annotations

import hashlib
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel


app = FastAPI(title="MIMIC-IV-ECG DL Inference Service", version="0.4.0")


class DlRequest(BaseModel):
    patient_id: str
    study_id: str | None = None
    image_url: str | None = None
    features: dict[str, Any] | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "runtime": "mimic-iv-ecg-adapter",
        "version": "0.4.0",
    }


@app.post("/infer/dl")
def infer_dl(body: DlRequest) -> dict[str, Any]:
    key = "|".join(
        [
            body.patient_id,
            body.study_id or "",
            body.image_url or "",
            repr(sorted((body.features or {}).items())),
        ]
    )
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    raw = int(digest[:8], 16) / 0xFFFFFFFF
    score = round(0.18 + raw * 0.62, 4)
    category = "HIGH" if score >= 0.65 else "MODERATE" if score >= 0.35 else "LOW"

    return {
        "patient_id": body.patient_id,
        "study_id": body.study_id,
        "score": score,
        "category": category,
        "finding": "MIMIC-IV-ECG waveform metadata scored by ECG adapter",
        "gradcam_url": None,
        "attention_summary": {
            "image_source": "MIMIC-IV-ECG SVG waveform generated from WFDB .hea/.dat",
            "model_runtime": "adapter-pending-trained-artifact",
        },
        "dataset": "MIMIC-IV-ECG Demo",
    }
