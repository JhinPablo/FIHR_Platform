function Patients(){
  const rows = [
    ['P-00421','Rojas, Martha','CC · 41 921 334','54','F','Dr. Alvarez','crit','0.87','warn','PEND SIG'],
    ['P-00388','Mora, Julián','CC · 1 022 884','38','M','Dr. Yu','warn','0.64','warn','REVIEW'],
    ['P-00357','Pérez, Luis','CC · 5 543 110','61','M','Dr. Kim','ok','0.12','ok','SIGNED'],
    ['P-00301','Díaz, Fernanda','CC · 72 019 882','29','F','Dr. Alvarez','soft','—','soft','INTAKE'],
    ['P-00289','Gil, Ricardo','CC · 80 331 002','47','M','Dr. Kim','ok','0.23','ok','ACTIVE'],
    ['P-00104','Vega, Ana','CC · 22 018 119','72','F','Dr. Alvarez','crit','0.81','crit','BLOCKED'],
    ['P-00092','Lopez, Sara','CC · 19 882 440','44','F','Dr. Yu','warn','0.58','warn','REVIEW'],
    ['P-00031','Ortiz, Carlos','CC · 10 552 770','59','M','Dr. Kim','ok','0.30','ok','ACTIVE'],
  ];
  return (
    <Screen area="AREA 04" subtitle="Patient list — advanced table" title="Patients">
      <Frame num="D" title="Dense table · drawer preview" note="// filters · sort · bulk · density">
        <div className="wire glass" style={{padding:'10px 12px'}}>
          <div className="row">
            <span className="hand big">Patients</span>
            <span className="mono muted">· 1 284 total · 42 assigned to me</span>
            <span className="spacer"></span>
            <span className="input glass" style={{minWidth:280}}><span className="ph muted">Name, document, study, FHIR id…</span><span className="k">⌘K</span></span>
            <span className="btn">⎘ Export</span>
            <span className="btn primary">+ New patient</span>
          </div>
          <div className="row mt" style={{gap:6, flexWrap:'wrap'}}>
            {['Assignee: me ✕','Risk: ≥ elevated ✕','Consent: active','Sex: all','Updated: 7d','+ Filter'].map((p,i)=><span key={i} className="pill">{p}</span>)}
            <span className="spacer"></span>
            <span className="mono muted">Density</span>
            <span className="pill" style={{background:'var(--ink)', color:'#fff'}}>COMPACT</span><span className="pill">COZY</span>
          </div>
        </div>

        <div className="tbl mt">
          <div className="tr head"><span>ID</span><span>NAME</span><span>DOC / DEMO</span><span>AGE</span><span>SEX</span><span>ASSIGNEE</span><span>RISK</span><span>STATUS</span></div>
          {rows.map((r,i)=>(
            <div key={i} className="tr">
              <span className="mono">{r[0]}</span><span className="hand">{r[1]}</span><span className="mono muted">{r[2]}</span>
              <span className="hand">{r[3]}</span><span className="hand">{r[4]}</span><span className="hand">{r[5]}</span>
              <span className={'badge '+r[6]}><span className="d"></span>{r[7]}</span>
              <span className={'badge '+r[8]}><span className="d"></span>{r[9]}</span>
            </div>
          ))}
        </div>

        <div className="row mt">
          <span className="mono muted">Showing 1–8 of 1 284 · page 1 / 161</span>
          <span className="spacer"></span>
          <span className="btn sm ghost">◀</span>
          <span className="btn sm">1</span><span className="btn sm">2</span><span className="btn sm">3</span><span className="mono muted">…</span>
          <span className="btn sm">161</span>
          <span className="btn sm ghost">▶</span>
        </div>

        <div className="mono muted mt-lg mb">ROW PREVIEW · DRAWER</div>
        <div className="wire glass" style={{padding:14}}>
          <div className="row">
            <div>
              <div className="mono muted">P-00421 · ROJAS, MARTHA · 54F</div>
              <div className="hand big">Pending signature · critical</div>
              <div className="hand-sm muted">Last update 2 min ago · Dr. Alvarez · Study S-9921</div>
            </div>
            <span className="spacer"></span>
            <span className="badge crit"><span className="d"></span>RISK 0.87</span>
            <span className="btn primary">Open record ➜</span>
          </div>
          <div className="grid-4 mt">
            <div className="wire p-sm"><div className="mono muted">LATEST OBSERVATION</div><div className="hand-sm">hs-CRP 12.4 mg/L ▲</div></div>
            <div className="wire p-sm"><div className="mono muted">STUDIES</div><div className="hand-sm">3 (1 today)</div></div>
            <div className="wire p-sm"><div className="mono muted">INFERENCES</div><div className="hand-sm">4 · last dl.resnet.v3</div></div>
            <div className="wire p-sm"><div className="mono muted">CONSENT</div><div className="hand-sm">v2.3 · active</div></div>
          </div>
        </div>
      </Frame>
    </Screen>
  );
}
window.Patients = Patients;
