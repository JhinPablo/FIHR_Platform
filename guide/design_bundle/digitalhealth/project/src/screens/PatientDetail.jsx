function PatientDetail(){
  const { useParams } = ReactRouterDOM;
  const { id = 'P-00421' } = useParams();
  return (
    <Screen area="AREA 05" subtitle="Patient detail · clinical workstation" title="Patient Detail — multi-zone workstation">
      <Frame num="E" title="Overview tab · header · timeline · actions rail" note="// 7 tabs">

        <div className="wire glass" style={{padding:'14px 16px'}}>
          <div className="row">
            <div style={{width:48, height:48, border:'1.5px solid var(--ink)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'#fff'}} className="hand big">MR</div>
            <div>
              <div className="hand big">Rojas, Martha <span className="mono muted" style={{fontSize:11}}>· 54F · O+</span></div>
              <div className="mono muted">{id} · CC 41 921 334 · Bogotá · admitted 2026-04-18</div>
            </div>
            <span className="spacer"></span>
            <div className="col" style={{alignItems:'flex-end', gap:4}}>
              <div className="row"><span className="badge crit"><span className="d"></span>RISK 0.87</span><span className="badge warn"><span className="d"></span>PEND SIG</span><span className="badge ok"><span className="d"></span>CONSENT v2.3</span></div>
              <div className="mono muted">assigned · Dr. Alvarez · last activity 2m</div>
            </div>
          </div>
          <div className="row mt" style={{gap:4, flexWrap:'wrap', borderTop:'1px dashed rgba(0,0,0,.2)', paddingTop:10}}>
            <span className="pill" style={{background:'var(--ink)', color:'#fff'}}>Overview</span>
            {['Observations','Images','AI Inference','Risk Report','Audit','Consent'].map(t=><span key={t} className="pill">{t}</span>)}
          </div>
        </div>

        <div className="shell nosidebar mt">
          <div className="col">
            <div className="grid-4">
              <div className="stat"><div className="k">ACTIVE DX</div><div className="v">3</div><div className="trend">codes · ICD-10</div></div>
              <div className="stat"><div className="k">LAST OBS</div><div className="v">hs-CRP</div><div className="trend">12.4 mg/L ▲ abn.</div></div>
              <div className="stat"><div className="k">STUDIES</div><div className="v">3</div><div className="trend">1 today</div></div>
              <div className="stat"><div className="k">PEND. ACTION</div><div className="v">1</div><div className="trend" style={{color:'var(--accent)'}}>signature</div></div>
            </div>

            <div className="wire">
              <div className="row b-bot"><div className="mono muted">CLINICAL TIMELINE</div><span className="spacer"></span>{['all events','obs','img','infer','sig'].map(p=><span key={p} className="pill">{p}</span>)}</div>
              <div className="tl">
                <div className="tli ev-critical"><span className="mono muted">2026-04-20 · 08:12</span><div className="hand">Critical risk flagged · dl.resnet.v3 · 0.87</div><div className="hand-sm muted">Grad-CAM overlay attached · requires signature</div></div>
                <div className="tli"><span className="mono muted">2026-04-20 · 07:44</span><div className="hand">CT chest uploaded · study S-9921</div><div className="hand-sm muted">3 DICOM · Tech. Ruiz</div></div>
                <div className="tli"><span className="mono muted">2026-04-20 · 07:30</span><div className="hand">Observation batch: hs-CRP, WBC, Creatinine</div><div className="hand-sm muted">2 abnormal values</div></div>
                <div className="tli"><span className="mono muted">2026-04-19 · 18:02</span><div className="hand">Clinical note · Dr. Alvarez</div><div className="hand-sm muted">"Persistent dyspnea, 3 days"</div></div>
                <div className="tli"><span className="mono muted">2026-04-18 · 09:15</span><div className="hand">Admission &amp; consent v2.3 accepted</div></div>
              </div>
            </div>

            <div className="grid-2">
              <div className="wire">
                <div className="mono muted mb">LATEST OBSERVATIONS · FHIR-CODED</div>
                <div className="tbl" style={{border:'none', background:'transparent'}}>
                  {[
                    ['hs-CRP','12.4','0–3 mg/L','crit','ABN','▲','07:30'],
                    ['WBC','13.9','4–11 k/µL','warn','ELEV','▲','07:30'],
                    ['Creatinine','0.9','0.6–1.2','ok','OK','▬','07:30'],
                    ['SpO₂','93%','≥95%','warn','LOW','▼','07:15'],
                  ].map((r,i)=>(
                    <div key={i} className="tr" style={{gridTemplateColumns:'1.1fr 80px 100px 80px 80px 80px'}}>
                      <span className="hand-sm">{r[0]}</span><span className="mono">{r[1]}</span>
                      <span className="mono muted">{r[2]}</span>
                      <span className={'badge '+r[3]}><span className="d"></span>{r[4]}</span>
                      <span className="mono muted">{r[5]}</span><span className="mono muted">{r[6]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="wire">
                <div className="mono muted mb">CURRENT REPORT STATE</div>
                <div className="hand big">R-4421 · draft</div>
                <div className="hand-sm muted">dl.resnet.v3 · risk 0.87 · severity HIGH</div>
                <div className="line dashed"></div>
                <div className="hand-sm">Pending:</div>
                <div className="hand-sm">◉ Physician decision</div>
                <div className="hand-sm">◉ Digital signature</div>
                <div className="row mt"><span className="btn primary">Open report</span><span className="btn">Sign &amp; close</span></div>
              </div>
            </div>
          </div>

          <div className="col">
            <div className="wire">
              <div className="mono muted mb">ACTIONS</div>
              <div className="col">
                <span className="btn primary">Open risk report</span>
                <span className="btn">+ Add observation</span>
                <span className="btn">↥ Upload study</span>
                <span className="btn">✦ Run inference</span>
                <span className="btn">✎ Add clinical note</span>
                <span className="btn ghost">Escalate to M&amp;M</span>
              </div>
            </div>
            <div className="wire">
              <div className="mono muted mb">CARE TEAM</div>
              <div className="hand-sm">◉ Dr. A. Alvarez · Radiology (owner)</div>
              <div className="hand-sm">◉ Dr. T. Yu · Internal Med.</div>
              <div className="hand-sm">◉ Tech. P. Ruiz · Imaging</div>
              <div className="hand-sm">◉ Dr. L. Kim · On call</div>
            </div>
            <div className="wire">
              <div className="mono muted mb">FHIR · PRIMARY RESOURCES</div>
              <div className="mono">Patient / 00421</div>
              <div className="mono">Observation × 12</div>
              <div className="mono">Media × 3</div>
              <div className="mono">DiagnosticReport × 1</div>
              <div className="mono">RiskAssessment × 1</div>
              <div className="mono">Consent / v2.3</div>
            </div>
          </div>
        </div>
      </Frame>
    </Screen>
  );
}
window.PatientDetail = PatientDetail;
