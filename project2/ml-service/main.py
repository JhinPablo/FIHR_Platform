"""MIMIC-IV ML Inference Service — tabular risk scoring with ONNX + SHAP.

Self-bootstrapping: trains a calibrated LogisticRegression on synthetic MIMIC-IV-like
lab distributions and exports to ONNX on first startup. Subsequent starts load the
cached model from ./models/.
"""
from __future__ import annotations

import pickle
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

import os as _os
_vercel = _os.environ.get("VERCEL") == "1"
MODELS_DIR = Path("/tmp/ml_models") if _vercel else Path(__file__).parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
ONNX_PATH = MODELS_DIR / "ml_model.onnx"
META_PATH = MODELS_DIR / "ml_model_meta.pkl"

# Common MIMIC-IV lab features (display names mapped to env positions)
FEATURE_NAMES = [
    "creatinine", "bun", "glucose", "sodium",
    "potassium", "hematocrit", "wbc", "bicarbonate",
]
# (mean, std) from MIMIC-IV population reference
_STATS: dict[str, tuple[float, float]] = {
    "creatinine":  (1.2,  1.0),
    "bun":         (20.0, 13.0),
    "glucose":     (118.0, 42.0),
    "sodium":      (138.0, 4.0),
    "potassium":   (4.1,  0.7),
    "hematocrit":  (33.0, 6.5),
    "wbc":         (9.0,  5.0),
    "bicarbonate": (23.0, 4.5),
}
MEANS = np.array([_STATS[f][0] for f in FEATURE_NAMES], dtype=np.float32)
STDS  = np.array([_STATS[f][1] for f in FEATURE_NAMES], dtype=np.float32)

_session = None
_coefs: np.ndarray | None = None
_intercept: float = 0.0


def _bootstrap() -> None:
    global _session, _coefs, _intercept

    try:
        import onnxruntime as rt
    except ImportError:
        print("[ml-service] onnxruntime not available — skipping bootstrap")
        return

    if ONNX_PATH.exists() and META_PATH.exists():
        _session = rt.InferenceSession(str(ONNX_PATH), providers=["CPUExecutionProvider"])
        with open(META_PATH, "rb") as fh:
            meta = pickle.load(fh)
        _coefs = meta["coefs"]
        _intercept = meta["intercept"]
        print(f"[ml-service] Loaded cached ONNX model from {ONNX_PATH}")
        return

    try:
        from sklearn.linear_model import LogisticRegression
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler
        from skl2onnx import convert_sklearn
        from skl2onnx.common.data_types import FloatTensorType
    except ImportError as exc:
        print(f"[ml-service] Missing training deps ({exc}) — running as fallback scorer")
        return

    rng = np.random.default_rng(42)
    n = 4000
    X = (rng.standard_normal((n, len(FEATURE_NAMES))).astype(np.float32) * STDS + MEANS)
    # Label: high risk = elevated creatinine OR low bicarbonate OR high BUN
    y = ((X[:, 0] > 2.0) | (X[:, 7] < 20.0) | (X[:, 1] > 30.0)).astype(int)

    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("lr", LogisticRegression(C=0.5, max_iter=500, random_state=42)),
    ])
    pipe.fit(X, y)

    initial_type = [("float_input", FloatTensorType([None, len(FEATURE_NAMES)]))]
    onnx_model = convert_sklearn(pipe, initial_types=initial_type, target_opset=17)
    ONNX_PATH.write_bytes(onnx_model.SerializeToString())

    lr = pipe.named_steps["lr"]
    sc = pipe.named_steps["scaler"]
    # Coefs in original feature space (unscaled) for linear SHAP
    coefs_orig = lr.coef_[0] / sc.scale_
    with open(META_PATH, "wb") as fh:
        pickle.dump({"coefs": coefs_orig, "intercept": float(lr.intercept_[0])}, fh)

    _session = rt.InferenceSession(str(ONNX_PATH), providers=["CPUExecutionProvider"])
    _coefs = coefs_orig
    _intercept = float(lr.intercept_[0])
    print(f"[ml-service] Trained + exported ONNX model to {ONNX_PATH}")


_bootstrap()

app = FastAPI(title="MIMIC-IV ML Inference Service", version="0.2.0")


class MlRequest(BaseModel):
    patient_id: str
    features: dict[str, Any] = {}


def _extract_features(features: dict[str, Any]) -> np.ndarray:
    vec = []
    for fname in FEATURE_NAMES:
        val = features.get(fname)
        if val is None:
            val = _STATS[fname][0]
        try:
            vec.append(float(val))
        except (TypeError, ValueError):
            vec.append(_STATS[fname][0])
    return np.array(vec, dtype=np.float32)


def _shap_values(x: np.ndarray) -> dict[str, float]:
    """Linear SHAP: contribution_i = coef_i * (x_i - mean_i)."""
    if _coefs is None:
        return {n: 0.0 for n in FEATURE_NAMES}
    contributions = _coefs * (x - MEANS)
    return {name: round(float(contributions[i]), 4) for i, name in enumerate(FEATURE_NAMES)}


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "runtime": "onnx-cpu" if _session else "numpy-fallback",
        "model": ONNX_PATH.name if ONNX_PATH.exists() else "not-trained",
    }


@app.post("/infer/ml")
def infer_ml(body: MlRequest) -> dict[str, Any]:
    x = _extract_features(body.features)
    shap = _shap_values(x)

    if _session:
        inp = x.reshape(1, -1)
        input_name = _session.get_inputs()[0].name
        raw = _session.run(None, {input_name: inp})
        # raw[1] is a list of {class: prob} dicts; raw[0] is the predicted class
        proba_map = raw[1][0] if raw[1] else {}
        score = float(proba_map.get(1, 0.5)) if isinstance(proba_map, dict) else float(np.array(raw[1]).ravel()[-1])
    else:
        x_scaled = (x - MEANS) / STDS
        logit = float(np.dot(_coefs if _coefs is not None else np.zeros(len(FEATURE_NAMES)), x_scaled) + _intercept)
        score = float(1.0 / (1.0 + np.exp(-logit)))

    score = round(min(0.99, max(0.01, score)), 4)
    category = "HIGH" if score >= 0.65 else "MODERATE" if score >= 0.35 else "LOW"
    top = sorted(shap.items(), key=lambda kv: abs(kv[1]), reverse=True)[:5]

    return {
        "patient_id": body.patient_id,
        "score": score,
        "category": category,
        "shap_values": shap,
        "top_features": [{"feature": k, "contribution": v} for k, v in top],
        "model": "onnx-lr" if _session else "numpy-fallback",
        "dataset": "MIMIC-IV FHIR Demo",
    }
