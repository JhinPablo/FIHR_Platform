from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel


app = FastAPI(title="MIMIC-IV ML Inference Service", version="0.1.0")


class MlRequest(BaseModel):
    patient_id: str
    features: dict[str, Any] = {}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "runtime": "cpu-placeholder"}


@app.post("/infer/ml")
def infer_ml(body: MlRequest) -> dict[str, Any]:
    numeric_values = [float(v) for v in body.features.values() if isinstance(v, int | float)]
    score = min(0.95, 0.20 + sum(numeric_values[:8]) / 1000) if numeric_values else 0.35
    return {
        "patient_id": body.patient_id,
        "score": round(score, 4),
        "category": "HIGH" if score >= 0.6 else "MODERATE" if score >= 0.3 else "LOW",
        "explanation": {"top_features": list(body.features.keys())[:5], "dataset": "MIMIC-IV"},
    }

