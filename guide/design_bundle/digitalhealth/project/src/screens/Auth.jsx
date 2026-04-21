// Auth — Login + Register/Onboarding
function Auth(){
  return (
    <Screen area="AREA 02" subtitle="Authentication & onboarding" title="Login · Register · Onboarding">
      <div className="variants">

        <Frame num="B.1" title="Login — split panel with security note" note="// 4 states shown">
          <div className="wire" style={{padding:0, overflow:'hidden', display:'grid', gridTemplateColumns:'1.1fr 1fr'}}>
            <div className="wire ink" style={{border:'none', borderRadius:0, padding:22}}>
              <div className="mono" style={{color:'#9e9a8c'}}>◐ DIGITALHEALTH</div>
              <div className="hand huge" style={{color:'#f6f4ef', marginTop:16}}>Secure clinical access</div>
              <div className="hand-sm" style={{color:'#c8c4b6', maxWidth:300, marginTop:10}}>
                Access is restricted to authorized personnel. All sessions are logged and
                attributable to a verified practitioner identity.
              </div>
              <div className="line dashed" style={{borderColor:'#555'}}></div>
              <div className="mono" style={{color:'#c8c4b6'}}>
                <div>▸ Session timeout · 15 min</div>
                <div>▸ Two-factor · required for clinicians</div>
                <div>▸ All actions logged to audit</div>
              </div>
            </div>

            <div style={{padding:22}}>
              <div className="mono muted">SIGN IN · DEFAULT STATE</div>
              <div className="hand big mb">Practitioner access</div>

              <div className="mono muted" style={{fontSize:10}}>EMAIL</div>
              <div className="input glass"><span className="ph">dr.alvarez@hospital.org</span></div>

              <div className="mono muted mt" style={{fontSize:10}}>PASSWORD</div>
              <div className="input glass"><span className="ph">••••••••••••</span><span className="mono muted">show</span></div>

              <div className="row mt" style={{justifyContent:'space-between'}}>
                <span className="hand-sm"><span className="chk on"></span>Remember session</span>
                <span className="hand-sm muted">Forgot password?</span>
              </div>

              <div className="row mt" style={{gap:8}}>
                <span className="btn primary" style={{flex:1, justifyContent:'center'}}>Sign in</span>
                <span className="btn ghost">SSO ▾</span>
              </div>
              <div className="line dashed mt"></div>
              <div className="mono muted">Don't have an account? &nbsp;<span style={{textDecoration:'underline'}}>Request institutional access</span></div>
            </div>
          </div>

          <div className="mono muted mt-lg mb">UI STATES</div>
          <div className="grid-4">
            <div className="wire"><div className="mono muted">FOCUS</div><div className="input glass" style={{borderWidth:2}}><span className="ph">email…</span></div><div className="mono muted mt">outline thickens</div></div>
            <div className="wire"><div className="mono muted">ERROR</div><div className="input glass" style={{borderColor:'var(--accent)'}}><span className="ph" style={{color:'var(--accent)'}}>invalid email</span></div><div className="mono" style={{color:'var(--accent)'}}>! format not recognized</div></div>
            <div className="wire"><div className="mono muted">LOCKED</div><div className="input glass" style={{opacity:.5}}><span className="ph">dr.alvarez@…</span></div><div className="mono muted">⌧ account locked · contact admin</div></div>
            <div className="wire"><div className="mono muted">MAINTENANCE</div><div className="alert-bar" style={{padding:'6px 10px'}}><span className="dot"></span><span className="hand-sm">Scheduled maintenance 02:00–04:00 UTC</span></div></div>
          </div>
        </Frame>

        <Frame num="B.2" title="Register · Onboarding — multi-step" note="// role-aware fields">
          <div className="wire" style={{padding:'10px 14px'}}>
            <div className="row mono muted" style={{gap:6}}>
              <span className="pill" style={{borderColor:'var(--ink)', color:'var(--ink)'}}>① ROLE</span>
              <span style={{flex:.4, borderTop:'1.2px dashed var(--ink-3)', margin:'0 6px'}}></span>
              <span className="pill" style={{borderColor:'var(--ink)', color:'var(--ink)'}}>② IDENTITY</span>
              <span style={{flex:.4, borderTop:'1.2px dashed var(--ink-3)', margin:'0 6px'}}></span>
              <span className="pill">③ INSTITUTION</span>
              <span style={{flex:.4, borderTop:'1.2px dashed var(--ink-3)', margin:'0 6px'}}></span>
              <span className="pill">④ CONSENT</span>
              <span style={{flex:.4, borderTop:'1.2px dashed var(--ink-3)', margin:'0 6px'}}></span>
              <span className="pill">⑤ SUBMITTED</span>
            </div>
          </div>

          <div className="wire mt">
            <div className="mono muted">STEP 01 · USER TYPE</div>
            <div className="hand big mb">Select your role</div>
            <div className="grid-3">
              <div className="wire"><span className="rdio"></span><span className="hand">Administrator</span><div className="mono muted mt">platform ops / institution mgmt</div></div>
              <div className="wire" style={{borderWidth:2.5}}><span className="rdio on"></span><span className="hand">Medical specialist</span><div className="mono muted mt">clinician / practitioner</div></div>
              <div className="wire"><span className="rdio"></span><span className="hand">Patient / Auditor</span><div className="mono muted mt">read-only / compliance</div></div>
            </div>
          </div>

          <div className="wire mt">
            <div className="mono muted">STEP 02 · IDENTITY</div>
            <div className="grid-2 mt" style={{gap:10}}>
              {[['FULL NAME','Dra. A. Álvarez'],['NATIONAL ID','CC · 1 098 …'],['EMAIL','@hospital.org'],['PHONE','+57 …'],['PASSWORD','••••••••'],['CONFIRM','••••••••']].map(([k,v],i)=>
                <div key={i}><div className="mono muted" style={{fontSize:10}}>{k}</div><div className="input glass"><span className="ph">{v}</span></div></div>
              )}
            </div>
          </div>

          <div className="wire mt">
            <div className="mono muted">STEP 03 · INSTITUTION &amp; LICENSE</div>
            <div className="grid-2 mt" style={{gap:10}}>
              {[['MEDICAL REGISTRATION','RM · 0045…'],['SPECIALTY','Radiology ▾'],['INSTITUTION','Hospital Universitario ▾'],['DEPARTMENT','Imaging & Diagnostics']].map(([k,v],i)=>
                <div key={i}><div className="mono muted" style={{fontSize:10}}>{k}</div><div className="input glass"><span className="ph">{v}</span></div></div>
              )}
            </div>
          </div>

          <div className="wire mt">
            <div className="mono muted">STEP 04 · TERMS &amp; CONSENT</div>
            <div className="hand-sm mt"><span className="chk on"></span>I accept the <u>Terms of Use</u> (v 2.3 · 2026-01-14)</div>
            <div className="hand-sm"><span className="chk on"></span>I accept the <u>Privacy &amp; Habeas Data</u> policy</div>
            <div className="hand-sm"><span className="chk"></span>I authorize processing of identifying data under regulatory retention</div>
            <div className="hand-sm"><span className="chk"></span>I agree to platform audit of my clinical actions</div>
            <div className="row mt"><span className="btn">Back</span><span className="spacer"></span><span className="btn primary">Submit request</span></div>
          </div>

          <div className="wire mt dim center" style={{padding:20}}>
            <div className="mono muted">STEP 05 · REQUEST SUBMITTED</div>
            <div className="hand huge" style={{margin:'8px 0'}}>Request received ✓</div>
            <div className="hand-sm muted">Your institution administrator will verify credentials. You will be notified at the provided email address.</div>
            <div className="mono muted mt">REQ · 2026-04-20 · #A-7741</div>
          </div>
        </Frame>

      </div>
    </Screen>
  );
}

window.Auth = Auth;
