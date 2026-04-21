const API = localStorage.getItem("apiBase") || "http://localhost:8000";

const state = {
  route: location.hash.replace("#", "") || "/",
  accessKey: localStorage.getItem("accessKey") || "dev-access-medico-1",
  permissionKey: localStorage.getItem("permissionKey") || "dev-permission-medico-1",
  principal: null,
  patients: [],
  selectedPatient: null,
  observations: [],
  reports: [],
  media: [],
  audit: [],
  consents: [],
  lastInference: null,
};

function headers() {
  return {
    "Content-Type": "application/json",
    "X-Access-Key": state.accessKey,
    "X-Permission-Key": state.permissionKey,
  };
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

function nav(route, label) {
  return `<button class="${state.route === route ? "active" : ""}" onclick="go('${route}')">${label}</button>`;
}

window.go = (route) => {
  state.route = route;
  location.hash = route;
  render();
};

window.login = async () => {
  state.accessKey = document.querySelector("#accessKey").value;
  state.permissionKey = document.querySelector("#permissionKey").value;
  localStorage.setItem("accessKey", state.accessKey);
  localStorage.setItem("permissionKey", state.permissionKey);
  try {
    const data = await api("/auth/validate-keys", { method: "POST" });
    state.principal = data.principal;
    go("/patients");
  } catch (err) {
    alert(err.message);
  }
};

window.loadPatients = async () => {
  const data = await api("/fhir/Patient?limit=20&offset=0");
  state.patients = data.entry.map((e) => e.resource);
  render();
};

window.openPatient = async (id) => {
  state.selectedPatient = await api(`/fhir/Patient/${id}`);
  state.observations = (await api(`/fhir/Observation?patient_id=${id}&limit=50&offset=0`)).entry.map((e) => e.resource);
  state.reports = (await api(`/fhir/DiagnosticReport?patient_id=${id}&limit=20&offset=0`)).entry.map((e) => e.resource);
  state.media = (await api(`/fhir/Media?patient_id=${id}&limit=20&offset=0`)).entry.map((e) => e.resource);
  go("/patient");
};

window.runInference = async (modelType) => {
  if (!state.selectedPatient) return alert("Selecciona un paciente primero.");
  const data = await api("/infer", {
    method: "POST",
    body: JSON.stringify({ patient_id: state.selectedPatient.id, model_type: modelType, features: { observations: state.observations.length } }),
  });
  state.lastInference = data;
  go("/risk");
};

window.signReport = async () => {
  const note = document.querySelector("#clinicalNote").value;
  const reportId = state.lastInference?.risk_report?.id;
  if (!reportId) return alert("No hay RiskReport para firmar.");
  try {
    state.lastInference.risk_report = await api(`/risk-reports/${reportId}/sign`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "ACCEPT", clinical_note: note }),
    });
    render();
  } catch (err) {
    alert(err.message);
  }
};

window.loadAudit = async () => {
  state.audit = (await api("/audit-log?limit=50&offset=0")).entry.map((e) => e.resource);
  render();
};

window.loadConsents = async () => {
  const suffix = state.selectedPatient ? `?patient_id=${state.selectedPatient.id}` : "";
  state.consents = (await api(`/consents${suffix}`)).entry.map((e) => e.resource);
  render();
};

function layout(content) {
  return `
    <div class="shell">
      <header class="topbar">
        <div class="brand">FHIR Platform Corte 2</div>
        <div class="badge">MIMIC-IV + MIMIC-CXR</div>
        <nav class="nav">
          ${nav("/", "Inicio")}
          ${nav("/login", "Llaves")}
          ${nav("/patients", "Pacientes")}
          ${nav("/patient", "Detalle")}
          ${nav("/risk", "RiskReport")}
          ${nav("/audit", "Audit")}
        </nav>
      </header>
      ${content}
    </div>`;
}

function home() {
  return layout(`
    <section class="hero">
      <div>
        <h1>Sistema Clínico Digital Interoperable</h1>
        <p style="color:#dbeafe;max-width:760px">FastAPI, Supabase PostgreSQL, FHIR-Lite/FHIR R4, doble API-Key, ML/DL y trazabilidad clínica sobre MIMIC-IV + MIMIC-CXR-JPG.</p>
      </div>
    </section>
    <main class="page grid">
      <div class="card"><h2>FHIR</h2><p>Patient, Observation, Media, DiagnosticReport, RiskAssessment, Consent y AuditEvent.</p></div>
      <div class="card"><h2>Seguridad</h2><p>Roles, doble llave, cifrado de datos sensibles y rate limiting 429.</p></div>
      <div class="card"><h2>Datos</h2><p>MIMIC resuelve fragmentación clínica al mapear EHR e imágenes a recursos interoperables.</p></div>
    </main>`);
}

function login() {
  return layout(`<main class="page">
    <div class="grid two">
      <section class="card">
        <h2>Acceso por doble API-Key</h2>
        <label>X-Access-Key</label>
        <input id="accessKey" value="${state.accessKey}">
        <label>X-Permission-Key</label>
        <input id="permissionKey" value="${state.permissionKey}">
        <p><button class="btn primary" onclick="login()">Validar llaves</button></p>
      </section>
      <section class="card">
        <h2>Credenciales demo</h2>
        <p class="mono">Admin: dev-access-admin / dev-permission-admin</p>
        <p class="mono">Medico 1: dev-access-medico-1 / dev-permission-medico-1</p>
        <p class="mono">Medico 2: dev-access-medico-2 / dev-permission-medico-2</p>
        <p class="mono">Paciente: dev-access-patient / dev-permission-patient</p>
      </section>
    </div>
  </main>`);
}

function patients() {
  const rows = state.patients.map((p) => `
    <tr>
      <td>${p.id}</td><td>${p.name?.[0]?.text || "Paciente"}</td><td>${p.gender || "-"}</td>
      <td>${p.extension?.[1]?.valueString || "-"}</td>
      <td><button class="btn" onclick="openPatient('${p.id}')">Abrir</button></td>
    </tr>`).join("");
  return layout(`<main class="page">
    <div class="row"><h2>Pacientes FHIR</h2><span class="spacer"></span><button class="btn primary" onclick="loadPatients()">Cargar</button></div>
    <section class="card"><table><thead><tr><th>ID</th><th>Nombre</th><th>Sexo</th><th>MIMIC subject_id</th><th></th></tr></thead><tbody>${rows}</tbody></table></section>
  </main>`);
}

function patient() {
  const p = state.selectedPatient;
  if (!p) return layout(`<main class="page"><section class="card"><h2>Selecciona un paciente</h2><button class="btn" onclick="go('/patients')">Ir a pacientes</button></section></main>`);
  const obs = state.observations.map((o) => `<tr><td>${o.code?.coding?.[0]?.code}</td><td>${o.code?.coding?.[0]?.display}</td><td>${o.valueQuantity?.value || "-"}</td><td>${o.valueQuantity?.unit || ""}</td></tr>`).join("");
  const media = state.media.map((m) => `<p class="mono">${m.modality?.coding?.[0]?.code || "CR"} · ${m.content?.url || "sin URL"}</p>`).join("");
  return layout(`<main class="page">
    <section class="card">
      <div class="row"><h2>${p.name?.[0]?.text}</h2><span class="spacer"></span><button class="btn primary" onclick="runInference('ML')">Inferencia ML</button><button class="btn primary" onclick="runInference('DL')">Inferencia DL</button><button class="btn danger" onclick="runInference('MULTIMODAL')">Multimodal</button></div>
      <p class="mono">Patient/${p.id}</p>
    </section>
    <div class="grid two" style="margin-top:16px">
      <section class="card"><h2>Observations</h2><table><tbody>${obs}</tbody></table></section>
      <section class="card"><h2>Media CXR</h2>${media || "<p>Sin imágenes cargadas.</p>"}</section>
    </div>
  </main>`);
}

function risk() {
  const r = state.lastInference?.risk_report;
  if (!r) return layout(`<main class="page"><section class="card"><h2>No hay inferencia activa</h2></section></main>`);
  return layout(`<main class="page grid two">
    <section class="card">
      <h2>RiskAssessment</h2>
      <p><span class="badge high">${r.prediction?.[0]?.qualitativeRisk?.text}</span></p>
      <p class="mono">score=${r.prediction?.[0]?.probabilityDecimal}</p>
      <pre class="log">${JSON.stringify(r, null, 2)}</pre>
    </section>
    <section class="card">
      <h2>Firma médica</h2>
      <div class="notice">Resultado generado por IA de apoyo diagnóstico. No reemplaza criterio médico.</div>
      <textarea id="clinicalNote" placeholder="Nota clínica de al menos 30 caracteres"></textarea>
      <p><button class="btn primary" onclick="signReport()">Firmar RiskReport</button></p>
    </section>
  </main>`);
}

function audit() {
  const rows = state.audit.map((a) => `<tr><td>${a.recorded}</td><td>${a.type?.text}</td><td>${a.agent?.[0]?.who?.display || "-"}</td><td>${a.outcome}</td></tr>`).join("");
  return layout(`<main class="page">
    <div class="row"><h2>Audit Log</h2><span class="spacer"></span><button class="btn primary" onclick="loadAudit()">Cargar audit</button><button class="btn" onclick="loadConsents()">Cargar consentimientos</button></div>
    <section class="card"><table><tbody>${rows}</tbody></table></section>
  </main>`);
}

function render() {
  const routes = { "/": home, "/login": login, "/patients": patients, "/patient": patient, "/risk": risk, "/audit": audit };
  document.querySelector("#app").innerHTML = (routes[state.route] || home)();
}

window.addEventListener("hashchange", () => {
  state.route = location.hash.replace("#", "") || "/";
  render();
});

render();

