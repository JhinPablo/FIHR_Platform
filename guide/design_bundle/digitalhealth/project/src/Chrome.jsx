// Top navigation + screen wrapper shared by all routes
const { NavLink, Outlet } = ReactRouterDOM;

function TopBar(){
  const tabs = [
    ['/',             'Overview'],
    ['/auth',         'Access'],
    ['/dashboard',    'Dashboard'],
    ['/patients',     'Patients'],
    ['/patient/P-00421', 'Record'],
    ['/imaging',      'Imaging'],
    ['/ai',           'AI Inference'],
    ['/report',       'Risk Report'],
    ['/audit',        'Audit & Consent'],
    ['/components',   'Components'],
  ];
  return (
    <div className="topbar">
      <div className="brand">
        <span className="dot"/>Novena Health Systems
        <small>Clinical Platform · v0.1</small>
      </div>
      <div className="tabs">
        {tabs.map(([to, label]) => (
          <NavLink key={to} to={to} end={to==='/'}
            className={({isActive}) => isActive ? 'active' : ''}>
            {label}
          </NavLink>
        ))}
      </div>
      <div className="bar-meta">Staging · FHIR R4</div>
    </div>
  );
}

function Screen({ area, title, subtitle, legend, children }){
  return (
    <section className="screen">
      <div className="section-sub">{area} · <span>{subtitle}</span></div>
      <div className="section-title">{title}</div>
      {legend && (
        <div className="legend">{legend.map((l,i)=> <span key={i}>{l}</span>)}</div>
      )}
      <div className="hr-hand"/>
      {children}
    </section>
  );
}

function Frame({ num, title, note, children }){
  return (
    <div className="frame">
      <div className="frame-label">
        <span className="num">{num}</span> {title}
        {note && <span className="note">{note}</span>}
      </div>
      {children}
    </div>
  );
}

function Chrome(){
  return (
    <>
      <TopBar/>
      <div className="page">
        <Outlet/>
      </div>
      <Tweaks/>
    </>
  );
}

function Tweaks(){
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState(() => {
    try { return Object.assign(
      { density:'cozy', alert:'normal', role:'role-clinician', rough:'rough-off' },
      JSON.parse(localStorage.getItem('tweaks')||'{}')
    );} catch(e){ return { density:'cozy', alert:'normal', role:'role-clinician', rough:'rough-off' };}
  });

  React.useEffect(() => {
    document.body.classList.remove('compact','alert','role-clinician','role-admin','role-auditor','rough-on','rough-off');
    document.body.classList.add(state.role, state.rough);
    if (state.density==='compact') document.body.classList.add('compact');
    if (state.alert==='alert') document.body.classList.add('alert');
    try { localStorage.setItem('tweaks', JSON.stringify(state)); } catch(e){}
  }, [state]);

  React.useEffect(() => {
    const onMsg = (e) => {
      const d = e.data || {};
      if (d.type==='__activate_edit_mode') setOpen(true);
      if (d.type==='__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent && window.parent.postMessage({type:'__edit_mode_available'}, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const set = (g,v) => {
    setState(s => ({ ...s, [g]: v }));
    window.parent && window.parent.postMessage({type:'__edit_mode_set_keys', edits: {[g]: v}}, '*');
  };

  const Seg = ({ g, opts }) => (
    <div className="seg">
      {opts.map(([v,label]) =>
        <button key={v} className={state[g]===v?'on':''} onClick={()=>set(g,v)}>{label}</button>
      )}
    </div>
  );

  return (
    <div id="tweaks" className={open?'on':''}>
      <h4>Tweaks</h4>
      <div className="grp"><div className="k">Density</div>
        <Seg g="density" opts={[['compact','Compact'],['cozy','Cozy']]}/></div>
      <div className="grp"><div className="k">Dashboard mode</div>
        <Seg g="alert" opts={[['normal','Normal'],['alert','High-alert']]}/></div>
      <div className="grp"><div className="k">Role</div>
        <Seg g="role" opts={[['role-clinician','Clinician'],['role-admin','Admin'],['role-auditor','Auditor']]}/></div>
      <div className="grp"><div className="k">Sketch roughness</div>
        <Seg g="rough" opts={[['rough-off','Clean'],['rough-on','Rough']]}/></div>
    </div>
  );
}

Object.assign(window, { Chrome, TopBar, Screen, Frame, Tweaks });
