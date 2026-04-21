/* ================================================================
   Novena Health Systems — Clinical Platform SPA
   Three layouts: Landing (public) · Auth (login) · App (authed)
   ================================================================ */

function cleanApiBase(value) {
  return String(value || "").trim().replace(/^['"]|['"]$/g, "").replace(/\/$/, "");
}

const DEFAULT_API = import.meta.env.PROD ? "/api" : "http://localhost:8000";
const API = cleanApiBase(localStorage.getItem("apiBase")) || cleanApiBase(import.meta.env.VITE_API_URL) || DEFAULT_API;

const state = {
  route: location.hash.replace("#", "") || "/",
  accessKey: localStorage.getItem("accessKey") || "",
  permissionKey: localStorage.getItem("permissionKey") || "",
  principal: null,
  patients: [],
  selectedPatient: null,
  observations: [],
  reports: [],
  media: [],
  allMedia: [],
  audit: [],
  consents: [],
  dataStatus: null,
  lastInference: null,
  message: "",
  loading: false,
};

/* ── Utilities ─────────────────────────────────────────────────── */
function headers(json = true) {
  const base = {
    "X-Access-Key": state.accessKey,
    "X-Permission-Key": state.permissionKey,
  };
  return json ? { ...base, "Content-Type": "application/json" } : base;
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers(options.json !== false), ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(
    typeof data.detail === "string" ? data.detail :
    Array.isArray(data.detail) ? data.detail.map(e => e.msg || JSON.stringify(e)).join("; ") :
    `HTTP ${res.status}`
  );
  return data;
}

function resourceEntries(bundle) {
  return (bundle.entry || []).map((e) => e.resource);
}

function patientName(p) {
  return p?.name?.[0]?.text || p?.name?.[0]?.family || "Paciente";
}

function mediaObjectName(m) {
  return m?.extension?.find?.((e) => String(e.url || "").includes("minio-object"))?.valueString || "";
}

function mediaStudyId(m) {
  const objectName = mediaObjectName(m);
  const ecgMatch = objectName.match(/mimic-iv-ecg-demo\/([^/]+)\/preview\.svg$/);
  const cxrMatch = objectName.match(/mimic-cxr-jpg\/([^/]+)\//);
  const extensionStudy = m?.extension?.find?.((e) => String(e.url || "").includes("mimic-study"))?.valueString;
  return ecgMatch?.[1] || cxrMatch?.[1] || extensionStudy || m?.identifier?.[0]?.value || m?.id?.slice(0, 8) || "unknown";
}

function imagingDescription(m) {
  const objectName = mediaObjectName(m);
  const studyId = mediaStudyId(m);
  const base = objectName.replace(/preview\.svg$/, "");
  return {
    studyId,
    objectName,
    preview: objectName || `frontend/public/ecg-previews/${studyId}.svg`,
    staticPreview: `/ecg-previews/${studyId}.svg`,
    hea: base ? `${base}${studyId}.hea` : `patients/{patient_id}/mimic-iv-ecg-demo/${studyId}/${studyId}.hea`,
    dat: base ? `${base}${studyId}.dat` : `patients/{patient_id}/mimic-iv-ecg-demo/${studyId}/${studyId}.dat`,
  };
}

function toast(msg, dur = 3200) {
  state.message = msg;
  render();
  setTimeout(() => { state.message = ""; render(); }, dur);
}

/* ── Navigation ─────────────────────────────────────────────────── */
window.go = (route) => {
  state.route = route;
  location.hash = route;
  render();
};

/* ── Auth actions ───────────────────────────────────────────────── */
window.login = async () => {
  state.accessKey = document.querySelector("#accessKey").value.trim();
  state.permissionKey = document.querySelector("#permissionKey").value.trim();
  if (!state.accessKey || !state.permissionKey) return alert("Ingresa ambas llaves.");
  try {
    const data = await api("/auth/validate-keys", { method: "POST" });
    state.principal = data.principal;
    localStorage.setItem("accessKey", state.accessKey);
    localStorage.setItem("permissionKey", state.permissionKey);
    await loadDataStatus(false);
    await loadPatients(false);
    if (!localStorage.getItem("habeasDataAccepted")) {
      go("/habeas-data");
    } else {
      go("/dashboard");
    }
  } catch (err) {
    alert("Acceso denegado: " + err.message);
  }
};

window.logout = () => {
  state.principal = null;
  state.accessKey = "";
  state.permissionKey = "";
  localStorage.removeItem("accessKey");
  localStorage.removeItem("permissionKey");
  go("/");
};

window.acceptHabeasData = async () => {
  try {
    const patientId = state.principal?.patient_id;
    if (patientId) {
      await api("/consents", {
        method: "POST",
        body: JSON.stringify({ patient_id: patientId, scope: "HABEAS_DATA_LEY1581", granted: true }),
      });
    }
    localStorage.setItem("habeasDataAccepted", "1");
    go("/dashboard");
  } catch (err) {
    alert("Error al registrar consentimiento: " + err.message);
  }
};

window.declineHabeasData = () => {
  logout();
};

window.saveApiBase = () => {
  const value = document.querySelector("#apiBase")?.value.trim();
  if (value) {
    localStorage.setItem("apiBase", value.replace(/\/$/, ""));
  } else {
    localStorage.removeItem("apiBase");
  }
  location.reload();
};

/* ── Data loaders ───────────────────────────────────────────────── */
async function loadPatients(shouldRender = true) {
  const data = await api("/fhir/Patient?limit=50&offset=0");
  state.patients = resourceEntries(data);
  if (shouldRender) render();
}
window.loadPatients = loadPatients;

async function loadDataStatus(shouldRender = true) {
  state.dataStatus = await api("/data/status");
  if (shouldRender) render();
}
window.loadDataStatus = loadDataStatus;

async function loadAllMedia(shouldRender = true) {
  state.allMedia = resourceEntries(await api("/fhir/Media?limit=100&offset=0"));
  state._allMediaLoaded = true;
  if (shouldRender) render();
}
window.loadAllMedia = loadAllMedia;

async function refreshPatientData(patientId) {
  state.selectedPatient = await api(`/fhir/Patient/${patientId}`);
  state.observations = resourceEntries(await api(`/fhir/Observation?patient_id=${patientId}&limit=80&offset=0`));
  state.reports = resourceEntries(await api(`/fhir/DiagnosticReport?patient_id=${patientId}&limit=20&offset=0`));
  state.media = resourceEntries(await api(`/fhir/Media?patient_id=${patientId}&limit=20&offset=0`));
  if (!state.media.length && !state._allMediaLoaded) {
    await loadAllMedia(false);
  }
  state.consents = resourceEntries(await api(`/consents?patient_id=${patientId}&limit=20&offset=0`));
}

window.openPatient = async (id) => {
  state._imagingLoadedFor = null;
  await refreshPatientData(id);
  go("/patient");
};

window.runInference = async (modelType) => {
  if (!state.selectedPatient) return alert("Selecciona un paciente primero.");
  const data = await api("/infer", {
    method: "POST",
    body: JSON.stringify({
      patient_id: state.selectedPatient.id,
      model_type: modelType,
      features: { observations: state.observations.length, media: state.media.length },
      image_url: state.media[0]?.content?.url || null,
    }),
  });
  state.lastInference = data;
  toast(`Inferencia ${modelType} completada`);
  go("/report");
};

window.signReport = async () => {
  const note = document.querySelector("#clinicalNote")?.value || "";
  const reportId = state.lastInference?.risk_report?.id;
  if (!reportId) return alert("No hay RiskReport para firmar.");
  if (note.length < 30) return alert(`La nota clínica debe tener mínimo 30 caracteres (actual: ${note.length}).`);
  try {
    state.lastInference.risk_report = await api(`/risk-reports/${reportId}/sign`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "ACCEPT", clinical_note: note }),
    });
    toast("RiskReport firmado correctamente ✓");
    render();
  } catch (err) {
    alert(err.message);
  }
};

window.loadAudit = async () => {
  state.audit = resourceEntries(await api("/audit-log?limit=80&offset=0"));
  render();
};

window.uploadImage = async () => {
  if (!state.selectedPatient) return alert("Selecciona un paciente primero.");
  const file = document.querySelector("#imageFile").files[0];
  if (!file) return alert("Selecciona una imagen (SVG, JPG o PNG).");
  const form = new FormData();
  form.append("patient_id", state.selectedPatient.id);
  form.append("source_study_id", document.querySelector("#studyId").value || `MIMIC-MANUAL-${Date.now()}`);
  form.append("source_dicom_id", document.querySelector("#dicomId").value || `MIMIC-MANUAL-DICOM-${Date.now()}`);
  form.append("modality", document.querySelector("#modality").value || "CR");
  form.append("conclusion", document.querySelector("#conclusion").value || "Authorized MIMIC-CXR-JPG image pending review.");
  form.append("conclusion_code", "404684003");
  form.append("file", file);
  const res = await fetch(`${API}/images`, { method: "POST", headers: headers(false), body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return alert(data.detail || `HTTP ${res.status}`);
  await refreshPatientData(state.selectedPatient.id);
  toast("Imagen almacenada en MinIO y enlazada al informe ✓");
  go("/imaging");
};

/* ================================================================
   LANDING PAGE  (public, no sidebar/topbar)
   ================================================================ */
function renderLanding() {
  return `
<div class="landing-page">
  <!-- Fixed nav -->
  <nav class="landing-nav">
    <div class="brand"><span class="dot"></span>Novena Health Systems</div>
    <div class="nav-links">
      <a href="#">Platform</a>
      <a href="#">FHIR</a>
      <a href="#">Security</a>
      <a href="#">Interoperability</a>
    </div>
    <div class="nav-cta">
      <button class="btn ghost small" onclick="go('/auth')" style="color:#fff;border-color:rgba(255,255,255,.3)">Sign in</button>
      <button class="btn primary small" onclick="go('/auth')">Request access ➜</button>
    </div>
  </nav>

  <!-- Hero -->
  <section class="landing-hero">
    <div class="landing-hero-copy">
      <span class="eyebrow">Clinical infrastructure · HL7 FHIR R4</span>
      <h1>Interoperable<br/>clinical records,<br/>signed &amp; traceable.</h1>
      <p>A regulated platform for patient records, medical imaging, AI-assisted risk assessment and auditable clinical reports — designed for hospital workflow.</p>
      <div class="hero-cta">
        <button class="btn primary" onclick="go('/auth')">Open clinical console</button>
        <button class="btn ghost" style="color:#fff;border-color:rgba(255,255,255,.3)">Platform overview ➜</button>
      </div>
      <div class="hero-badges">
        <span class="hb">FHIR R4</span>
        <span class="hb">RBAC</span>
        <span class="hb">Audit-trail</span>
        <span class="hb">Signed reports</span>
        <span class="hb">Habeas Data</span>
      </div>
    </div>
    <div class="landing-hero-mock">
      <div class="mock-card">
        <div class="mc-label">Patient · P-00421 · Urgent review</div>
        <div class="mc-row">
          <div class="mc-stat"><div class="k">RISK</div><div class="v">0.87</div></div>
          <div class="mc-stat"><div class="k">MODEL</div><div class="v" style="font-size:18px">dl-resnet</div></div>
          <div class="mc-stat"><div class="k">SIG.</div><div class="v" style="font-size:18px">pending</div></div>
        </div>
      </div>
      <div class="mock-terminal">
        <div class="cmd">$ fhir.get Patient?_id=421</div>
        <div>&gt; 200 OK · 1 resource</div>
        <div>&gt; observations:12 · media:3 · consent:active</div>
        <div class="cmd" style="margin-top:8px">$ infer.run --model dl.resnet.v3</div>
        <div>&gt; status: running · eta 00:01:42</div>
        <div>&gt; queued by dr.alvarez · trace a8f2..</div>
        <div class="ok-line">&gt; signature required before close ⓘ</div>
      </div>
      <div class="mock-card">
        <div class="mc-label">Operational flow</div>
        <div style="display:flex;gap:6px;font-size:11px;color:rgba(255,255,255,.55);font-family:var(--mono)">
          ${["Upload","Observe","Infer","Review","Sign","Audit"].map((s,i,a) => `<span>${s}</span>${i<a.length-1?'<span style="opacity:.3">→</span>':''}`).join("")}
        </div>
      </div>
    </div>
  </section>

  <!-- Standards strip -->
  <div class="landing-standards">
    <span>HL7 FHIR R4</span><span>ISO 27001-aligned</span><span>Habeas Data · Ley 1581</span>
    <span>Signed reports</span><span>Append-only audit</span><span>RBAC · scoped keys</span>
  </div>

  <!-- Features -->
  <section class="landing-features">
    <h2>One platform, every clinical need.</h2>
    <p class="sub">From patient intake through risk inference and signed report — fully auditable and FHIR-native.</p>
    <div class="features-grid">
      ${[
        ["01 / PATIENT RECORDS","Unified clinical record","FHIR-coded observations, history, consent, linked studies."],
        ["02 / IMAGING","Lightweight PACS","Modality-aware viewer with overlay explanations."],
        ["03 / AI INFERENCE","Orchestrated models","ML, DL and multimodal with calibrated probabilities."],
        ["04 / RISK REPORTS","Signed & exportable","Document-grade output with physician decision."],
        ["05 / AUDIT","Append-only log","Every access, change and signature — traceable."],
        ["06 / CONSENT","Habeas data","Versioned consent with persistence and review."],
      ].map(([n,t,d]) => `
        <div class="feature-card">
          <span class="fc-num">${n}</span>
          <h3>${t}</h3>
          <p>${d}</p>
        </div>`).join("")}
    </div>
  </section>

  <!-- Workflow -->
  <section class="landing-workflow">
    <h2>Intake to audit — seven steps.</h2>
    <div class="workflow-steps">
      ${["Intake","Observation","Image upload","AI analysis","Review","Signed report","Audit"].map((s,i) =>
        `<div class="ws"><b>${String(i+1).padStart(2,"0")}</b><span>${s}</span></div>`).join("")}
    </div>
  </section>

  <!-- FHIR + Security -->
  <section class="landing-fhir">
    <div class="fhir-block">
      <h3>FHIR R4 resources</h3>
      <div class="fhir-pills">
        ${["Patient","Observation","Media","DiagnosticReport","RiskAssessment","Consent","AuditEvent","Practitioner"].map(r => `<span>${r}</span>`).join("")}
      </div>
      <p style="margin-top:14px;color:var(--muted);font-size:13px">Native import / export, REST & bulk data.</p>
    </div>
    <div class="sec-block">
      <h3>Security &amp; governance</h3>
      <div class="sec-list">
        ${["API keys & scopes","Role-based access","At-rest encryption","Critical alerts","Consent persistence","Append-only audit"].map(x => `<span>${x}</span>`).join("")}
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="landing-footer">
    <span>© Novena Health Systems · 2026 — FHIR R4 Clinical Platform</span>
    <div>
      <a href="#">Privacy</a><a href="#">Terms</a><a href="#">Habeas Data</a>
      <a href="#" onclick="go('/auth')">Sign in</a>
    </div>
  </footer>
</div>`;
}

function viewDashboardReal() {
  const counts = state.dataStatus?.counts || {};
  const total = counts.patients ?? state.patients.length;
  const mediaObjects = counts.media_with_minio_objects ?? counts.media ?? state.media.length;
  const observations = counts.observations ?? 0;
  const reports = counts.diagnostic_reports ?? 0;
  const bucket = state.dataStatus?.storage?.image_bucket || "clinical-images";
  const database = state.dataStatus?.storage?.database || "Supabase PostgreSQL";
  const readyLabel = state.dataStatus?.ready ? "MIMIC datasets imported" : "run seed_mimic.py";
  const readyMark = state.dataStatus?.ready ? "OK" : "PENDING";

  return `
<span class="section-sub">AREA 02 - Operational dashboard</span>
<div class="section-title">Clinical command surface</div>

<div class="stats-row">
  <div class="stat">
    <div class="k">Active patients</div>
    <div class="v">${total || "-"}</div>
    <div class="trend">${total ? "loaded from Supabase/FHIR" : "MIMIC import pending"}</div>
  </div>
  <div class="stat">
    <div class="k">ECG media in MinIO</div>
    <div class="v">${mediaObjects || "-"}</div>
    <div class="trend">${bucket}</div>
  </div>
  <div class="stat">
    <div class="k">Observations</div>
    <div class="v">${observations || "-"}</div>
    <div class="trend">MIMIC-IV labevents</div>
  </div>
  <div class="stat">
    <div class="k">Diagnostic reports</div>
    <div class="v">${reports || "-"}</div>
    <div class="trend">linked to ECG media</div>
  </div>
</div>

<div class="two-col">
  <div class="worklist">
    <h3>Data pipeline status</h3>
    ${[
      "OK FHIR gateway - Patient, Observation, Media",
      `OK MinIO bucket - ${bucket}`,
      `OK ${database} - normalized clinical tables`,
      "OK ML service - MIMIC-IV FHIR adapter",
      "OK DL service - MIMIC-IV-ECG adapter",
      `${readyMark} Supabase/MinIO data - ${readyLabel}`,
    ].map(x =>
      `<p><span class="status-dot" style="background:${x.startsWith("PENDING") ? "#d97706" : "#16a34a"}"></span>${x}</p>`).join("")}
  </div>
  <div class="terminal">
$ data.status<br>
&gt; dataset: ${state.dataStatus?.dataset || "MIMIC-IV FHIR + MIMIC-IV-ECG Demo"}<br>
&gt; patients: ${total || 0} - observations: ${observations || 0}<br>
&gt; minio_objects: ${mediaObjects || 0} - reports: ${reports || 0}<br>
$ fhir.get Patient?_count=50<br>
&gt; ${state.patients.length} resources loaded for current role<br>
$ minio.bucket ${bucket}<br>
&gt; signed URLs refreshed by backend
  </div>
</div>`;
}

function viewImagingReal() {
  const displayMedia = state.media.length ? state.media : state.allMedia;
  const showingFallback = !!state.selectedPatient && !state.media.length && state.allMedia.length;
  const imgs = displayMedia.length
    ? displayMedia.map(m => {
      const meta = imagingDescription(m);
      const contentType = m.content?.contentType || "image/svg+xml";
      const url = m.content?.url || meta.staticPreview;
      const isImage = contentType.startsWith("image/") || !contentType;
      const errSrc = meta.staticPreview;
      return `
      <figure>
        ${url && isImage
          ? `<img src="${url}" alt="MIMIC-IV-ECG waveform from MinIO" onerror="this.onerror=null;this.src='${errSrc}'">`
          : `<div style="height:220px;display:flex;align-items:center;justify-content:center;background:#040a12;color:#7eaace;font-family:var(--mono);font-size:12px;border-radius:6px">
              ${contentType || "ECG"} - MinIO
            </div>`}
        <figcaption>
          <strong>${m.modality?.coding?.[0]?.code || "ECG"} - study ${meta.studyId}</strong>
          ${url ? `<a href="${url}" target="_blank" style="color:#7eaace;margin-left:8px">Open SVG</a>` : ""}
          <div class="wfdb-meta">
            <span>Preview SVG: waveform render stored in MinIO and mirrored as a static frontend asset.</span>
            <code>${meta.preview}</code>
            <span>HEA: WFDB header with sampling rate, leads, gain and signal metadata.</span>
            <code>${meta.hea}</code>
            <span>DAT: binary waveform signal used to generate this SVG preview.</span>
            <code>${meta.dat}</code>
          </div>
        </figcaption>
      </figure>`;
    }).join("")
    : `<div style="display:flex;align-items:center;justify-content:center;height:280px;color:#7eaace;font-family:var(--mono);font-size:12px">
        Select a patient with ECG media or refresh storage status.
      </div>`;

  return `
<div class="page-head">
  <div>
    <span class="section-sub">AREA 05 - Imaging</span>
    <div class="section-title">MIMIC-IV-ECG media from MinIO</div>
  </div>
  ${state.selectedPatient ? `<span style="font-family:var(--mono);font-size:12px;color:var(--muted)">${patientName(state.selectedPatient)}</span>` : ""}
</div>

<div class="two-col">
  <div>
    ${showingFallback ? `<div class="disclaimer" style="margin-bottom:12px">
      ${patientName(state.selectedPatient)} does not have ECG media linked in the current subset. Showing available ECG studies from MinIO.
    </div>` : ""}
    <div class="viewer">${imgs}</div>
  </div>
  <div class="panel">
    <h3>Storage flow</h3>
    <p style="color:var(--muted);font-size:13px;line-height:1.6">
      MIMIC-IV-ECG WFDB records are rendered as SVG previews. The SVG, .hea
      header and .dat waveform signal are stored in MinIO bucket
      <span class="mono-cell">${state.dataStatus?.storage?.image_bucket || "clinical-images"}</span>,
      while Supabase stores normalized <span class="mono-cell">imaging_studies</span> and
      <span class="mono-cell">diagnostic_reports</span> rows.
    </p>
    <div class="worklist" style="margin-top:14px">
      <p><span class="status-dot"></span>DB media rows: ${state.dataStatus?.counts?.media || 0}</p>
      <p><span class="status-dot"></span>MinIO objects indexed: ${state.dataStatus?.counts?.media_with_minio_objects || 0}</p>
      <p><span class="status-dot"></span>DiagnosticReport rows: ${state.dataStatus?.counts?.diagnostic_reports || 0}</p>
      <p><span class="status-dot"></span>Loaded for selected patient: ${state.media.length}</p>
      <p><span class="status-dot"></span>Loaded ECG studies available: ${displayMedia.length}</p>
    </div>
    <button class="btn" onclick="Promise.all([loadDataStatus(false), loadAllMedia(false)]).then(render)" style="width:100%;justify-content:center;margin-top:12px">
      Refresh storage status
    </button>
  </div>
</div>`;
}
/* ================================================================
   AUTH PAGE  (split dark/light, no sidebar)
   ================================================================ */
function renderHabeasData() {
  return `
<div class="auth-page">
  <div class="auth-dark">
    <div class="ad-brand"><span class="dot"></span>Novena Health Systems</div>
    <h2>Habeas Data</h2>
    <p style="color:rgba(255,255,255,.65);font-size:13px;line-height:1.7">
      Ley 1581 de 2012 · Decreto 1377 de 2013<br/>
      Protección de Datos Personales — Colombia
    </p>
    <div class="auth-security" style="margin-top:24px">
      <div>Datos almacenados con cifrado AES-256</div>
      <div>Acceso restringido por rol y llave API</div>
      <div>Audit trail persistido en base de datos</div>
      <div>Revocable en cualquier momento</div>
    </div>
  </div>

  <div class="auth-form-panel" style="overflow-y:auto;max-height:100vh;padding:40px 48px">
    <span class="af-sub">ÁREA 01 · CONSENTIMIENTO INFORMADO</span>
    <h2 style="margin-bottom:20px">Autorización de tratamiento de datos</h2>

    <p style="color:var(--muted);font-size:13.5px;line-height:1.75;margin-bottom:16px">
      De conformidad con la <strong style="color:var(--text)">Ley 1581 de 2012</strong> y el
      <strong style="color:var(--text)">Decreto 1377 de 2013</strong>, Novena Health Systems solicita
      su autorización para recolectar, almacenar y tratar los datos personales y clínicos ingresados
      en esta plataforma con los siguientes fines:
    </p>

    <ul style="color:var(--muted);font-size:13px;line-height:2;padding-left:20px;margin-bottom:20px">
      <li>Gestión de historia clínica electrónica (HCE).</li>
      <li>Generación de reportes de riesgo asistidos por IA para apoyo diagnóstico.</li>
      <li>Interoperabilidad con sistemas FHIR R4 autorizados.</li>
      <li>Trazabilidad y auditoría de accesos para cumplimiento regulatorio.</li>
    </ul>

    <p style="color:var(--muted);font-size:13px;line-height:1.7;margin-bottom:24px">
      Los datos <strong style="color:var(--text)">no serán compartidos con terceros</strong> sin
      autorización expresa. Usted puede ejercer sus derechos de acceso, rectificación, supresión,
      portabilidad y oposición contactando al responsable del tratamiento. Esta autorización queda
      registrada en el registro de auditoría de la plataforma con fecha, hora y rol del autorizante.
    </p>

    <div style="background:rgba(88,166,255,.06);border:1px solid rgba(88,166,255,.2);border-radius:8px;padding:16px;margin-bottom:28px;font-size:13px;color:var(--muted)">
      <strong style="color:var(--blue)">Responsable del tratamiento:</strong> Novena Health Systems · UAO<br/>
      <strong style="color:var(--blue)">Finalidad:</strong> Plataforma clínica FHIR R4 — Corte 2, Salud Digital<br/>
      <strong style="color:var(--blue)">Base legal:</strong> Ley 1581/2012, Decreto 1377/2013<br/>
      <strong style="color:var(--blue)">Conservación:</strong> Durante la vigencia del registro clínico activo
    </div>

    <div style="display:flex;gap:12px;flex-direction:column">
      <button class="btn primary" onclick="acceptHabeasData()" style="width:100%;justify-content:center;font-size:14px;padding:14px">
        Acepto el tratamiento de mis datos personales
      </button>
      <button class="btn ghost" onclick="declineHabeasData()" style="width:100%;justify-content:center;font-size:13px;color:var(--muted)">
        No acepto — cerrar sesión
      </button>
    </div>
  </div>
</div>`;
}

function renderAuth() {
  return `
<div class="auth-page">
  <!-- Left dark panel -->
  <div class="auth-dark">
    <div class="ad-brand">
      <span class="dot"></span>Novena Health Systems
    </div>
    <h2>Secure clinical access</h2>
    <p>Access is restricted to authorized personnel. All sessions are logged and attributable to a verified practitioner identity.</p>
    <div class="auth-security">
      <div>Session timeout · 15 min inactivity</div>
      <div>Dual-key authentication · required</div>
      <div>All actions logged to audit trail</div>
      <div>At-rest encryption · AES-256</div>
    </div>
    <div style="margin-top:auto;padding-top:40px">
      <button class="btn ghost" onclick="go('/')" style="color:rgba(255,255,255,.55);border-color:rgba(255,255,255,.2);font-size:12px">← Back to overview</button>
    </div>
  </div>

  <!-- Right form panel -->
  <div class="auth-form-panel">
    <span class="af-sub">AREA 01 · ACCESS CONTROL</span>
    <h2>Practitioner access</h2>

    <label for="accessKey">X-Access-Key</label>
    <input id="accessKey" type="text" placeholder="Paste assigned access key"
      value="${state.accessKey}" autocomplete="off" spellcheck="false">

    <label for="permissionKey">X-Permission-Key</label>
    <input id="permissionKey" type="password" placeholder="Paste assigned permission key"
      value="${state.permissionKey}" autocomplete="off">

    <label for="apiBase">Backend API URL</label>
    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:12px">
      <input id="apiBase" type="text" value="${API}" autocomplete="off" spellcheck="false">
      <button class="btn ghost" onclick="saveApiBase()" style="padding:0 12px">Save</button>
    </div>

    <button class="btn primary" onclick="login()" style="width:100%;justify-content:center;margin-top:4px">
      Sign in to clinical console
    </button>

    <div class="auth-access">
      <div class="ad-title">Production access</div>
      <p style="margin:0;color:var(--muted);font-size:13px;line-height:1.5">
        Use the API keys assigned by the administrator. Keys are validated by the backend
        and every access is written to AuditEvent.
      </p>
    </div>
  </div>
</div>`;
}

/* ================================================================
   APP SHELL  (authenticated: sidebar + topbar + content)
   ================================================================ */
function renderApp(content) {
  const p = state.principal;
  const role = p?.role || "—";
  const name = p?.display_name || p?.username || "Usuario";

  const navItems = [
    { icon: "⌂", label: "Dashboard",    route: "/dashboard" },
    { icon: "👥", label: "Patients",     route: "/patients"  },
    { icon: "📋", label: "Record",       route: "/patient"   },
    { icon: "🩻", label: "Imaging",      route: "/imaging"   },
    { icon: "✦",  label: "AI Inference", route: "/ai"        },
    { icon: "📄", label: "Risk Report",  route: "/report"    },
    { icon: "📜", label: "Audit",        route: "/audit"     },
  ];

  const navHTML = navItems.map(item => `
    <div class="sb-item${state.route === item.route ? " active" : ""}" onclick="go('${item.route}')">
      <span class="si">${item.icon}</span><span>${item.label}</span>
    </div>`).join("");

  const breadcrumb = navItems.find(i => i.route === state.route)?.label || "Dashboard";

  const criticalCount = state.patients.filter(p =>
    p.extension?.some(e => e.url?.includes("risk") && (e.valueDecimal || 0) > 0.8)
  ).length;

  return `
<div class="app-shell">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sb-brand">
      <span class="dot"></span>
      <div><div>Novena</div><small>Health · FHIR R4</small></div>
    </div>
    <nav>
      <div class="sb-group">Main</div>
      ${navHTML}
      <div class="sb-group">Account</div>
      <div class="sb-item" onclick="logout()"><span class="si">⎋</span><span>Sign out</span></div>
    </nav>
    <div class="sb-footer">
      <div class="user-info">${role.toUpperCase()}</div>
      <div class="user-role">${name}</div>
    </div>
  </aside>

  <!-- Main area -->
  <div class="app-main">
    <header class="app-topbar">
      <span class="breadcrumb">${breadcrumb}</span>
      <span class="spacer"></span>
      <span class="role-badge">${role.toUpperCase()}</span>
      <div class="icon-btn" title="Notifications">🔔</div>
      <div class="icon-btn" onclick="logout()" title="Sign out">⎋</div>
    </header>

    ${criticalCount > 0 ? `
    <div class="alert-banner">
      <span class="dot-crit"></span>
      <strong>${criticalCount} critical patient${criticalCount > 1 ? "s" : ""} require attention</strong>
      <span class="spacer"></span>
      <button class="btn small" onclick="go('/patients')">Review queue ➜</button>
    </div>` : ""}

    <div class="app-content">
      ${content}
      ${state.message ? `<div class="toast">${state.message}</div>` : ""}
    </div>
  </div>
</div>`;
}

/* ================================================================
   VIEW — DASHBOARD
   ================================================================ */
function viewDashboard() {
  const counts = state.dataStatus?.counts || {};
  const total = counts.patients ?? state.patients.length;
  const withMedia = counts.media_with_minio_objects ?? counts.media ?? state.media.length;
  const observations = counts.observations ?? 0;
  const reports = counts.diagnostic_reports ?? 0;
  const lastRole = state.principal?.role || "—";

  return `
<span class="section-sub">AREA 02 · Operational dashboard</span>
<div class="section-title">Clinical command surface</div>

<div class="stats-row">
  <div class="stat">
    <div class="k">Active patients</div>
    <div class="v">${total || "—"}</div>
    <div class="trend">${total ? "loaded from Supabase/FHIR" : "MIMIC import pending"}</div>
  </div>
  <div class="stat">
    <div class="k">CXR media in MinIO</div>
    <div class="v">${withMedia || "—"}</div>
    <div class="trend">${state.dataStatus?.storage?.image_bucket || "clinical-images"}</div>
  </div>
  <div class="stat">
    <div class="k">Observations</div>
    <div class="v">${observations || "â€”"}</div>
    <div class="trend">MIMIC-IV labevents</div>
  </div>
  <div class="stat">
    <div class="k">Pending inferences</div>
    <div class="v">${state.lastInference ? "1" : "—"}</div>
    <div class="trend${state.lastInference ? " crit" : ""}">
      ${state.lastInference ? "needs signature" : "no active job"}
    </div>
  </div>
</div>

<div class="two-col">
  <div class="worklist">
    <h3>System status</h3>
    ${["✓ FHIR gateway — Patient, Observation, Media",
       "✓ MinIO bucket — clinical-images",
       "✓ Audit writer — AuditEvent active",
       "✓ ML service — MIMIC-IV FHIR adapter",
       "✓ DL service — MIMIC-CXR-JPG adapter",
       "⚙  Supabase PostgreSQL — connect DATABASE_URL"].map(x =>
      `<p><span class="status-dot" style="background:${x.startsWith("⚙") ? "#d97706" : "#16a34a"}"></span>${x}</p>`).join("")}
  </div>
  <div class="terminal">
$ fhir.get Patient?_count=50<br>
&gt; ${state.patients.length} resources loaded<br>
$ minio.bucket clinical-images<br>
&gt; ${state.media.length} objects indexed<br>
$ risk.sign --requires-note &gt;30 chars<br>
&gt; pending: ${state.lastInference ? "yes" : "none"}<br>
$ audit.log --tail 10<br>
&gt; events streaming...
  </div>
</div>`;
}

/* ================================================================
   VIEW — PATIENTS
   ================================================================ */
function viewPatients() {
  const rows = state.patients.length
    ? state.patients.map(p => `
      <tr>
        <td class="mono-cell">${p.id.slice(0, 8)}…</td>
        <td>${patientName(p)}</td>
        <td>${p.gender || "—"}</td>
        <td class="mono-cell">${p.extension?.find(e => e.url?.includes("source-subject"))?.valueString || "—"}</td>
        <td>
          <span class="badge soft"><span class="d"></span>ACTIVE</span>
        </td>
        <td><button class="btn small" onclick="openPatient('${p.id}')">Open ➜</button></td>
      </tr>`).join("")
    : `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--muted)">
        No patients loaded. Run seed script or <button class="btn small" onclick="loadPatients()">refresh</button>.
      </td></tr>`;

  return `
<div class="page-head">
  <div>
    <span class="section-sub">AREA 03 · Patient list</span>
    <div class="section-title">Patients</div>
  </div>
  <div class="actions">
    <button class="btn" onclick="loadPatients()">⟳ Refresh</button>
  </div>
</div>

<div class="table-shell">
  <table>
    <thead>
      <tr>
        <th>FHIR ID</th><th>Name</th><th>Sex</th><th>MIMIC subject_id</th><th>Status</th><th></th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>

<div class="pagination">
  <span class="mono">Showing ${state.patients.length} patients · page 1</span>
  <button class="btn small ghost">◀ Prev</button>
  <button class="btn small">Next ▶</button>
</div>`;
}

/* ================================================================
   VIEW — PATIENT DETAIL
   ================================================================ */
function viewPatient() {
  const p = state.selectedPatient;
  if (!p) return `
    <div class="panel" style="max-width:480px">
      <h3>No patient selected</h3>
      <p style="color:var(--muted);margin-bottom:16px">Go to the Patients list and open a record.</p>
      <button class="btn" onclick="go('/patients')">Go to Patients</button>
    </div>`;

  const obsRows = state.observations.map(o => `
    <tr>
      <td class="mono-cell">${o.code?.coding?.[0]?.code || "—"}</td>
      <td>${o.code?.coding?.[0]?.display || o.code?.text || "—"}</td>
      <td>${o.valueQuantity?.value ?? o.valueString ?? "—"}</td>
      <td class="mono-cell">${o.valueQuantity?.unit || ""}</td>
      <td class="mono-cell">${o.effectiveDateTime?.slice(0,10) || ""}</td>
    </tr>`).join("") || `<tr><td colspan="5" style="color:var(--muted);padding:16px">No observations.</td></tr>`;

  return `
<div class="record-head">
  <div>
    <span class="section-sub">AREA 04 · Patient record</span>
    <div class="section-title">${patientName(p)}</div>
    <span class="mono-cell">Patient/${p.id} · ${p.gender || "—"}</span>
  </div>
  <div class="actions">
    <button class="btn" onclick="go('/imaging')">🩻 Imaging</button>
    <button class="btn" onclick="go('/ai')">✦ Run inference</button>
    <button class="btn primary" onclick="go('/report')">📄 Risk report</button>
  </div>
</div>

<div class="grid-4" style="margin-bottom:22px">
  <div class="stat"><div class="k">Observations</div><div class="v">${state.observations.length}</div></div>
  <div class="stat"><div class="k">CXR studies</div><div class="v">${state.media.length}</div></div>
  <div class="stat"><div class="k">Reports</div><div class="v">${state.reports.length}</div></div>
  <div class="stat"><div class="k">Consents</div><div class="v">${state.consents.length}</div></div>
</div>

<div class="two-col">
  <div>
    <div class="panel">
      <h3>FHIR-coded observations</h3>
      <div class="table-shell">
        <table>
          <thead><tr><th>LOINC</th><th>Name</th><th>Value</th><th>Unit</th><th>Date</th></tr></thead>
          <tbody>${obsRows}</tbody>
        </table>
      </div>
    </div>
  </div>
  <div>
    <div class="worklist">
      <h3>Linked FHIR resources</h3>
      <p><span class="status-dot"></span>Patient / ${p.id.slice(0,8)}</p>
      <p><span class="status-dot"></span>Observation × ${state.observations.length}</p>
      <p><span class="status-dot"></span>Media × ${state.media.length}</p>
      <p><span class="status-dot"></span>DiagnosticReport × ${state.reports.length}</p>
      <p><span class="status-dot"></span>Consent × ${state.consents.length}</p>
    </div>
    <div class="panel" style="margin-top:14px">
      <h3>MIMIC identifiers</h3>
      ${(p.extension || []).map(e => `
        <p style="font-family:var(--mono);font-size:12px;color:var(--muted);margin:4px 0">
          ${e.url?.split(":").pop()}: ${e.valueString ?? e.valueDecimal ?? e.valueBoolean ?? "—"}
        </p>`).join("") || "<p style='color:var(--muted)'>No extensions.</p>"}
    </div>
  </div>
</div>`;
}

/* ================================================================
   VIEW — IMAGING
   ================================================================ */
function viewImaging() {
  const imgs = state.media.length
    ? state.media.map(m => {
      const cxr = cxrDescription(m);
      const primaryUrl = m.content?.url || "";
      return `
      <figure>
        <img src="${primaryUrl}"
          alt="CXR image ${cxr.studyId}"
          onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 300 300\\'><rect fill=\\'%23111\\' width=\\'300\\' height=\\'300\\'/><text fill=\\'%23666\\' x=\\'50%\\' y=\\'50%\\' text-anchor=\\'middle\\' font-family=\\'monospace\\' font-size=\\'12\\'>CXR unavailable</text></svg>'">
        <figcaption>
          ${m.modality?.coding?.[0]?.code || "CR"} · ${m.extension?.[0]?.valueString || m.id?.slice(0,8)}
          ${m.content?.url ? `<a href="${m.content.url}" target="_blank" style="color:#7eaace;margin-left:8px">↗ Full size</a>` : ""}
        </figcaption>
      </figure>`;
    }).join("")
    : `<div style="display:flex;align-items:center;justify-content:center;height:280px;color:#7eaace;font-family:var(--mono);font-size:12px">
        No images loaded for selected patient.
      </div>`;

  return `
<div class="page-head">
  <div>
    <span class="section-sub">AREA 05 · Imaging</span>
    <div class="section-title">CXR image storage</div>
  </div>
  ${state.selectedPatient ? `<span style="font-family:var(--mono);font-size:12px;color:var(--muted)">${patientName(state.selectedPatient)}</span>` : ""}
</div>

<div class="two-col">
  <div class="viewer">${imgs}</div>
  <div class="panel">
    <h3>Upload to MinIO</h3>
    ${state.selectedPatient ? "" : `<div class="disclaimer" style="margin-bottom:12px">Select a patient first.</div>`}
    <div class="form-group">
      <label>Study ID</label>
      <input id="studyId" placeholder="e.g. 50414267">
    </div>
    <div class="form-group">
      <label>DICOM ID</label>
      <input id="dicomId" placeholder="e.g. MIMIC-CXR dicom_id">
    </div>
    <div class="form-group">
      <label>Modality</label>
      <select id="modality">
        <option value="CR">CR — Computed Radiography</option>
        <option value="CT">CT — Computed Tomography</option>
        <option value="MR">MR — Magnetic Resonance</option>
        <option value="FUNDUS">FUNDUS — Retinal</option>
      </select>
    </div>
    <div class="form-group">
      <label>Conclusion</label>
      <textarea id="conclusion" placeholder="DiagnosticReport conclusion…"></textarea>
    </div>
    <div class="form-group">
      <label>Image file (SVG, JPG, PNG)</label>
      <input id="imageFile" type="file" accept="image/*,.svg" style="padding:6px">
    </div>
    <button class="btn primary" onclick="uploadImage()" style="width:100%;justify-content:center">
      ↥ Store image &amp; create report
    </button>
  </div>
</div>`;
}

/* ================================================================
   VIEW — AI INFERENCE
   ================================================================ */
function viewAI() {
  const hasPatient = !!state.selectedPatient;
  return `
<span class="section-sub">AREA 06 · AI inference</span>
<div class="section-title">Model orchestration</div>

${!hasPatient ? `<div class="disclaimer">Select a patient in Patients tab before running inference.</div><br>` : ""}

<div class="infer-grid">
  ${[
    ["ML",         "MIMIC-IV FHIR tabular", "XGBoost → ONNX · calibrated probabilities · SHAP explanations"],
    ["DL",         "MIMIC-CXR-JPG imaging", "Compact CXR classifier · JPG media · DiagnosticReport"],
    ["MULTIMODAL", "FHIR + CXR fusion",     "Late fusion · combined risk score · end-to-end triage"],
  ].map(([type, sub, desc]) => `
    <button class="infer-card" onclick="runInference('${type}')" ${!hasPatient ? "disabled style='opacity:.45;cursor:not-allowed'" : ""}>
      <b>${type}</b>
      <strong style="display:block;font-size:13px;color:var(--navy);margin-bottom:6px">${sub}</strong>
      <span>${desc}</span>
    </button>`).join("")}
</div>

<div class="disclaimer">
  Resultado generado por IA de apoyo diagnóstico. No reemplaza criterio médico. Sujeto a revisión clínica obligatoria.
</div>

${state.lastInference ? `
<div class="panel" style="margin-top:20px">
  <h3>Last inference result</h3>
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
    <div class="risk-score" style="font-size:48px">${state.lastInference?.risk_report?.prediction?.[0]?.probabilityDecimal ?? "—"}</div>
    <div>
      <div style="font-size:14px;color:var(--muted);margin-bottom:4px">Risk score</div>
      <span class="badge crit"><span class="d"></span>${state.lastInference?.risk_report?.prediction?.[0]?.qualitativeRisk?.text || "PENDING"}</span>
    </div>
  </div>
  <button class="btn primary" onclick="go('/report')">Open report &amp; sign ➜</button>
</div>` : ""}`;
}

/* ================================================================
   VIEW — RISK REPORT
   ================================================================ */
function viewReport() {
  const r = state.lastInference?.risk_report;
  const reportImages = state.reports.flatMap(rep => rep.presentedForm || []);
  const isSigned = !!r?.performer?.length;

  if (!r) return `
    <div class="panel" style="max-width:480px">
      <h3>No active RiskAssessment</h3>
      <p style="color:var(--muted);margin-bottom:16px">Run an inference from the AI Inference tab first.</p>
      <button class="btn" onclick="go('/ai')">Go to AI Inference</button>
    </div>`;

  return `
<span class="section-sub">AREA 07 · Signed risk report</span>
<div class="section-title">RiskAssessment</div>

<div class="two-col">
  <div>
    <div class="panel">
      <div class="risk-score">${r.prediction?.[0]?.probabilityDecimal ?? "—"}</div>
      <div style="margin:12px 0 16px;display:flex;align-items:center;gap:10px">
        <span class="badge crit"><span class="d"></span>${r.prediction?.[0]?.qualitativeRisk?.text || "—"}</span>
        ${isSigned ? `<span class="badge ok"><span class="d"></span>SIGNED</span>` : `<span class="badge warn"><span class="d"></span>PENDING SIGNATURE</span>`}
      </div>
      <pre class="terminal" style="max-height:280px;overflow-y:auto;font-size:11px">${JSON.stringify(r, null, 2)}</pre>
    </div>

    ${reportImages.length ? `
    <div class="panel" style="margin-top:14px">
      <h3>Report imaging forms</h3>
      ${reportImages.map(img => `
        <div style="margin-bottom:10px">
          <a class="image-link" href="${img.url}" target="_blank"
            style="color:var(--navy);font-family:var(--mono);font-size:12px">
            ↗ ${img.title || img.contentType || "CXR media"}
          </a>
        </div>`).join("")}
    </div>` : ""}
  </div>

  <div class="panel">
    <h3>Medical signature</h3>
    ${isSigned
      ? `<div class="badge ok" style="margin-bottom:12px"><span class="d"></span>Signed by ${r.performer?.[0]?.display || "physician"}</div>
         <p style="color:var(--muted);font-size:13px">This report has been reviewed and signed.</p>`
      : `<div class="disclaimer" style="margin-bottom:14px">
           This RiskAssessment requires a physician signature before the patient record can be closed.
         </div>
         <label>Clinical note (minimum 30 characters)</label>
         <textarea id="clinicalNote" placeholder="Enter your clinical assessment and decision…"></textarea>
         <button class="btn primary" onclick="signReport()" style="width:100%;justify-content:center">
           ✎ Sign RiskReport
         </button>`}
  </div>
</div>`;
}

/* ================================================================
   VIEW — AUDIT & CONSENT
   ================================================================ */
function viewAudit() {
  const rows = state.audit.map(a => `
    <tr>
      <td class="mono-cell">${(a.recorded || "").slice(0,16)}</td>
      <td>${a.type?.text || a.type?.coding?.[0]?.display || "—"}</td>
      <td>${a.agent?.[0]?.who?.display || "—"}</td>
      <td>
        <span class="badge ${a.outcome === "0" || a.outcome === "success" ? "ok" : "warn"}">
          <span class="d"></span>${a.outcome || "—"}
        </span>
      </td>
      <td class="mono-cell">${a.entity?.[0]?.what?.reference || "—"}</td>
    </tr>`).join("") || `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--muted)">
      No audit events loaded. <button class="btn small" onclick="loadAudit()">Load audit</button>
    </td></tr>`;

  return `
<div class="page-head">
  <div>
    <span class="section-sub">AREA 08 · Audit &amp; Consent</span>
    <div class="section-title">Audit trail</div>
  </div>
  <button class="btn primary" onclick="loadAudit()">⟳ Load events</button>
</div>

<div class="table-shell" style="margin-bottom:24px">
  <table>
    <thead><tr><th>Timestamp</th><th>Action</th><th>Actor</th><th>Outcome</th><th>Entity</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>

<div class="panel" style="max-width:480px">
  <h3>Consent records</h3>
  ${state.consents.length
    ? state.consents.map(c => `
        <p style="margin:6px 0">
          <span class="badge ${c.status === "active" ? "ok" : "soft"}">
            <span class="d"></span>${c.status || "—"}
          </span>
          <span style="margin-left:8px;font-size:13px">${c.scope?.coding?.[0]?.display || c.category?.[0]?.coding?.[0]?.display || "Consent"}</span>
        </p>`).join("")
    : `<p style="color:var(--muted)">No consent records for selected patient.</p>`}
</div>`;
}

/* ================================================================
   ROUTER  — dispatch to correct shell
   ================================================================ */
const PROTECTED_ROUTES = ["/dashboard", "/patients", "/patient", "/imaging", "/ai", "/report", "/audit"];

const APP_VIEWS = {
  "/dashboard": viewDashboardReal,
  "/patients":  viewPatients,
  "/patient":   viewPatient,
  "/imaging":   viewImagingReal,
  "/ai":        viewAI,
  "/report":    viewReport,
  "/audit":     viewAudit,
};

function render() {
  const app = document.querySelector("#app");
  const route = state.route;

  // Public routes
  if (route === "/")     return (app.innerHTML = renderLanding());
  if (route === "/auth") return (app.innerHTML = renderAuth());

  // Habeas Data consent gate (logged in but not yet accepted)
  if (route === "/habeas-data") {
    if (!state.principal) return (app.innerHTML = renderAuth());
    return (app.innerHTML = renderHabeasData());
  }

  // Auth guard
  if (!state.principal && PROTECTED_ROUTES.includes(route)) {
    state.route = "/auth";
    location.hash = "/auth";
    return (app.innerHTML = renderAuth());
  }

  // Auto-load media when entering imaging with a selected patient
  if (route === "/imaging" && state.selectedPatient) {
    const pid = state.selectedPatient.id;
    if (!state._imagingLoadedFor || state._imagingLoadedFor !== pid) {
      state._imagingLoadedFor = pid;
      refreshPatientData(pid).then(() => render());
    }
  }

  // Authenticated app shell
  const viewFn = APP_VIEWS[route] || viewDashboard;
  app.innerHTML = renderApp(viewFn());
}

/* ── Routing listener ─────────────────────────────────────────── */
window.addEventListener("hashchange", () => {
  state.route = location.hash.replace("#", "") || "/";
  render();
});

/* ── Boot ─────────────────────────────────────────────────────── */
render();
