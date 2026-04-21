function Components(){
  return (
    <Screen area="AREA 10" subtitle="Component system · states" title="Component system">

      <Frame num="J.1" title="Core components" note="// buttons · inputs · selects · badges">
        <div className="grid-3">
          <div className="wire">
            <div className="mono muted mb">BUTTONS</div>
            <div className="row wrap"><span className="btn primary">Primary</span><span className="btn">Secondary</span><span className="btn ghost">Ghost</span></div>
            <div className="row wrap mt"><span className="btn sm primary">Sm</span><span className="btn sm">Sm</span><span className="btn sm ghost">Sm</span></div>
            <div className="row wrap mt"><span className="btn icon">✦</span><span className="btn icon sm">+</span><span className="btn" style={{opacity:.5}}>Disabled</span></div>
          </div>

          <div className="wire">
            <div className="mono muted mb">INPUT · TEXT / PASSWORD / SEARCH</div>
            <div className="input glass"><span className="ph muted">Email…</span></div>
            <div className="input glass mt"><span className="ph muted">••••••••</span><span className="mono muted">show</span></div>
            <div className="input glass mt"><span className="ph muted">🔍 Search…</span><span className="k">/</span></div>
            <div className="input glass mt" style={{borderColor:'var(--accent)'}}><span className="ph" style={{color:'var(--accent)'}}>Invalid format</span></div>
          </div>

          <div className="wire">
            <div className="mono muted mb">SELECT · COMBOBOX</div>
            <div className="input glass"><span className="ph muted">Specialty ▾</span></div>
            <div className="wire dotted mt p-sm">
              <div className="hand-sm"><span className="chk on"></span>Radiology</div>
              <div className="hand-sm"><span className="chk"></span>Internal medicine</div>
              <div className="hand-sm"><span className="chk"></span>Cardiology</div>
              <div className="hand-sm"><span className="chk"></span>Emergency</div>
            </div>
          </div>

          <div className="wire">
            <div className="mono muted mb">CHECK · RADIO · TOGGLE</div>
            <div><span className="chk on"></span><span className="hand-sm">Remember session</span></div>
            <div><span className="chk"></span><span className="hand-sm">Subscribe to alerts</span></div>
            <div className="mt"><span className="rdio on"></span><span className="hand-sm">Clinician</span> &nbsp; <span className="rdio"></span><span className="hand-sm">Auditor</span></div>
            <div className="mt"><span style={{display:'inline-block', width:34, height:18, border:'1.5px solid var(--ink)', borderRadius:10, background:'var(--ink)', position:'relative', verticalAlign:-4}}><i style={{display:'block', position:'absolute', width:12, height:12, background:'#fff', borderRadius:'50%', top:1.5, right:1.5}}></i></span> <span className="hand-sm">Grad-CAM overlay</span></div>
          </div>

          <div className="wire">
            <div className="mono muted mb">BADGES · STATUS</div>
            <div className="row wrap" style={{gap:6}}>
              <span className="badge ok"><span className="d"></span>OK</span>
              <span className="badge soft"><span className="d"></span>INFO</span>
              <span className="badge warn"><span className="d"></span>ELEVATED</span>
              <span className="badge crit"><span className="d"></span>CRITICAL</span>
              <span className="badge" style={{borderColor:'var(--ink-4)', color:'var(--ink-4)'}}><span className="d" style={{background:'var(--ink-4)'}}></span>ARCHIVED</span>
              <span className="badge warn"><span className="d"></span>PEND SIG</span>
              <span className="badge soft"><span className="d"></span>NO PERM</span>
            </div>
          </div>

          <div className="wire">
            <div className="mono muted mb">TABS · SEGMENTED</div>
            <div className="row" style={{gap:0, borderBottom:'1.5px solid var(--ink)'}}>
              <span className="pill" style={{background:'#fff'}}>Overview</span>
              <span className="pill" style={{marginLeft:4, opacity:.7}}>Observations</span>
              <span className="pill" style={{marginLeft:4, opacity:.7}}>Images</span>
              <span className="pill" style={{marginLeft:4, opacity:.7}}>Audit</span>
            </div>
            <div className="mt"><span className="pill" style={{background:'var(--ink)', color:'#fff'}}>DAY</span><span className="pill">WEEK</span><span className="pill">MONTH</span></div>
          </div>
        </div>
      </Frame>

      <Frame num="J.2" title="Patterns" note="// cards · stats · tables · timelines · uploads">
        <div className="grid-3">
          <div className="wire">
            <div className="mono muted mb">STAT TILE</div>
            <div className="stat"><div className="k">PENDING SIG.</div><div className="v">17</div><div className="trend" style={{color:'var(--accent)'}}>3 critical</div></div>
          </div>
          <div className="wire">
            <div className="mono muted mb">EMPTY STATE</div>
            <div className="wire dotted center" style={{padding:22}}><div className="hand big">⌧</div><div className="hand-sm muted">No inferences yet.<br/>Run one from a study.</div><span className="btn sm mt">Run inference</span></div>
          </div>
          <div className="wire">
            <div className="mono muted mb">SKELETON · LOADING</div>
            <div className="scribble" style={{height:12}}></div>
            <div className="scribble mt" style={{height:12}}></div>
            <div className="scribble mt" style={{height:12, width:'60%'}}></div>
          </div>
          <div className="wire">
            <div className="mono muted mb">TIMELINE ITEM</div>
            <div className="tl">
              <div className="tli ev-critical"><span className="mono muted">08:12</span><div className="hand-sm">Critical flag · R-4421</div></div>
              <div className="tli"><span className="mono muted">07:50</span><div className="hand-sm">Report regenerated</div></div>
            </div>
          </div>
          <div className="wire">
            <div className="mono muted mb">AUDIT ROW</div>
            <div className="mono" style={{fontSize:10.5}}>2026-04-20 08:12 · alvarez · SIGN · R-4420 · OK</div>
            <div className="mono" style={{fontSize:10.5}}>2026-04-20 08:09 · system · RISK_FLAG · R-4421 · CRIT</div>
          </div>
          <div className="wire">
            <div className="mono muted mb">UPLOAD ZONE</div>
            <div className="wire dotted center" style={{padding:18}}><div className="hand big">↥</div><div className="hand-sm muted">Drop DICOM or click to browse</div><div className="mono muted mt">max 500 MB · .dcm .zip</div></div>
          </div>
          <div className="wire">
            <div className="mono muted mb">FILE / IMAGE CARD</div>
            <div className="row"><div style={{width:40, height:40, background:'#1b1b1b', borderRadius:3}}></div><div><div className="hand-sm">CT chest · axial 128</div><div className="mono muted">S-9921 · 1.25 mm</div></div></div>
          </div>
          <div className="wire">
            <div className="mono muted mb">TOAST · CRITICAL</div>
            <div className="alert-bar"><span className="dot"></span><span className="hand-sm">R-4421 flagged critical — signature required</span></div>
          </div>
          <div className="wire">
            <div className="mono muted mb">CONSENT BANNER</div>
            <div className="wire dim p-sm"><div className="hand-sm">Policy v2.3 active. Your next review is in 9 months. <span className="mono muted">▸ view</span></div></div>
          </div>
        </div>
      </Frame>

      <Frame num="J.3" title="State system" note="// unified visual language">
        <div className="grid-6">
          {[
            ['SUCCESS','ok','OK'],['INFO','soft','INFO'],['WARNING','warn','ELEV'],['CRITICAL','crit','CRIT'],
            ['BLOCKED','','BLOCK'],['PEND SIG','warn','PEND SIG'],['PEND CONSENT','warn','PEND CONS'],
            ['INF QUEUED','soft','QUEUED'],['INF RUNNING','warn','RUNNING'],['INF FAILED','crit','FAILED'],
            ['NO PERM','soft','NO PERM'],['ARCHIVED','','ARCHV'],
          ].map((r,i)=>(
            <div key={i} className="wire center">
              <div className="mono muted">{r[0]}</div>
              <span className={'badge mt '+(r[1]||'')} style={!r[1]?{borderColor:'var(--ink-4)', color:'var(--ink-4)'}:{}}>
                <span className="d" style={!r[1]?{background:'var(--ink-4)'}:{}}></span>{r[2]}
              </span>
            </div>
          ))}
        </div>
      </Frame>
    </Screen>
  );
}
window.Components = Components;
