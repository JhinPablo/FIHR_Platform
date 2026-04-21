function AIInference(){
  return (
    <Screen area="AREA 07" subtitle="AI inference workspace" title="AI Inference">
      <Frame num="G" title="Run config · queue · result with explanation" note="// ML · DL · multimodal">
        <div className="shell">
          <div className="col">
            <div className="wire">
              <div className="mono muted mb">NEW INFERENCE</div>
              <div className="mono muted" style={{fontSize:10}}>MODEL TYPE</div>
              <div className="row mt" style={{gap:4}}><span className="pill">ML</span><span className="pill" style={{background:'var(--ink)', color:'#fff'}}>DL</span><span className="pill">MULTIMODAL</span></div>

              <div className="mono muted mt" style={{fontSize:10}}>MODEL</div>
              <div className="input glass"><span className="ph">dl.resnet.v3 · risk-chest ▾</span></div>

              <div className="mono muted mt" style={{fontSize:10}}>VERSION</div>
              <div className="input glass"><span className="ph">3.2.1 · calibrated 2026-03</span></div>

              <div className="mono muted mt" style={{fontSize:10}}>INPUT · STUDY</div>
              <div className="input glass"><span className="ph">S-9921 · CT chest ▾</span></div>

              <div className="mono muted mt" style={{fontSize:10}}>EXPLAIN</div>
              <div className="row mt"><span className="chk on"></span><span className="hand-sm">Grad-CAM</span><span style={{marginLeft:10}}><span className="chk"></span><span className="hand-sm">SHAP (tabular)</span></span></div>

              <div className="line dashed mt"></div>
              <div className="row"><span className="btn primary" style={{flex:1, justifyContent:'center'}}>Run analysis</span><span className="btn">Cancel</span></div>
              <div className="mono muted mt">estimated · 1m 42s · worker queue 2</div>
            </div>

            <div className="wire">
              <div className="mono muted mb">QUEUE · TODAY</div>
              <div className="queue">
                {[['J-9921',84,'RUN'],['J-9920',42,'RUN'],['J-9919',100,'DONE'],['J-9918',0,'QUEUED'],['J-9917',30,'FAIL']].map((r,i)=>(
                  <div key={i} className="q-item">
                    <span className="mono">{r[0]}</span>
                    <div className="progress"><i style={{width:r[1]+'%', background:r[2]==='FAIL'?'var(--accent)':undefined}}/></div>
                    <span className="mono" style={{color:r[2]==='FAIL'?'var(--accent)':'var(--ink-3)'}}>{r[2]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col">
            <div className="wire">
              <div className="row b-bot">
                <div className="mono muted">RESULT · J-9921</div>
                <span className="spacer"></span>
                <span className="badge"><span className="d"></span>dl.resnet.v3</span>
                <span className="badge ok"><span className="d"></span>COMPLETED</span>
              </div>
              <div className="row" style={{gap:18, alignItems:'flex-start'}}>
                <div>
                  <div className="mono muted">CALIBRATED PROBABILITY</div>
                  <div className="hand xxl">0.87</div>
                  <div className="mono muted">95% CI · 0.81 – 0.92</div>
                </div>
                <div style={{flex:1}}>
                  <div className="mono muted mb">RISK BAND</div>
                  <div style={{position:'relative', height:14, border:'1.2px solid var(--ink)', borderRadius:7, background:'repeating-linear-gradient(90deg, #fff 0 20%, rgba(0,0,0,.05) 20% 60%, rgba(194,58,43,.25) 60% 100%)'}}>
                    <div style={{position:'absolute', left:'87%', top:-4, width:2, height:22, background:'var(--ink)'}}></div>
                  </div>
                  <div className="row mono muted mt" style={{justifyContent:'space-between'}}><span>LOW</span><span>NORMAL</span><span>ELEVATED</span><span>HIGH</span><span>CRITICAL</span></div>

                  <div className="mono muted mt">PREDICTED CATEGORY</div>
                  <div className="hand big">Consolidation · RLL · probable infection</div>

                  <div className="mono muted mt">PLAIN-LANGUAGE INTERPRETATION</div>
                  <div className="hand-sm">Model finds high-probability RLL consolidation, consistent with hs-CRP ▲ and SpO₂ ▼. Recommend physician review.</div>
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="wire">
                <div className="mono muted mb">EXPLANATION · GRAD-CAM</div>
                <div className="viewer" style={{aspectRatio:'16/9'}}>
                  <span className="corner" style={{top:8, left:10}}>axial 128 · overlay α 0.55</span>
                  <div className="crosshair"></div>
                  <div className="roi"></div>
                </div>
              </div>
              <div className="wire">
                <div className="mono muted mb">SHAP · TABULAR CONTRIBUTIONS</div>
                <svg viewBox="0 0 260 120" style={{width:'100%', height:160}}>
                  <g fontFamily="var(--mono)" fontSize="9" fill="#2a2a2a">
                    <line x1="90" y1="5" x2="90" y2="115" stroke="#111" strokeDasharray="2 2"/>
                    <text x="2" y="18">hs-CRP</text><rect x="90" y="11" width="80" height="8" fill="#1b1b1b"/><text x="175" y="18">+0.24</text>
                    <text x="2" y="34">SpO₂</text><rect x="90" y="27" width="55" height="8" fill="#1b1b1b"/><text x="150" y="34">+0.17</text>
                    <text x="2" y="50">WBC</text><rect x="90" y="43" width="40" height="8" fill="#1b1b1b"/><text x="135" y="50">+0.12</text>
                    <text x="2" y="66">Age</text><rect x="90" y="59" width="22" height="8" fill="#1b1b1b"/><text x="117" y="66">+0.06</text>
                    <text x="2" y="82">Sex · F</text><rect x="74" y="75" width="16" height="8" fill="#7a7a7a"/><text x="54" y="82">−0.03</text>
                    <text x="2" y="98">Smoker</text><rect x="70" y="91" width="20" height="8" fill="#7a7a7a"/><text x="48" y="98">−0.05</text>
                  </g>
                </svg>
              </div>
            </div>

            <div className="wire">
              <div className="mono muted mb">EXECUTION LOG</div>
              <div className="mono" style={{fontSize:10.5, color:'var(--ink-3)', lineHeight:1.45}}>
                [08:10:02] queued · priority=HIGH · by dr.alvarez<br/>
                [08:10:04] worker-2 accepted · warmup 1.8s<br/>
                [08:10:08] preprocess · resample 1.25mm → 2.0mm · 198ms<br/>
                [08:10:12] forward · resnet.v3 · 42 layers · 1.11s<br/>
                [08:10:13] calibrate · Platt · temp 1.14<br/>
                [08:10:14] explain · grad-cam layer4.2 · 320ms<br/>
                [08:10:15] trace a8f2-99ce · emit AuditEvent · OK<br/>
                [08:11:44] completed · prob 0.87 · band CRITICAL · ✓
              </div>
            </div>
          </div>

          <div className="col">
            <div className="wire">
              <div className="mono muted mb">WORKFLOW</div>
              <div className="col">
                <span className="btn primary">Generate risk report</span>
                <span className="btn">Open linked patient</span>
                <span className="btn">↻ Re-run with other model</span>
                <span className="btn">Escalate critical</span>
                <span className="btn ghost">Cancel if pending</span>
              </div>
            </div>
            <div className="wire">
              <div className="mono muted mb">MODEL METADATA</div>
              <div className="mono">type · dl · classifier</div>
              <div className="mono">arch · resnet-50 v3</div>
              <div className="mono">train · 412k studies</div>
              <div className="mono">AUROC · 0.93 (val)</div>
              <div className="mono">calibrated · 2026-03-02</div>
              <div className="mono">card · ▸ view model card</div>
            </div>
            <div className="wire">
              <div className="mono muted mb">STATES</div>
              <div className="row wrap" style={{gap:6}}>
                <span className="badge soft"><span className="d"></span>READY</span>
                <span className="badge soft"><span className="d"></span>QUEUED</span>
                <span className="badge warn"><span className="d"></span>RUNNING</span>
                <span className="badge ok"><span className="d"></span>COMPLETED</span>
                <span className="badge crit"><span className="d"></span>FAILED</span>
                <span className="badge warn"><span className="d"></span>BLOCKED · DATA</span>
                <span className="badge warn"><span className="d"></span>BLOCKED · PERM</span>
              </div>
            </div>
          </div>
        </div>
      </Frame>
    </Screen>
  );
}
window.AIInference = AIInference;
