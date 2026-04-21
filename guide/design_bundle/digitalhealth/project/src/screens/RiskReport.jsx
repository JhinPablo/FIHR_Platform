function RiskReport(){
  return (
    <Screen area="AREA 08" subtitle="Risk report — document & actions" title="Risk Report">
      <Frame num="H" title="Document body · actions rail" note="// hybrid: printable report + web-native workflow">
        <div className="shell nosidebar">
          <div className="doc">
            <div className="row" style={{alignItems:'flex-start'}}>
              <div>
                <div className="mono meta">DIGITALHEALTH · CLINICAL RISK REPORT · R-4421 · v0.3 draft</div>
                <h3>Risk Assessment — Pulmonary consolidation (RLL)</h3>
                <div className="meta">Patient P-00421 · Rojas, Martha · 54F · CC 41 921 334</div>
                <div className="meta">Generated 2026-04-20 08:12 · Institution · Hospital Universitario</div>
              </div>
              <span className="spacer"></span>
              <div className="col" style={{alignItems:'flex-end'}}>
                <span className="badge crit"><span className="d"></span>PENDING SIGNATURE</span>
                <span className="mono meta">CLOSURE BLOCKED</span>
              </div>
            </div>

            <div className="line dashed"></div>

            <div className="grid-2" style={{gap:22}}>
              <div>
                <div className="mono meta">§1 — PATIENT CONTEXT</div>
                <div>54F, admitted 2026-04-18 with 3-day dyspnea and fever. hs-CRP 12.4 mg/L, SpO₂ 93%, WBC 13.9. No prior chest surgery. Consent v2.3 active.</div>

                <div className="mono meta mt-lg">§2 — MODEL &amp; INPUT</div>
                <div>Model <b>dl.resnet.v3</b> (3.2.1, calibrated 2026-03). Input: CT chest study S-9921 (axial · 256 slices, 1.25 mm). Tabular features: 7.</div>

                <div className="mono meta mt-lg">§3 — RESULT</div>
                <div>Calibrated probability <b>0.87</b> (95% CI 0.81–0.92). Risk band <b>CRITICAL</b>. Predicted class: RLL consolidation, probable infection.</div>

                <div className="mono meta mt-lg">§4 — EXPLANATION SUMMARY</div>
                <div>Grad-CAM localizes evidence to right lower lobe. SHAP: hs-CRP (+0.24), SpO₂ (+0.17), WBC (+0.12) dominate contribution. No single feature single-handedly drives the prediction.</div>
              </div>
              <div>
                <div className="mono meta">§5 — LINKED EVIDENCE</div>
                <ul style={{margin:'2px 0', paddingLeft:18}}>
                  <li>Study S-9921 · axial/coronal/sagittal</li>
                  <li>Observation bundle 2026-04-20 07:30</li>
                  <li>Clinical note Dr. Alvarez 2026-04-19</li>
                </ul>

                <div className="mono meta mt-lg">§6 — CLINICAL OBSERVATIONS</div>
                <div>hs-CRP 12.4 ▲ · WBC 13.9 ▲ · SpO₂ 93% ▼ · Creatinine 0.9 ▬ · Temp 38.6°C ▲</div>

                <div className="mono meta mt-lg">§7 — PHYSICIAN DECISION</div>
                <div className="row mt" style={{gap:6}}>
                  <span className="btn sm" style={{background:'#fff'}}>◯ Accept model finding</span>
                  <span className="btn sm" style={{background:'#fff'}}>◯ Reject · alt diagnosis</span>
                  <span className="btn sm" style={{background:'#fff'}}>◯ Require additional workup</span>
                </div>
                <div className="mono meta mt">NOTES (required):</div>
                <div className="input" style={{minHeight:60, alignItems:'flex-start'}}><span className="ph muted">Physician rationale…</span></div>

                <div className="mono meta mt-lg">§8 — SIGNATURE</div>
                <div className="sig">
                  <div>
                    <div className="mono meta">Dr. A. ALVAREZ · RM 0045…</div>
                    <div className="hand-sm muted">Radiology · Hospital Universitario</div>
                  </div>
                  <div className="mono meta">[ NOT SIGNED · awaiting decision ]</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col">
            <div className="wire" style={{borderColor:'var(--accent)', background:'rgba(194,58,43,0.04)'}}>
              <div className="mono" style={{color:'var(--accent)', letterSpacing:'.08em'}}>CLOSURE BLOCKED</div>
              <div className="hand-sm mt">Reason: physician decision &amp; signature required.</div>
              <div className="hand-sm">Next action: record decision in §7, then sign.</div>
            </div>
            <div className="wire">
              <div className="mono muted mb">ACTIONS</div>
              <div className="col">
                <span className="btn primary">✎ Sign &amp; close</span>
                <span className="btn">Reject &amp; return to AI</span>
                <span className="btn">Add observation</span>
                <span className="btn">⎘ Export PDF</span>
                <span className="btn ghost">Discard draft</span>
              </div>
            </div>
            <div className="wire">
              <div className="mono muted mb">REPORT META</div>
              <div className="mono">ID · R-4421</div>
              <div className="mono">Ver · 0.3 draft</div>
              <div className="mono">Gen · 08:12</div>
              <div className="mono">Model · dl.resnet.v3</div>
              <div className="mono">Trace · a8f2-99ce</div>
              <div className="mono">State · PENDING SIGNATURE</div>
            </div>
            <div className="wire">
              <div className="mono muted mb">VERSION HISTORY</div>
              <div className="tl" style={{paddingLeft:16}}>
                <div className="tli"><span className="mono muted">v0.3 · 08:12</span><div className="hand-sm">Regenerated after obs update</div></div>
                <div className="tli"><span className="mono muted">v0.2 · 07:50</span><div className="hand-sm">Draft · model re-run</div></div>
                <div className="tli"><span className="mono muted">v0.1 · 07:44</span><div className="hand-sm">Initial draft</div></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mono muted mt-lg mb">REPORT STATES</div>
        <div className="grid-5">
          <div className="wire"><div className="mono muted">DRAFT</div><span className="badge soft mt"><span className="d"></span>DRAFT</span></div>
          <div className="wire"><div className="mono muted">PENDING SIG</div><span className="badge warn mt"><span className="d"></span>PENDING SIG</span></div>
          <div className="wire"><div className="mono muted">BLOCKED</div><span className="badge crit mt"><span className="d"></span>BLOCKED</span></div>
          <div className="wire"><div className="mono muted">SIGNED</div><span className="badge ok mt"><span className="d"></span>SIGNED · v1</span></div>
          <div className="wire"><div className="mono muted">ARCHIVED</div><span className="badge soft mt" style={{opacity:.6}}><span className="d"></span>ARCHIVED</span></div>
        </div>
      </Frame>
    </Screen>
  );
}
window.RiskReport = RiskReport;
