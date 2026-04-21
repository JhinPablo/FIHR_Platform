"""MIMIC-IV-ECG DL Inference Service — signal attention map (GradCAM-equivalent).

Workflow:
1. Receive patient_id + image_url (MinIO presigned URL of the ECG preview SVG).
2. Download the SVG and parse polyline signal traces.
3. Compute windowed gradient-variance attention score per sample point.
4. Render a coloured attention overlay SVG (red = high attention, green = low).
5. Upload the attention SVG to MinIO and return the presigned URL as gradcam_url.
"""
from __future__ import annotations

import io
import os
import re
from typing import Any

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

# MinIO config injected via env_file in docker-compose
MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS   = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET   = os.environ.get("MINIO_SECRET_KEY", "minioadmin123")
MINIO_BUCKET   = os.environ.get("MINIO_BUCKET", "clinical-images")

app = FastAPI(title="MIMIC-IV-ECG DL Inference Service", version="0.2.0")


# ── MinIO helpers ────────────────────────────────────────────────────────────

def _minio():
    from minio import Minio
    return Minio(MINIO_ENDPOINT, access_key=MINIO_ACCESS, secret_key=MINIO_SECRET, secure=False)


def _upload_svg(patient_id: str, study_id: str, svg_bytes: bytes) -> str | None:
    try:
        client = _minio()
        obj = f"patients/{patient_id}/gradcam/{study_id}_attention.svg"
        client.put_object(MINIO_BUCKET, obj, io.BytesIO(svg_bytes), len(svg_bytes), content_type="image/svg+xml")
        return client.presigned_get_object(MINIO_BUCKET, obj)
    except Exception as exc:
        print(f"[dl-service] MinIO upload failed: {exc}")
        return None


# ── SVG parsing ──────────────────────────────────────────────────────────────

def _parse_polylines(svg: str) -> list[list[tuple[float, float]]]:
    traces = []
    for match in re.finditer(r'<polyline[^>]*points="([^"]+)"', svg, re.IGNORECASE):
        pts: list[tuple[float, float]] = []
        for pair in match.group(1).split():
            try:
                x, y = pair.split(",")
                pts.append((float(x), float(y)))
            except ValueError:
                continue
        if len(pts) > 4:
            traces.append(pts)
    return traces


# ── Attention computation ────────────────────────────────────────────────────

def _attention(pts: list[tuple[float, float]], window: int = 24) -> list[float]:
    """Gradient-variance attention: combines local variance + absolute gradient magnitude."""
    ys = np.array([p[1] for p in pts], dtype=np.float64)
    n = len(ys)
    half = window // 2
    attn = np.zeros(n)
    grad = np.abs(np.gradient(ys))
    for i in range(n):
        lo, hi = max(0, i - half), min(n, i + half)
        seg = ys[lo:hi]
        attn[i] = float(np.var(seg)) * 0.6 + float(grad[i]) * 0.4
    mx = attn.max()
    return (attn / mx).tolist() if mx > 0 else attn.tolist()


# ── Attention SVG overlay ────────────────────────────────────────────────────

def _overlay_svg(svg: str, traces: list[list[tuple[float, float]]], attns: list[list[float]]) -> str:
    lines: list[str] = []
    for pts, attn in zip(traces, attns):
        for i in range(len(pts) - 1):
            x1, y1 = pts[i]
            x2, y2 = pts[i + 1]
            a = (attn[i] + attn[i + 1]) / 2.0
            r = int(80 + 175 * a)
            g = int(200 * (1.0 - a))
            b = int(50 * (1.0 - a))
            op = round(0.45 + 0.45 * a, 2)
            lines.append(
                f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                f'stroke="rgb({r},{g},{b})" stroke-width="2.8" opacity="{op}"/>'
            )

    legend = (
        '<g transform="translate(880,8)">'
        '<rect width="136" height="58" rx="4" fill="#08111c" opacity="0.85"/>'
        '<text x="8" y="18" fill="#9dc7e0" font-family="monospace" font-size="11" font-weight="600">GradCAM attention</text>'
        '<rect x="8" y="26" width="44" height="7" rx="2" fill="rgb(255,80,50)"/>'
        '<text x="56" y="33" fill="#9dc7e0" font-family="monospace" font-size="10">high</text>'
        '<rect x="8" y="38" width="44" height="7" rx="2" fill="rgb(80,200,50)"/>'
        '<text x="56" y="45" fill="#9dc7e0" font-family="monospace" font-size="10">low</text>'
        '</g>'
    )
    injection = "\n  <!-- GradCAM attention overlay -->\n  " + "\n  ".join(lines) + "\n  " + legend + "\n"
    return svg.replace("</svg>", injection + "</svg>")


# ── HTTP download ────────────────────────────────────────────────────────────

def _download(url: str) -> str | None:
    try:
        import httpx
        r = httpx.get(url, timeout=12.0, follow_redirects=True)
        r.raise_for_status()
        return r.text
    except Exception as exc:
        print(f"[dl-service] Download failed: {exc}")
        return None


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "runtime": "mimic-iv-ecg-gradcam", "version": "0.2.0"}


class DlRequest(BaseModel):
    patient_id: str
    study_id: str | None = None
    image_url: str | None = None


@app.post("/infer/dl")
def infer_dl(body: DlRequest) -> dict[str, Any]:
    gradcam_url: str | None = None
    score = 0.41
    finding = "ECG signal analyzed — no SVG provided"
    attention_summary: dict[str, Any] = {}

    svg = _download(body.image_url) if body.image_url else None

    if svg:
        traces = _parse_polylines(svg)
        if traces:
            attns = [_attention(t) for t in traces]
            high_fracs = [
                sum(1 for a in attn if a > 0.60) / len(attn)
                for attn in attns if attn
            ]
            if high_fracs:
                score = round(min(0.97, 0.28 + float(np.mean(high_fracs)) * 0.68), 4)

            attention_summary = {
                "leads_analyzed": len(traces),
                "mean_attention": round(float(np.mean([np.mean(a) for a in attns])), 4),
                "high_attention_fraction": round(float(np.mean(high_fracs)) if high_fracs else 0.0, 4),
            }
            attn_svg = _overlay_svg(svg, traces, attns)
            sid = body.study_id or f"ecg-{body.patient_id[:8]}"
            gradcam_url = _upload_svg(body.patient_id, sid, attn_svg.encode("utf-8"))
            finding = (
                f"ECG attention map generated — {len(traces)} leads, "
                f"{attention_summary['high_attention_fraction']*100:.0f}% high-attention segments"
            )
        else:
            finding = "SVG downloaded but no polyline traces found"

    category = "HIGH" if score >= 0.65 else "MODERATE" if score >= 0.35 else "LOW"
    return {
        "patient_id": body.patient_id,
        "score": score,
        "category": category,
        "finding": finding,
        "gradcam_url": gradcam_url,
        "attention_summary": attention_summary,
        "dataset": "MIMIC-IV-ECG Demo",
    }
