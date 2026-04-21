// Landing page — 2 variants
function Landing(){
  return (
    <Screen area="AREA 01" subtitle="Public experience — Landing page" title="Landing — two takes"
      legend={["Institutional header, technical body","B&W low-fi, glass surfaces, monospace technical markers"]}>

      <div className="variants">

        <Frame num="A" title="Editorial / institutional split hero" note="// strong grid, product snapshot right">
          <div className="wire glass" style={{padding:'10px 14px'}}>
            <div className="row">
              <div className="hand" style={{fontWeight:700}}>◐ DigitalHealth</div>
              <div className="mono muted" style={{marginLeft:6}}>/ clinical platform</div>
              <div className="spacer"></div>
              <div className="mono muted" style={{display:'flex', gap:18}}>
                <span>PLATFORM</span><span>MODULES</span><span>SECURITY</span><span>INTEROPERABILITY</span><span>CONTACT</span>
              </div>
              <div className="spacer"></div>
              <span className="btn sm ghost">Sign in</span>
              <span className="btn sm primary">Request access ➜</span>
            </div>
          </div>

          <div className="wire" style={{marginTop:10, padding:'22px 20px', display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:22}}>
            <div>
              <div className="mono muted">CLINICAL INFRASTRUCTURE · HL7 FHIR R4</div>
              <div className="hand xxl" style={{margin:'8px 0 10px'}}>
                Interoperable<br/>clinical records,<br/>signed &amp; traceable.
              </div>
              <div className="hand-sm muted" style={{maxWidth:340, lineHeight:1.35}}>
                A regulated platform for patient records, medical imaging, AI-assisted risk
                assessment and auditable clinical reports — designed for hospital workflow.
              </div>
              <div className="row" style={{marginTop:16, gap:10}}>
                <span className="btn primary">Request access</span>
                <span className="btn ghost">Platform overview ➜</span>
              </div>
              <div className="row" style={{marginTop:18, gap:10, flexWrap:'wrap'}}>
                <span className="badge"><span className="d"></span>FHIR R4</span>
                <span className="badge"><span className="d"></span>RBAC</span>
                <span className="badge"><span className="d"></span>AUDIT</span>
                <span className="badge"><span className="d"></span>SIGNED REPORTS</span>
              </div>
            </div>

            <div className="hero-mock">
              <div className="row">
                <span className="mono muted">// patient · P-00421 · Urgent review</span>
                <span className="spacer"></span>
                <span className="badge crit"><span className="d"></span>CRITICAL</span>
              </div>
              <div className="row" style={{gap:8}}>
                <div className="stat" style={{flex:1, minHeight:52}}><div className="k">RISK</div><div className="v">0.87</div></div>
                <div className="stat" style={{flex:1, minHeight:52}}><div className="k">MODEL</div><div className="hand" style={{fontSize:16}}>dl-resnet-v3</div></div>
                <div className="stat" style={{flex:1, minHeight:52}}><div className="k">SIG.</div><div className="hand" style={{fontSize:16}}>pending</div></div>
              </div>
              <div style={{flex:1, border:'1.2px dashed var(--ink-3)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', background:'#1b1b1b1a'}}>
                [ IMAGING + GRAD-CAM OVERLAY ]
              </div>
              <div className="row mono muted" style={{fontSize:10}}>
                <span>▸ upload</span><span>▸ observation</span><span>▸ infer</span><span>▸ review</span><span>▸ sign</span>
              </div>
            </div>
          </div>

          <div className="wire dim" style={{marginTop:10, padding:'10px 14px'}}>
            <div className="row" style={{justifyContent:'space-between', flexWrap:'wrap', gap:10}}>
              <span className="mono muted">STANDARDS &amp; COMPLIANCE</span>
              <span className="mono">HL7 FHIR R4</span>
              <span className="mono">ISO 27001-aligned</span>
              <span className="mono">Habeas Data</span>
              <span className="mono">Signed reports</span>
              <span className="mono">Append-only audit</span>
              <span className="mono">RBAC</span>
            </div>
          </div>

          <div className="grid-3" style={{marginTop:10}}>
            {[
              ['01 / PATIENT RECORDS','Unified clinical record','FHIR-coded observations, history, consent, linked studies.'],
              ['02 / IMAGING','Lightweight PACS','Modality-aware viewer with overlay explanations.'],
              ['03 / AI INFERENCE','Orchestrated models','ML, DL and multimodal with calibrated probabilities.'],
              ['04 / RISK REPORTS','Signed & exportable','Document-grade output with physician decision.'],
              ['05 / AUDIT','Append-only log','Every access, change and signature — traceable.'],
              ['06 / CONSENT','Habeas data','Versioned consent with persistence & review.'],
            ].map(([k,t,d],i) =>
              <div key={i} className="wire"><div className="mono muted">{k}</div><div className="hand big">{t}</div><div className="line dashed"></div><div className="hand-sm muted">{d}</div></div>
            )}
          </div>

          <div className="wire" style={{marginTop:10, padding:'14px 16px'}}>
            <div className="mono muted mb">OPERATIONAL FLOW</div>
            <div className="flow">
              {['Intake','Observation','Image upload','AI analysis','Review','Signed report','Audit'].map((label,i,arr)=>
                <React.Fragment key={i}>
                  <div className="node"><div className="mono muted">{'0'+(i+1)}</div><div className="hand-sm">{label}</div></div>
                  {i<arr.length-1 && <div className="arrow"></div>}
                </React.Fragment>
              )}
            </div>
          </div>

          <div className="grid-2" style={{marginTop:10}}>
            <div className="wire">
              <div className="mono muted mb">FHIR RESOURCES</div>
              <div className="row wrap" style={{gap:6}}>
                {['Patient','Observation','Media','DiagnosticReport','RiskAssessment','Consent','AuditEvent','Practitioner'].map(r=><span key={r} className="pill">{r}</span>)}
              </div>
              <div className="line dashed mt"></div>
              <div className="hand-sm muted">Native import / export, REST &amp; bulk data.</div>
            </div>
            <div className="wire">
              <div className="mono muted mb">SECURITY &amp; GOVERNANCE</div>
              <div className="grid-2">
                {['◉ API keys & scopes','◉ Role-based access','◉ At-rest encryption','◉ Critical alerts','◉ Consent persistence','◉ Append-only audit'].map((x,i)=><div key={i} className="hand-sm">{x}</div>)}
              </div>
            </div>
          </div>

          <div className="wire dim" style={{marginTop:10, padding:14}}>
            <div className="grid-4" style={{gap:18}}>
              <div><div className="mono muted mb">PRODUCT</div><div className="hand-sm muted">Platform · Modules · Roadmap · Status</div></div>
              <div><div className="mono muted mb">RESOURCES</div><div className="hand-sm muted">Docs · FHIR spec · API · Changelog</div></div>
              <div><div className="mono muted mb">LEGAL</div><div className="hand-sm muted">Privacy · Habeas data · Terms · SLA</div></div>
              <div><div className="mono muted mb">CONTACT</div><div className="hand-sm muted">Institutional enquiries · Support</div></div>
            </div>
            <div className="line dashed mt"></div>
            <div className="row mono muted"><span>© DIGITALHEALTH · 2026</span><span className="spacer"></span><span>BUILD 0.1 · WIREFRAME</span></div>
          </div>
        </Frame>

        <Frame num="B" title="Full-bleed technical hero with console" note="// enterprise infrastructure tone">
          <div className="wire glass" style={{padding:'8px 14px'}}>
            <div className="row">
              <div className="hand" style={{fontWeight:700}}>◐ DigitalHealth</div>
              <div className="mono muted" style={{marginLeft:6}}>/ CIS</div>
              <div className="spacer"></div>
              <div className="mono muted" style={{display:'flex', gap:14}}>
                <span>▸ Platform</span><span>▸ FHIR</span><span>▸ Security</span><span>▸ Docs</span>
              </div>
              <div className="spacer"></div>
              <span className="btn sm">Sign in</span>
              <span className="btn sm primary">Register institution</span>
            </div>
          </div>

          <div className="wire ink" style={{marginTop:10, padding:'28px 22px', position:'relative', overflow:'hidden'}}>
            <div className="mono" style={{color:'#9e9a8c'}}>// build 2026.04 · FHIR R4 · signed reports</div>
            <div className="hand xxl" style={{color:'#f6f4ef', margin:'10px 0'}}>
              Mission-critical<br/>clinical record infrastructure.
            </div>
            <div className="hand-sm" style={{color:'#c8c4b6', maxWidth:520, lineHeight:1.4}}>
              Patient records, medical imaging, AI inference orchestration and
              signed, auditable risk reports — in a single regulated system.
            </div>
            <div className="row" style={{marginTop:18, gap:10}}>
              <span className="btn primary" style={{background:'#f6f4ef', color:'#1b1b1b', borderColor:'#f6f4ef'}}>Request access</span>
              <span className="btn ghost" style={{color:'#f6f4ef', borderColor:'#f6f4ef'}}>▸ Read the brief</span>
            </div>

            <div style={{position:'absolute', right:20, top:20, width:'42%', border:'1px dashed #6a6458', padding:10, fontFamily:'var(--mono)', fontSize:10.5, color:'#c8c4b6', background:'rgba(0,0,0,.22)'}}>
              <div style={{color:'#f3d000'}}>$ fhir.get Patient?_id=421</div>
              <div>&gt; 200 OK · 1 resource</div>
              <div>&gt; observations:12 · media:3 · consent:active</div>
              <div style={{color:'#f3d000', marginTop:6}}>$ infer.run --model dl.resnet.v3 --study S-9921</div>
              <div>&gt; status: running · eta 00:01:42</div>
              <div>&gt; queued by dr.alvarez · trace a8f2..</div>
              <div style={{color:'#78c27a', marginTop:6}}>&gt; signature required before close ⓘ</div>
            </div>
          </div>

          <div className="wire" style={{marginTop:10, padding:'8px 14px'}}>
            <div className="row mono muted" style={{gap:18, flexWrap:'wrap', justifyContent:'space-between'}}>
              <span>▣ HL7 FHIR R4</span><span>▣ RBAC · SCOPES</span><span>▣ AT-REST ENC.</span>
              <span>▣ APPEND-ONLY AUDIT</span><span>▣ SIGNED REPORTS</span>
              <span>▣ CONSENT PERSISTENCE</span><span>▣ CRITICAL ALERT BUS</span>
            </div>
          </div>

          <div className="wire" style={{marginTop:10, padding:16}}>
            <div className="mono muted mb">CAPABILITIES</div>
            <div className="grid-2" style={{gap:'8px 22px'}}>
              {['Unified clinical record','Imaging workstation','AI inference orchestration','Signed risk reports','Append-only audit','Habeas data / consent','Interoperability (FHIR R4)','Role-aware workflows'].map((t,i,arr) =>
                <div key={i} className={i<arr.length-2?'b-bot':''}><span className="mono muted">{'0'+(i+1)}</span> &nbsp; <span className="hand">{t}</span></div>
              )}
            </div>
          </div>

          <div className="wire" style={{marginTop:10, padding:16}}>
            <div className="mono muted mb">WORKFLOW · INTAKE → AUDIT</div>
            <div className="tl">
              {[
                ['STEP 01','Patient intake & consent',false],
                ['STEP 02','Clinical observation capture',false],
                ['STEP 03','Image upload & metadata',false],
                ['STEP 04','AI inference (ML · DL · multimodal)',false],
                ['STEP 05','Physician review & decision',true],
                ['STEP 06','Risk report — signed',false],
                ['STEP 07','Audit log & archive',false],
              ].map(([k,t,c],i) =>
                <div key={i} className={'tli'+(c?' ev-critical':'')}><span className="mono muted">{k}</span> &nbsp; <span className="hand">{t}</span></div>
              )}
            </div>
          </div>

          <div className="grid-2" style={{marginTop:10}}>
            <div className="wire">
              <div className="mono muted mb">INTEROPERABILITY</div>
              <div className="hand-sm">Native FHIR R4 resources, REST + bulk.</div>
              <div className="line dashed"></div>
              <div className="mono">Patient · Observation · Media · DiagnosticReport ·<br/>RiskAssessment · Consent · AuditEvent</div>
            </div>
            <div className="wire">
              <div className="mono muted mb">CTA · ACCESS</div>
              <div className="hand big">Request institutional access</div>
              <div className="hand-sm muted">Verification &amp; onboarding handled by platform operations.</div>
              <div className="row mt"><span className="btn primary">Start request</span><span className="btn ghost">Speak to ops ➜</span></div>
            </div>
          </div>

          <div className="wire dim" style={{marginTop:10, padding:'12px 14px'}}>
            <div className="row mono muted">
              <span>© DIGITALHEALTH · 2026 — institutional healthcare platform</span>
              <span className="spacer"></span>
              <span>STATUS · ALL SYSTEMS OPERATIONAL ●</span>
            </div>
          </div>
        </Frame>

      </div>
    </Screen>
  );
}

window.Landing = Landing;
