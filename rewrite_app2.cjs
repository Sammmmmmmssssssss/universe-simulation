const fs = require('fs');

const code = `import { useEffect, useState } from 'react';
import './engine.js';

export default function App() {
  const [simInitialized, setSimInitialized] = useState(false);
  const [started, setStarted] = useState(false);
  const [stats, setStats] = useState({ particles: 0, bodies: 0, stars: 0, age: '0' });
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [currentTool, setCurrentTool] = useState('place');
  const [milestones, setMilestones] = useState({ bigBang: false, star: false, life: false });
  const [unlockedElems, setUnlockedElems] = useState(['H', 'He']);
  const [selectedElem, setSelectedElem] = useState('H');
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setTimeout(() => {
      if (window.initSimulation && !simInitialized) {
        window.initSimulation();
        setSimInitialized(true);
      }
    }, 100);
  }, []);

  useEffect(() => {
    let idCounter = 0;
    const handleNotif = (e) => {
      const msg = e.detail.msg;
      setToast(msg);
      setLogs(p => [{ id: idCounter++, msg, time: new Date().toLocaleTimeString() }, ...p].slice(0, 50));
      setTimeout(() => setToast(null), 3000);
    };
    window.addEventListener('engine-notif', handleNotif);
    return () => window.removeEventListener('engine-notif', handleNotif);
  }, []);

  useEffect(() => {
    if (!simInitialized) return;
    const interval = setInterval(() => {
      if (window.sim) {
        setStats({
          particles: window.sim.particles.length,
          bodies: window.sim.bodies.filter(b => b.active).length,
          stars: window.sim.bodies.filter(b => b.active && typeof b.isStar === 'function' && b.isStar()).length,
          age: window.sim.formatAge ? window.sim.formatAge(window.sim.cosmicAge) : window.sim.cosmicAge.toFixed(0) + ' Yrs',
        });
        setPaused(window.sim.paused);
        setSpeed(window.sim.speedMult);
        setCurrentTool(window.sim.currentTool);
        
        setMilestones({
          bigBang: window.sim.cosmicAge > 0,
          star: window.sim.bodies.some(b => b.active && b.isStar && b.isStar()),
          life: window.sim.bodies.some(b => b.active && b.lifeDetected)
        });
        
        if (window.sim.unlockedElements) {
          setUnlockedElems(Array.from(window.sim.unlockedElements));
        }
        if (window.sim.selectedElem) setSelectedElem(window.sim.selectedElem);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [simInitialized]);

  const togglePause = () => window.sim && (window.sim.paused = !window.sim.paused, setPaused(window.sim.paused));
  const handleSpeed = (mult) => window.sim && (window.sim.speedMult = mult, setSpeed(mult));
  const handleTool = (t) => window.sim && window.sim.setTool && window.sim.setTool(t);

  const formatAge = (ageStr) => {
    const parts = ageStr.split(' ');
    if (parts.length === 2) return <>{parts[0]} <span style={{fontSize: '1rem'}}>{parts[1]}</span></>;
    return ageStr;
  };

  const elements = ['H', 'He', 'Li', 'Be', 'C', 'N', 'O', 'Ne', 'Mg', 'Si', 'S', 'Fe', 'Au', 'U'];
  const speeds = [100, 1000, 100000, 1000000];

  return (
    <>
      <canvas id="main-canvas" className={!started ? 'cursor-pointer' : 'cursor-crosshair'} onClick={(e) => {
        if (!started) {
          setStarted(true);
          if (window.sim && window.sim.triggerBigBang) window.sim.triggerBigBang(e.clientX, e.clientY);
        }
      }}></canvas>
      <canvas id="bio-canvas" style={{ display: 'none' }}></canvas>

      <div className="interface">
        <div className="top-left-panel">
            <div className="meta" style={{color: 'white', marginBottom: '0.5rem'}}>[ 001 ] Project : My World</div>
            <h1>Universal<br/>Evolution</h1>
        </div>

        {started && (
          <div className="time-controls">
              <button className={\`btn \${paused ? 'btn-active' : ''}\`} onClick={togglePause}>{paused ? 'RESUME' : 'PAUSE'}</button>
              {speeds.map(s => (
                <button key={s} className={\`btn \${speed === s ? 'btn-active' : ''}\`} onClick={() => handleSpeed(s)}>
                  {s >= 1000000 ? (s/1000000)+'Mx' : s >= 1000 ? (s/1000)+'kx' : s+'x'}
                </button>
              ))}
          </div>
        )}

        <div className="bottom-left-panel">
            <div style={{background: 'white', padding: '1.5rem', width: 'fit-content', border: '1px solid var(--ink)'}}>
                <div className="meta">Current Age</div>
                <div className="stat-val" style={{fontWeight: 700}}>{formatAge(stats.age)}</div>
            </div>
            
            <div style={{position: 'relative'}}>
              {showLogs && (
                <div style={{position: 'absolute', bottom: '100%', left: 0, marginBottom: '0.5rem', background: 'white', border: '1px solid var(--ink)', padding: '1rem', width: '300px', maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                  <div className="meta" style={{borderBottom: '1px solid var(--ink-faint)', paddingBottom: '0.5rem'}}>Event Logs</div>
                  {logs.length === 0 ? <div className="meta">No events yet</div> : logs.map(l => (
                    <div key={l.id} style={{fontSize: '0.75rem'}}>
                      <span className="meta" style={{marginRight: '0.5rem'}}>{l.time}</span>
                      {l.msg}
                    </div>
                  ))}
                </div>
              )}
              <button className="btn" style={{background: 'white', border: '1px solid var(--ink)', width: 'fit-content', fontSize: '0.6rem'}} onClick={() => setShowLogs(!showLogs)}>
                LOGS (V.120) {showLogs ? '↓' : '↑'}
              </button>
            </div>
        </div>

        {toast && (
          <div style={{position: 'absolute', top: '100px', left: '50%', transform: 'translateX(-50%)', background: 'white', border: '1px solid var(--ink)', padding: '0.75rem 1.5rem', fontSize: '0.8rem', fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}}>
            {toast}
          </div>
        )}

        {started && (
          <div className="right-panel">
              <section>
                  <div className="meta" style={{marginBottom: '1rem'}}>Cosmic Census</div>
                  <div className="stat-card">
                      <span className="meta">Particles</span>
                      <span className="stat-val">{stats.particles}</span>
                  </div>
                  <div className="stat-card">
                      <span className="meta">Bodies</span>
                      <span className="stat-val">{stats.bodies}</span>
                  </div>
                  <div className="stat-card">
                      <span className="meta">Stars</span>
                      <span className="stat-val" style={{color: '#eab308'}}>{stats.stars}</span>
                  </div>
              </section>

              <section>
                  <div className="meta" style={{marginBottom: '1rem'}}>Evolutionary Steps</div>
                  <div className="timeline">
                      <div className={\`event \${!milestones.bigBang ? 'dim' : ''}\`}>
                          <span className="meta">01 Big Bang</span>
                          <span className="meta">{milestones.bigBang ? 'Active' : 'Locked'}</span>
                      </div>
                      <div className={\`event \${!milestones.star ? 'dim' : ''}\`}>
                          <span className="meta">02 First Star</span>
                          <span className="meta">{milestones.star ? 'Active' : 'Locked'}</span>
                      </div>
                      <div className={\`event \${!milestones.life ? 'dim' : ''}\`}>
                          <span className="meta">03 Life</span>
                          <span className="meta">{milestones.life ? 'Active' : 'Locked'}</span>
                      </div>
                  </div>
              </section>

              <section>
                  <div className="meta" style={{marginBottom: '1rem'}}>Element Matrix</div>
                  <div className="element-grid">
                      {elements.filter(el => unlockedElems.includes(el) || elements.indexOf(el) < 6).map((el, i) => {
                        const isUnlocked = unlockedElems.includes(el);
                        return (
                          <div key={el} 
                               onClick={() => {
                                 if (isUnlocked && window.sim) {
                                    window.sim.selectedElem = el;
                                    setSelectedElem(el);
                                    if(window.document.getElementById('e_'+el)) window.document.getElementById('e_'+el).click();
                                 }
                               }}
                               className={\`element-item \${!isUnlocked ? 'opacity-30' : ''} \${selectedElem === el ? 'active' : ''}\`}
                               style={!isUnlocked ? { pointerEvents: 'none' } : {}}>
                              {el}
                          </div>
                        )
                      })}
                  </div>
              </section>

              <section>
                  <div className="meta" style={{marginBottom: '1rem'}}>Action Set</div>
                  <div className="creation-tools">
                      <div className={\`tool-btn \${currentTool === 'place' ? 'fill' : ''}\`} onClick={() => handleTool('place')}>PLACE</div>
                      <div className={\`tool-btn \${currentTool === 'nebula' ? 'fill' : ''}\`} onClick={() => handleTool('nebula')}>NEBULA</div>
                      <div className={\`tool-btn \${currentTool === 'velocity' ? 'fill' : ''}\`} onClick={() => handleTool('velocity')}>SPEED</div>
                      <div className={\`tool-btn \${currentTool === 'delete' ? 'fill' : ''}\`} onClick={() => handleTool('delete')}>DELETE</div>
                  </div>
                  
                  <div id="brush-controls" className={currentTool === 'nebula' ? 'mt-4' : 'hidden'}>
                     <div className="meta" style={{marginBottom: '0.5rem'}}>Brush Size</div>
                     <input type="range" id="brush-size" min="20" max="200" defaultValue="60" className="w-full mb-2" />
                     <div className="meta" style={{marginBottom: '0.5rem'}}>Count</div>
                     <input type="range" id="nebula-count" min="5" max="80" defaultValue="30" className="w-full mb-2" />
                     <div className="meta" style={{marginBottom: '0.5rem'}}>Spin</div>
                     <input type="range" id="spin-amount" min="0" max="10" step="0.1" defaultValue="5" className="w-full" />
                  </div>
              </section>
          </div>
        )}

        <div className={\`instruction \${started ? 'hidden' : ''}\`}>
            Select Hydrogen & click space to seed your first star...
        </div>
      </div>

      <div className="hidden">
         <div id="ui-overlay"></div>
         <div id="hud-fps"></div><div id="hud-particles"></div><div id="hud-bodies"></div><div id="hud-age"></div><div id="hud-stars"></div><div id="hud-planets"></div><div id="ms-bigbang"></div><div id="ms-star"></div><div id="ms-planet"></div><div id="ms-supernova"></div><div id="ms-life"></div><div id="sidebar"></div>
         <div id="detail-panel"><div id="dp-title"></div><div id="dp-content"></div></div>
         <div id="biosphere-overlay"><div id="bio-title"></div><div id="bio-back"></div><div id="bio-enter-btn"></div><div id="bio-age-display"></div><div id="bio-events"></div><div id="bio-atmo"></div></div>
         <div id="element-grid"></div><div id="progress-list"></div><button id="pause-btn"></button><button id="sound-btn"></button>
         <div id="tool-place"></div><div id="tool-nebula"></div><div id="tool-delete"></div><div id="tool-pan"></div>
         <div id="bio-tool-water"></div><div id="bio-tool-heat"></div><div id="bio-tool-cool"></div><div id="bio-tool-life"></div>
      </div>
    </>
  );
}`;
fs.writeFileSync('src/App.jsx', code);
