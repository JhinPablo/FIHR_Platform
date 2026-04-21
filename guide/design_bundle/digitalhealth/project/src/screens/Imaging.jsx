function Imaging(){
  return (
    <Screen area="AREA 06" subtitle="Medical imaging workstation" title="Imaging viewer">
      <Frame num="F" title="PACS-lite viewer with Grad-CAM overlay" note="// comparison split + metadata">
        <div className="shell">
          <div className="sb">
            <div className="group">STUDIES · P-00421</div>
            <div className="item on"><span className="i"></span>CT chest · S-9921 <span className="mono muted" style={{marginLeft:'auto', fontSize:9}}>today</span></div>
            <div className="item"><span className="i"></span>CR chest · S-9710</div>
            <div className="item"><span className="i"></span>US abdomen · S-9431</div>
            <div className="group">SERIES IN S-9921</div>
            <div className="item on"><span className="i"></span>Axial · 256 img</div>
            <div className="item"><span className="i"></span>Coronal · 128</div>
            <div className="item"><span className="i"></span>Sagittal · 128</div>
            <div className="group">OVERLAYS</div>
            <div className="item on"><span className="i"></span>Grad-CAM</div>
            <div className="item"><span className="i"></span>Segmentation</div>
            <div className="item"><span className="i"></span>None</div>
          </div>

          <div className="col">
            <div className="wire glass" style={{padding:'6px 10px'}}>
              <div className="row">
                <span className="badge"><span className="d"></span>CT · S-9921</span>
                <span className="mono muted">axial · 128/256</span>
                <span className="spacer"></span>
                <div className="row" style={{gap:4}}>
                  {['⇱','⇲','✥','▭','◐','↻','⎌'].map((g,i)=><span key={i} className="btn icon sm">{g}</span>)}
                </div>
                <span className="pill" style={{background:'var(--ink)', color:'#fff'}}>GRAD-CAM ON</span>
                <span className="pill">SPLIT ▸ ORIGINAL / EXPLAINED</span>
              </div>
            </div>

            <div className="grid-2" style={{gap:6}}>
              <div className="viewer">
                <span className="corner" style={{top:8, left:10}}>CT · axial 128</span>
                <span className="corner" style={{top:8, right:10}}>WW 350 / WL 40</span>
                <span className="corner" style={{bottom:8, left:10}}>P-00421 · ROJAS M</span>
                <span className="corner" style={{bottom:8, right:10}}>S-9921 · 2026-04-20</span>
                <div className="crosshair"></div>
              </div>
              <div className="viewer">
                <span className="corner" style={{top:8, left:10}}>GRAD-CAM · dl.resnet.v3</span>
                <span className="corner" style={{top:8, right:10}}>prob 0.87</span>
                <span className="corner" style={{bottom:8, right:10}}>overlay α 0.55</span>
                <div className="crosshair"></div>
                <div className="roi"></div>
                <div className="roi-lbl">ROI · 0.87</div>
              </div>
            </div>

            <div className="wire" style={{padding:6}}>
              <div className="row mono muted" style={{gap:3, overflow:'hidden'}}>
                <span className="pill">◀</span>
                {[119,120,121,122,123,124,125,126,127].map(n=><span key={n} className="pill">{n}</span>)}
                <span className="pill" style={{background:'var(--ink)', color:'#fff'}}>128</span>
                {[129,130,131,132].map(n=><span key={n} className="pill">{n}</span>)}
                <span className="pill">▶</span>
                <span className="spacer"></span>
                <span>slice 128 / 256 · 1.25 mm</span>
              </div>
            </div>
          </div>

          <div className="col">
            <div className="wire">
              <div className="mono muted mb">STUDY METADATA</div>
              <div className="mono">Modality · CT</div>
              <div className="mono">Manufacturer · SIEMENS</div>
              <div className="mono">KVP · 120 · mAs · 180</div>
              <div className="mono">Slice · 1.25 mm</div>
              <div className="mono">Series · 3 (axial/cor/sag)</div>
              <div className="mono">Uploaded · 2026-04-20 07:44</div>
              <div className="mono">By · Tech. Ruiz</div>
            </div>
            <div className="wire">
              <div className="mono muted mb">ANALYSIS</div>
              <div className="row"><span className="badge"><span className="d"></span>dl.resnet.v3</span><span className="badge ok"><span className="d"></span>DONE</span></div>
              <div className="hand big mt">0.87 <span className="mono muted" style={{fontSize:10}}>calibrated</span></div>
              <div className="hand-sm muted">Grad-CAM localizes to RLL consolidation</div>
              <div className="line dashed"></div>
              <div className="col">
                <span className="btn">↻ Re-run analysis</span>
                <span className="btn">✎ Add finding</span>
                <span className="btn primary">Generate risk report</span>
              </div>
            </div>
            <div className="wire">
              <div className="mono muted mb">VIEWER STATES</div>
              <div className="hand-sm">◉ Image available</div>
              <div className="hand-sm">◉ Loading…</div>
              <div className="hand-sm">◉ No image</div>
              <div className="hand-sm">◉ Storage unavailable</div>
              <div className="hand-sm">◉ Overlay active</div>
            </div>
          </div>
        </div>
      </Frame>
    </Screen>
  );
}
window.Imaging = Imaging;
