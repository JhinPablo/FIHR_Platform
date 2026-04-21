function AuditConsent(){
  return (
    <Screen area="AREA 09" subtitle="Audit · compliance · consent" title="Audit & Consent">
      <div className="variants">
        <Frame num="I.1" title="Audit log · append-only" note="// filters · drawer · export">
          <div className="wire glass" style={{padding:'10px 12px'}}>
            <div className="row">
              <span className="hand big">Audit log</span>
              <span className="mono muted">· 1 282 441 events · append-only</span>
              <span className="spacer"></span>
              <span className="input glass" style={{minWidth:220}}><span className="ph muted">actor, resource, trace…</span></span>
              <span className="btn">⎘ Export</span>
            </div>
            <div className="row mt" style={{gap:4, flexWrap:'wrap'}}>
              {['Actor: any','Role: any','Action: any','Resource: any','Patient: any','Result: any','Date: 24h','Severity: all','+ Filter'].map((p,i)=><span key={i} className="pill">{p}</span>)}
            </div>
          </div>

          <div className="tbl mt">
            <div className="audit-row head"><span>TIMESTAMP · UTC</span><span>SEV</span><span>ACTOR</span><span>ACTION · RESOURCE</span><span>TRACE / RESULT</span><span></span></div>
            {[
              ['2026-04-20 08:12:44','CRIT','system','RISK_FLAG · R-4421 · P-00421','a8f2-99ce · OK'],
              ['2026-04-20 08:12:01','INFO','alvarez','SIGN · DiagnosticReport/R-4420','c211-7740 · OK'],
              ['2026-04-20 08:11:14','INFO','yu','INFER_SUBMIT · J-9920','a8f2-88aa · OK'],
              ['2026-04-20 08:10:22','WARN','system','STORAGE_PRESSURE · hot 78%','— · NOTICE'],
              ['2026-04-20 08:08:55','INFO','ruiz','UPLOAD · Media × 3 · S-9922','b112-2203 · OK'],
              ['2026-04-20 08:02:10','INFO','alvarez','READ · Patient/P-00421','— · OK'],
              ['2026-04-20 08:00:01','INFO','gil','CONSENT_RENEW · v2.3','c001-1122 · OK'],
              ['2026-04-20 07:44:39','WARN','yu','INFER_FAILED · J-9917','e991-0033 · TIMEOUT'],
            ].map((r,i)=>(
              <div key={i} className="audit-row">
                <span>{r[0]}</span>
                <span style={{color: r[1]==='CRIT'?'var(--accent)':undefined}}>{r[1]}</span>
                <span>{r[2]}</span><span>{r[3]}</span><span>{r[4]}</span><span>▸</span>
              </div>
            ))}
          </div>

          <div className="wire mt">
            <div className="mono muted mb">EVENT DETAIL · a8f2-99ce</div>
            <div className="grid-2" style={{gap:10}}>
              <div>
                <div className="mono">action · RISK_FLAG</div>
                <div className="mono">resource · RiskAssessment/R-4421</div>
                <div className="mono">patient · P-00421</div>
                <div className="mono">actor · system · model=dl.resnet.v3</div>
                <div className="mono">severity · CRIT</div>
                <div className="mono">result · OK</div>
                <div className="mono">IP · 10.0.42.18</div>
                <div className="mono">trace · a8f2-99ce-4401-…</div>
              </div>
              <div className="wire dim">
                <div className="mono muted">PAYLOAD (signed, immutable)</div>
                <div className="mono" style={{lineHeight:1.4}}>{`{
  "patient":"P-00421",
  "report":"R-4421",
  "prob":0.87,
  "band":"CRITICAL",
  "model":"dl.resnet.v3@3.2.1"
}`}</div>
              </div>
            </div>
          </div>
        </Frame>

        <Frame num="I.2" title="Consent · first-login modal + management" note="// habeas data">
          <div className="wire glass" style={{padding:0, position:'relative', minHeight:320}}>
            <div style={{position:'absolute', inset:0, background:'repeating-linear-gradient(135deg, rgba(0,0,0,.04) 0 1px, transparent 1px 6px)'}}></div>
            <div className="wire" style={{position:'relative', margin:'36px auto', maxWidth:460, background:'#fcfbf7'}}>
              <div className="mono muted">FIRST-LOGIN CONSENT · REQUIRED</div>
              <div className="hand big mt">Processing of clinical data</div>
              <div className="hand-sm muted mt">Policy v2.3 · effective 2026-01-14</div>
              <div className="line dashed mt"></div>
              <div className="hand-sm">By continuing you acknowledge that DigitalHealth will process your clinical data for the purposes of diagnosis, treatment, auditability and regulatory retention under the applicable habeas data framework.</div>
              <div className="hand-sm mt">This decision is recorded, timestamped, and retained in the audit log.</div>
              <div className="hand-sm mt"><span className="chk on"></span>I have read and accept the policy</div>
              <div className="hand-sm"><span className="chk"></span>I authorize secondary use for anonymized research</div>
              <div className="row mt"><span className="btn ghost">Decline</span><span className="spacer"></span><span className="btn">Review full policy</span><span className="btn primary">Accept &amp; continue</span></div>
            </div>
          </div>

          <div className="wire mt">
            <div className="row b-bot">
              <div className="mono muted">CONSENT MANAGEMENT · P-00421</div>
              <span className="spacer"></span>
              <span className="badge ok"><span className="d"></span>CURRENT · ACTIVE</span>
            </div>
            <div className="grid-3 mt">
              <div className="wire p-sm"><div className="mono muted">ACCEPTED VERSION</div><div className="hand big">v2.3</div><div className="mono muted">2026-01-14</div></div>
              <div className="wire p-sm"><div className="mono muted">ACCEPTED AT</div><div className="hand big">2026-04-18 09:15</div><div className="mono muted">IP 186.42.12.30</div></div>
              <div className="wire p-sm"><div className="mono muted">STATUS</div><div className="hand big">Active</div><div className="mono muted">next review · 2027-01</div></div>
            </div>

            <div className="mono muted mt">HISTORY</div>
            <div className="tbl mt">
              <div className="audit-row head"><span>DATE</span><span>VERSION</span><span>EVENT</span><span>CHANNEL</span><span>IP / META</span><span></span></div>
              {[['2026-04-18 09:15','v2.3','ACCEPT','first-login modal','186.42.12.30'],['2025-06-02 11:02','v2.1','ACCEPT','onboarding','186.42.12.30'],['2024-09-12 08:44','v2.0','ACCEPT','onboarding','186.42.12.28']].map((r,i)=>(
                <div key={i} className="audit-row"><span>{r[0]}</span><span>{r[1]}</span><span>{r[2]}</span><span>{r[3]}</span><span>{r[4]}</span><span>▸</span></div>
              ))}
            </div>

            <div className="row mt"><span className="btn">Review full policy</span><span className="btn">Download signed receipt</span><span className="spacer"></span><span className="btn ghost">Revoke (restricted)</span></div>
          </div>
        </Frame>
      </div>
    </Screen>
  );
}
window.AuditConsent = AuditConsent;
