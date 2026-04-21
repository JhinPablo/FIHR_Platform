from fastapi import FastAPI
from pydantic import BaseModel


app = FastAPI(title="MIMIC-IV-ECG Inference Service", version="0.1.0")


class DlRequest(BaseModel):
    patient_id: str
    image_url: str | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "runtime": "mimic-iv-ecg-adapter"}


@app.post("/infer/dl")
def infer_dl(body: DlRequest) -> dict[str, object]:
    score = 0.72 if body.image_url else 0.41
    return {
        "patient_id": body.patient_id,
        "score": score,
        "category": "HIGH" if score >= 0.6 else "MODERATE",
        "finding": "ECG clinical risk",
        "gradcam_url": None,
        "dataset": "MIMIC-IV-ECG Demo",
    }
