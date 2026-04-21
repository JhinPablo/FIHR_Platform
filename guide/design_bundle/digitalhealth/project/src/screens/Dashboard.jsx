function Dashboard(){
  return (
    <Screen area="AREA 03" subtitle="Authenticated app shell & dashboard" title="Dashboard — two layouts">

      <Frame num="C.1" title="Classic left-sidebar workstation" note="// safe, PACS-like, high scan-ability">
        <div className="shell">
          <div className="sb">
            <div className="group">MAIN</div>
            <div className="item on"><span className="i"></span>Dashboard</div>
            <div className="item"><span className="i"></span>Patients</div>
            <div className="item"><span className="i"></span>Clinical Records</div>
            <div className="item"><span className="i"></span>Images</div>
            <div className="item"><span className="i"></span>AI Inference</div>
            <div className="item"><span className="i"></span>Risk Reports</div>
            <div className="group">GOVERNANCE</div>
            <div className="item"><span className="i"></span>Audit Log</div>
            <div className="item"><span className="i"></span>Consent</div>
            <div className="group">ACCOUNT</div>
            <div className="item"><span className="i"></span>Settings</div>
            <div className="line dashed mt"></div>
            <div className="mono muted p-sm">v0.1 · ENV: staging</div>
          </div>

          <div>
            <div className="wire glass" style={{padding:'8px 12px', display:'flex', gap:10, alignItems:'center'}}>
              <span className="mono muted">home / dashboard</span>
              <span className="spacer"></span>
              <span className="input glass" style={{minWidth:260}}><span className="ph muted">Search patients, studies, reports…</span><span className="k">⌘K</span></span>
              <span className="badge soft"><span className="d"></span>CLINICIAN</span>
              <span className="btn icon sm">🔔</span>
              <span className="btn icon sm">●</span>
            </div>

            <div className="alert-bar mt"><span className="dot"></span><span className="hand">3 critical inferences awaiting signature · SLA breached on 1</span><span className="spacer"></span><span className="btn sm">Review queue ➜</span></div>

            <div className="grid-6 mt">
              <div className="stat"><div className="k">ACTIVE PATIENTS</div><div className="v">1 284</div><div className="trend">▲ 2.1% · 7d</div></div>
              <div className="stat"><div className="k">PENDING SIGN.</div><div className="v">17</div><div className="trend" style={{color:'var(--accent)'}}>3 critical</div></div>
              <div className="stat"><div className="k">CRIT. ALERTS</div><div className="v">4</div><div className="trend">open</div></div>
              <div className="stat"><div className="k">INFERENCES 24h</div><div className="v">318</div><div className="trend">▲ 9%</div></div>
              <div className="stat"><div className="k">REVIEWS</div><div className="v">22</div><div className="trend">in queue</div></div>
              <div className="stat"><div className="k">CONSENT</div><div className="v">98.2%</div><div className="trend">acceptance</div></div>
            </div>

            <div className="grid-2 mt" style={{gap:10, gridTemplateColumns:'1.6fr 1fr'}}>
              <div className="wire">
                <div className="row b-bot"><div className="mono muted">RECENT PATIENT ACTIVITY</div><span className="spacer"></span><span className="mono muted">24h ▾</span></div>
                <div className="tbl" style={{border:'none', background:'transparent'}}>
                  {[
                    ['P-00421','Rojas, M.','OBS · hs-CRP updated','crit','CRIT','08:12','Dr. Alvarez','Study S-9921'],
                    ['P-00388','Mora, J.','INFERENCE completed','warn','ELEV','08:04','Dr. Yu','dl.resnet.v3'],
                    ['P-00357','Pérez, L.','Report signed','ok','OK','07:58','Dr. Kim','R-4421'],
                    ['P-00301','Díaz, F.','Image uploaded','soft','INFO','07:44','Tech. Ruiz','CT · chest'],
                    ['P-00289','Gil, R.','Consent renewed','ok','OK','07:31','Self','v2.3'],
                  ].map((r,i)=>(
                    <div key={i} className="tr">
                      <span className="mono">{r[0]}</span><span className="hand">{r[1]}</span>
                      <span className="hand-sm muted">{r[2]}</span>
                      <span className={'badge '+r[3]}><span className="d"></span>{r[4]}</span>
                      <span className="mono muted">{r[5]}</span><span className="hand-sm">{r[6]}</span>
                      <span className="mono muted">{r[7]}</span><span className="btn sm ghost">Open ➜</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="wire">
                <div className="row b-bot"><div className="mono muted">CRITICAL ALERT QUEUE</div><span className="spacer"></span><span className="mono muted">4 open</span></div>
                <div className="col">
                  <div className="row"><span className="badge crit"><span className="d"></span>CRIT</span><span className="hand">P-00421 · risk 0.87</span><span className="spacer"></span><span className="mono muted">2m</span></div>
                  <div className="row"><span className="badge crit"><span className="d"></span>CRIT</span><span className="hand">P-00104 · risk 0.81</span><span className="spacer"></span><span className="mono muted">11m</span></div>
                  <div className="row"><span className="badge warn"><span className="d"></span>ELEV</span><span className="hand">P-00388 · risk 0.64</span><span className="spacer"></span><span className="mono muted">28m</span></div>
                  <div className="row"><span className="badge warn"><span className="d"></span>BLOCK</span><span className="hand">R-4402 · missing signature</span><span className="spacer"></span><span className="mono muted">1h</span></div>
                  <div className="line dashed"></div>
                  <div className="row"><span className="btn sm primary">Go to queue</span><span className="btn sm ghost">Escalate</span></div>
                </div>
              </div>
            </div>

            <div className="grid-2 mt" style={{gap:10}}>
              <div className="wire">
                <div className="mono muted mb">INFERENCE VOLUME · 14d</div>
                <div className="chart"><div className="bars">
                  {[35,48,42,58,66,52,70,63,74,88,72,80,95,82].map((h,i)=><div key={i} className="b" style={{height:h+'%'}}/>)}
                </div></div>
              </div>
              <div className="wire">
                <div className="mono muted mb">INFERENCE ACTIVITY</div>
                <div className="queue">
                  {[['J-9921',84,'RUNNING'],['J-9920',42,'RUNNING'],['J-9919',100,'DONE'],['J-9918',0,'QUEUED'],['J-9917',30,'FAILED']].map((r,i)=>(
                    <div key={i} className="q-item">
                      <span className="mono">{r[0]}</span>
                      <div className="progress"><i style={{width:r[1]+'%', background: r[2]==='FAILED'?'var(--accent)':undefined}}/></div>
                      <span className="mono muted" style={{color: r[2]==='DONE'?'#2a5a2a': r[2]==='FAILED'?'var(--accent)':undefined}}>{r[2]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col">
            <div className="wire">
              <div className="mono muted mb">QUICK ACTIONS</div>
              <div className="col">
                <span className="btn">↥ Upload study</span>
                <span className="btn">👤 Open patient</span>
                <span className="btn">⌗ Review risk report</span>
                <span className="btn">✎ Sign report</span>
                <span className="btn role-auditor">⎘ Export audit log</span>
              </div>
            </div>
            <div className="wire">
              <div className="mono muted mb">AUDIT FEED · SNAPSHOT</div>
              <div className="tl" style={{paddingLeft:18}}>
                <div className="tli"><span className="mono muted">08:12</span> &nbsp;<span className="hand-sm">Alvarez signed R-4421</span></div>
                <div className="tli ev-critical"><span className="mono muted">08:09</span> &nbsp;<span className="hand-sm">Critical flag raised P-00421</span></div>
                <div className="tli"><span className="mono muted">08:04</span> &nbsp;<span className="hand-sm">Yu ran dl.resnet.v3 on S-9920</span></div>
                <div className="tli"><span className="mono muted">07:58</span> &nbsp;<span className="hand-sm">Kim signed R-4420</span></div>
                <div className="tli"><span className="mono muted">07:31</span> &nbsp;<span className="hand-sm">Gil renewed consent v2.3</span></div>
              </div>
            </div>
            <div className="wire">
              <div className="mono muted mb">OPERATIONAL CHARTS</div>
              <div className="mono muted">Signature turnaround</div>
              <div className="chart" style={{height:70}}><div className="bars">
                {[40,55,70,50,62,48,66].map((h,i)=><div key={i} className="b" style={{height:h+'%'}}/>)}
              </div></div>
              <div className="mono muted mt">Severity distribution</div>
              <div className="row mt" style={{gap:4}}>
                <div className="progress" style={{flex:2}}><i style={{width:'100%'}}/></div>
                <div className="progress" style={{flex:1}}><i style={{width:'100%', background:'#8a6d00'}}/></div>
                <div className="progress" style={{flex:.3}}><i style={{width:'100%', background:'var(--accent)'}}/></div>
              </div>
              <div className="mono muted mt">Normal · Elevated · Critical</div>
            </div>
          </div>
        </div>
      </Frame>

      <Frame num="C.2" title="Three-pane workstation · rail + split work area" note="// high-density, multi-case">
        <div className="shell narrow">
          <div className="sb" style={{minWidth:60, padding:'8px 0', textAlign:'center'}}>
            <div style={{fontFamily:'var(--label)', fontSize:18, padding:'4px 0'}}>◐</div>
            <div className="line dashed"></div>
            <div className="col" style={{gap:4, padding:'4px 0'}}>
              {['⌂','⎌','☰','⊞','✦','✎','⌗','🔒'].map((g,i)=>
                <div key={i} className="btn icon sm" style={i===1?{background:'var(--ink)', color:'#fff'}:{}}>{g}</div>
              )}
            </div>
          </div>

          <div>
            <div className="wire glass" style={{padding:'6px 10px', display:'flex', gap:8, alignItems:'center'}}>
              <span className="mono muted">Operations / Today</span>
              <span className="spacer"></span>
              <span className="input glass" style={{minWidth:220}}><span className="ph muted">search…</span><span className="k">/</span></span>
              <span className="badge"><span className="d"></span>DR. ALVAREZ · CLINICIAN</span>
              <span className="btn icon sm">🔔</span>
            </div>
            <div className="row mt" style={{gap:0, borderBottom:'1.5px solid var(--ink)', paddingBottom:0}}>
              <span className="pill" style={{borderBottomStyle:'none', borderRadius:'3px 3px 0 0', background:'#fff', padding:'4px 10px'}}>OPERATIONS</span>
              <span className="pill" style={{marginLeft:4, padding:'4px 10px'}}>P-00421 · Rojas</span>
              <span className="pill" style={{marginLeft:4, padding:'4px 10px'}}>P-00388 · Mora</span>
              <span className="pill" style={{marginLeft:4, padding:'4px 10px'}}>+ new case</span>
            </div>

            <div className="grid-2 mt" style={{gridTemplateColumns:'1.4fr 1fr', gap:10}}>
              <div>
                <div className="grid-3">
                  <div className="stat"><div className="k">OPEN CASES</div><div className="v">42</div><div className="trend">assigned to me</div></div>
                  <div className="stat"><div className="k">PEND. SIGN</div><div className="v">7</div><div className="trend" style={{color:'var(--accent)'}}>2 crit</div></div>
                  <div className="stat"><div className="k">TURNAROUND</div><div className="v">14m</div><div className="trend">median · today</div></div>
                </div>

                <div className="wire mt">
                  <div className="mono muted mb">CASE DISTRIBUTION · SEVERITY</div>
                  <svg viewBox="0 0 300 90" style={{width:'100%', height:100}}>
                    <g fontFamily="var(--mono)" fontSize="8" fill="#4a4a4a">
                      <line x1="0" y1="70" x2="300" y2="70" stroke="#111" strokeWidth="1"/>
                      <polyline fill="none" stroke="#111" strokeWidth="1.5" points="0,55 30,48 60,52 90,40 120,35 150,28 180,36 210,30 240,22 270,26 300,18"/>
                      <polyline fill="none" stroke="#111" strokeWidth="1" strokeDasharray="3 2" points="0,62 30,60 60,58 90,55 120,57 150,52 180,54 210,50 240,48 270,46 300,44"/>
                      <polyline fill="none" stroke="#c23a2b" strokeWidth="1.2" points="0,75 30,72 60,74 90,70 120,68 150,64 180,66 210,60 240,58 270,55 300,52"/>
                      <text x="5" y="12">elevated ——</text><text x="90" y="12">normal - - -</text><text x="165" y="12" fill="#c23a2b">critical ——</text>
                    </g>
                  </svg>
                </div>
              </div>

              <div className="col">
                <div className="wire">
                  <div className="mono muted mb">LIVE FEED · AUDIT</div>
                  <div className="tl">
                    <div className="tli ev-critical"><span className="mono muted">08:12:44</span><div className="hand-sm">CRITICAL raised — P-00421 risk 0.87</div></div>
                    <div className="tli"><span className="mono muted">08:12:01</span><div className="hand-sm">Alvarez signed R-4421</div></div>
                    <div className="tli"><span className="mono muted">08:11:14</span><div className="hand-sm">Yu submitted inference J-9920</div></div>
                    <div className="tli"><span className="mono muted">08:10:02</span><div className="hand-sm">System: storage hot-tier &gt; 78%</div></div>
                    <div className="tli"><span className="mono muted">08:08:55</span><div className="hand-sm">Ruiz uploaded 3 DICOM files</div></div>
                  </div>
                </div>
                <div className="wire">
                  <div className="mono muted mb">SYSTEM STATUS</div>
                  {[['API','ok','OK'],['FHIR gateway','ok','OK'],['Inference workers','warn','2/3'],['Image storage','warn','78% hot'],['Audit writer','ok','OK']].map((r,i)=>(
                    <div key={i} className="row mt"><span className="hand-sm">{r[0]}</span><span className="spacer"></span><span className={'badge '+r[1]}><span className="d"></span>{r[2]}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col">
            <div className="wire">
              <div className="mono muted mb">CONTEXT · TODAY</div>
              <div className="hand-sm">Shift · 06:00–18:00</div>
              <div className="hand-sm">Queue priority · CRITICAL-FIRST</div>
              <div className="hand-sm">On call · Dr. Kim (backup)</div>
            </div>
            <div className="wire">
              <div className="mono muted mb">ROLE QUICK ACTIONS</div>
              <div className="col">
                <span className="btn">Create case</span>
                <span className="btn">Run inference…</span>
                <span className="btn">Sign pending reports (7)</span>
                <span className="btn">Escalate critical</span>
              </div>
            </div>
            <div className="wire">
              <div className="mono muted mb">STATES LEGEND</div>
              <div className="row wrap" style={{gap:6}}>
                <span className="badge ok"><span className="d"></span>OK</span>
                <span className="badge soft"><span className="d"></span>INFO</span>
                <span className="badge warn"><span className="d"></span>ELEV</span>
                <span className="badge crit"><span className="d"></span>CRIT</span>
                <span className="badge warn"><span className="d"></span>PEND SIG</span>
                <span className="badge soft"><span className="d"></span>BLOCKED</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mono muted mt-lg mb">DASHBOARD STATES</div>
        <div className="grid-5">
          <div className="wire"><div className="mono muted">NORMAL</div><div className="scribble mt"></div><div className="scribble mt"></div></div>
          <div className="wire"><div className="mono muted">HIGH ALERT</div><div className="alert-bar mt" style={{padding:'4px 8px'}}><span className="dot"></span><span className="hand-sm">3 crit</span></div></div>
          <div className="wire"><div className="mono muted">EMPTY</div><div className="hand-sm muted mt">No cases assigned.</div></div>
          <div className="wire"><div className="mono muted">LIMITED PERM.</div><div className="hand-sm muted mt">Some panels hidden due to role.</div></div>
          <div className="wire"><div className="mono muted">DEGRADED</div><div className="badge warn mt"><span className="d"></span>INFER 1/3</div></div>
        </div>
      </Frame>
    </Screen>
  );
}
window.Dashboard = Dashboard;
