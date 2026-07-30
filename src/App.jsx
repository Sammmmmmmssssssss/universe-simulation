import React, { useEffect, useState } from 'react';
import './engine.js';
import { CosmicTimeline } from './engine/universe/timeline.js';
import { ELEMENTS } from './engine/chemistry/elements.js';
import { MOLECULES } from './engine/chemistry/molecules.js';
import { 
  Play, Pause, FastForward, Save, Download, RotateCcw, 
  Globe, Sun, Sparkles, Zap, Flame, Snowflake, Waves, 
  Dna, ShieldCheck, ShieldAlert, History, BookOpen, Activity, X, Compass, PlusCircle, Trash2
} from 'lucide-react';

export default function App() {
  const [simInitialized, setSimInitialized] = useState(false);
  const [started, setStarted] = useState(false);
  const [stats, setStats] = useState({ particles: 0, bodies: 0, stars: 0, planets: 0, age: 0 });
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [currentTool, setCurrentTool] = useState('place');
  const [milestones, setMilestones] = useState({ bigBang: false, star: false, planet: false, supernova: false, life: false, civ: false });
  const [unlockedElems, setUnlockedElems] = useState(['H', 'He']);
  const [selectedElem, setSelectedElem] = useState('H');
  const [selectedBody, setSelectedBody] = useState(null);
  
  // Biosphere (WorldBox) State
  const [inBiosphere, setInBiosphere] = useState(false);
  const [bioPlanet, setBioPlanet] = useState(null);
  const [bioTool, setBioTool] = useState('water');
  
  // Modals & Logs
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showCodex, setShowCodex] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [toast, setToast] = useState(null);
  const [discoveredMols, setDiscoveredMols] = useState([]);

  // Initialize engine
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.initSimulation && !simInitialized) {
        window.initSimulation();
        setSimInitialized(true);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [simInitialized]);

  // Event listeners for Notifications & Timeline
  useEffect(() => {
    let idCounter = 0;
    const handleNotif = (e) => {
      const msg = e.detail ? e.detail.msg : (typeof e === 'string' ? e : 'Event triggered');
      setToast(msg);
      setLogs(prev => [{ id: idCounter++, msg, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
      setTimeout(() => setToast(null), 3500);
    };
    window.addEventListener('engine-notif', handleNotif);

    const handleTimeline = () => setTimelineEvents(CosmicTimeline.getHistory());
    window.addEventListener('timeline-event', handleTimeline);

    return () => {
      window.removeEventListener('engine-notif', handleNotif);
      window.removeEventListener('timeline-event', handleTimeline);
    };
  }, []);

  // Poll Engine State
  useEffect(() => {
    if (!simInitialized) return;
    const interval = setInterval(() => {
      const sim = window.sim;
      if (sim) {
        const bList = sim.bodies || [];
        setStats({
          particles: (sim.particles || []).length,
          bodies: bList.filter(b => b.active).length,
          stars: bList.filter(b => b.active && typeof b.isStar === 'function' && b.isStar()).length,
          planets: bList.filter(b => b.active && typeof b.isPlanet === 'function' && b.isPlanet()).length,
          age: sim.cosmicAge || 0,
        });

        setPaused(!!sim.paused);
        setSpeed(sim.speedMult || 1000);
        setCurrentTool(sim.currentTool || 'place');

        // Selected body inspection
        if (sim.selectedBody && sim.selectedBody.active) {
          setSelectedBody(sim.selectedBody);
        } else {
          setSelectedBody(null);
        }

        // Check Biosphere Overlay state
        const bioOverlay = document.getElementById('biosphere-overlay');
        const isBioOpen = bioOverlay && bioOverlay.style.display !== 'none' && bioOverlay.style.display !== '';
        setInBiosphere(isBioOpen);
        if (sim.bioPlanet) setBioPlanet(sim.bioPlanet);

        // Milestones
        setMilestones({
          bigBang: (sim.cosmicAge || 0) > 0,
          star: bList.some(b => b.active && b.isStar && b.isStar()),
          planet: bList.some(b => b.active && b.isPlanet && b.isPlanet()),
          supernova: bList.some(b => b.active && (b.type === 'neutron_star' || b.type === 'black_hole' || b.type === 'pulsar')),
          life: bList.some(b => b.active && b.lifeDetected),
          civ: bList.some(b => b.active && b.bioStage >= 5)
        });

        if (sim.unlockedElements) {
          setUnlockedElems(Array.from(sim.unlockedElements));
        }
        if (sim.selectedElem) setSelectedElem(sim.selectedElem);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [simInitialized]);

  // Actions
  const togglePause = () => {
    if (window.sim) {
      window.sim.paused = !window.sim.paused;
      setPaused(window.sim.paused);
    }
  };

  const handleSpeed = (mult) => {
    if (window.sim) {
      window.sim.speedMult = mult;
      setSpeed(mult);
    }
  };

  const handleTool = (t) => {
    if (window.sim && window.sim.setTool) {
      window.sim.setTool(t);
      setCurrentTool(t);
    }
  };

  const handleElementSelect = (sym) => {
    if (window.sim) {
      window.sim.selectedElem = sym;
      setSelectedElem(sym);
      const elBtn = document.getElementById('e_' + sym);
      if (elBtn) elBtn.click();
    }
  };

  const handleIgnite = () => {
    setStarted(true);
    if (window.sim && window.sim.triggerBigBang) {
      window.sim.triggerBigBang(window.innerWidth / 2, window.innerHeight / 2);
    }
  };

  const handleEnterBiosphere = (planet) => {
    if (window.sim) {
      window.sim.selectedBody = planet;
      if (window.sim.enterBiosphere) {
        window.sim.enterBiosphere();
      } else {
        const btn = document.getElementById('bio-enter-btn');
        if (btn) btn.click();
      }
      setInBiosphere(true);
    }
  };

  const handleExitBiosphere = () => {
    if (window.sim) {
      if (window.sim.exitBiosphere) {
        window.sim.exitBiosphere();
      } else {
        const btn = document.getElementById('bio-back');
        if (btn) btn.click();
      }
      setInBiosphere(false);
    }
  };

  const handleSaveState = () => {
    if (window.sim) {
      const state = {
        age: window.sim.cosmicAge,
        particles: window.sim.particles,
        bodies: window.sim.bodies.map(b => ({ ...b, _surface: null })),
        unlocked: Array.from(window.sim.unlockedElements || [])
      };
      localStorage.setItem('universe_save', JSON.stringify(state));
      setToast('🌌 Cosmic State Saved to Storage!');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleLoadState = () => {
    const saved = localStorage.getItem('universe_save');
    if (saved && window.sim) {
      try {
        const state = JSON.parse(saved);
        if (window.sim.restoreState) window.sim.restoreState(state);
        setToast('✨ Cosmic State Loaded Successfully!');
      } catch (_e) {
        setToast('❌ Failed to restore save.');
      }
      setTimeout(() => setToast(null), 3000);
    } else {
      setToast('⚠️ No save file found.');
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Format cosmic age helper
  const formatAgeText = (ageYears) => {
    if (!ageYears || ageYears === 0) return '0 Yrs';
    if (ageYears >= 1e9) return (ageYears / 1e9).toFixed(2) + ' Gyr';
    if (ageYears >= 1e6) return (ageYears / 1e6).toFixed(2) + ' Myr';
    if (ageYears >= 1e3) return (ageYears / 1e3).toFixed(1) + ' Kyr';
    return Math.round(ageYears) + ' Yrs';
  };

  const elemColors = {};
  ELEMENTS.forEach(e => elemColors[e.sym] = e.color);

  return (
    <>
      {/* Background Canvases */}
      <canvas id="main-canvas" className={!started ? 'cursor-pointer' : 'cursor-crosshair'}></canvas>
      <canvas id="bio-canvas" style={{ display: inBiosphere ? 'block' : 'none' }}></canvas>

      {/* Main UI Overlay */}
      <div className="interface">
        
        {/* Top-Left Logo & Title */}
        <div className="top-left-panel">
          <div className="meta" style={{ color: 'var(--cyan-accent)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={12} /> WorldBox Engine v2.0
          </div>
          <h1>Universal<br />Evolution</h1>
        </div>

        {/* Top Time & Speed Controls */}
        {started && !inBiosphere && (
          <div className="time-controls glass-panel">
            <button className={`btn ${paused ? 'btn-active' : ''}`} onClick={togglePause}>
              {paused ? <Play size={14} /> : <Pause size={14} />}
              {paused ? 'RESUME' : 'PAUSE'}
            </button>

            {[1, 1000, 100000, 1000000].map(s => (
              <button key={s} className={`btn ${speed === s ? 'btn-active' : ''}`} onClick={() => handleSpeed(s)}>
                {s >= 1000000 ? '1Mx' : s >= 1000 ? (s / 1000) + 'kx' : '1x'}
              </button>
            ))}

            <div style={{ width: '1px', height: '1.2rem', background: 'rgba(255,255,255,0.15)', margin: '0 0.2rem' }}></div>

            <button className="btn" onClick={handleSaveState} title="Save Cosmic State">
              <Save size={13} /> SAVE
            </button>
            <button className="btn" onClick={handleLoadState} title="Load Cosmic State">
              <Download size={13} /> LOAD
            </button>
          </div>
        )}

        {/* Left Dock: Tools & Element Matrix */}
        {started && !inBiosphere && (
          <div className="left-dock glass-panel">
            <div>
              <div className="meta" style={{ marginBottom: '0.6rem' }}>Creation Tools</div>
              <div className="creation-tools">
                <div className={`tool-btn ${currentTool === 'place' ? 'fill' : ''}`} onClick={() => handleTool('place')}>
                  <PlusCircle size={13} /> PLACE
                </div>
                <div className={`tool-btn ${currentTool === 'nebula' ? 'fill' : ''}`} onClick={() => handleTool('nebula')}>
                  <Sparkles size={13} /> NEBULA
                </div>
                <div className={`tool-btn ${currentTool === 'velocity' ? 'fill' : ''}`} onClick={() => handleTool('velocity')}>
                  <Compass size={13} /> VECTOR
                </div>
                <div className={`tool-btn ${currentTool === 'delete' ? 'fill' : ''}`} onClick={() => handleTool('delete')}>
                  <Trash2 size={13} /> ERASE
                </div>
              </div>

              {/* Nebula Controls */}
              {currentTool === 'nebula' && (
                <div style={{ marginTop: '0.8rem', padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div className="meta" style={{ fontSize: '0.55rem', marginBottom: '0.3rem' }}>Brush Size</div>
                  <input type="range" id="brush-size" min="20" max="200" defaultValue="60" className="w-full mb-2 accent-cyan-400" />
                  <div className="meta" style={{ fontSize: '0.55rem', marginBottom: '0.3rem' }}>Particle Density</div>
                  <input type="range" id="nebula-count" min="5" max="80" defaultValue="30" className="w-full mb-2 accent-cyan-400" />
                  <div className="meta" style={{ fontSize: '0.55rem', marginBottom: '0.3rem' }}>Spin Force</div>
                  <input type="range" id="spin-amount" min="0" max="10" step="0.1" defaultValue="5" className="w-full accent-cyan-400" />
                </div>
              )}
            </div>

            {/* Element Matrix */}
            <div>
              <div className="meta" style={{ marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Periodic Elements</span>
                <span style={{ color: 'var(--cyan-accent)' }}>Selected: {selectedElem}</span>
              </div>
              <div className="element-grid">
                {ELEMENTS.map((elObj) => {
                  const el = elObj.sym;
                  const isUnlocked = unlockedElems.includes(el) || ELEMENTS.indexOf(elObj) < 4;
                  const isActive = selectedElem === el;
                  return (
                    <div
                      key={el}
                      onClick={() => isUnlocked && handleElementSelect(el)}
                      className={`element-item ${!isUnlocked ? 'opacity-20 cursor-not-allowed' : ''} ${isActive ? 'active' : ''}`}
                      style={{
                        color: isActive ? '#040712' : (elemColors[el] || 'white'),
                        background: isActive ? (elemColors[el] || '#38bdf8') : 'rgba(255,255,255,0.05)',
                        borderColor: elemColors[el] || 'rgba(255,255,255,0.2)'
                      }}
                      title={elObj.name}
                    >
                      {el}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Right Dock: Cosmic Census & Selected Body Inspector */}
        {started && !inBiosphere && (
          <div className="right-panel glass-panel">
            {/* Cosmic Census */}
            <section>
              <div className="meta" style={{ marginBottom: '0.8rem' }}>Cosmic Census</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
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
                  <span className="stat-val" style={{ color: '#f59e0b' }}>{stats.stars}</span>
                </div>
                <div className="stat-card">
                  <span className="meta">Planets</span>
                  <span className="stat-val" style={{ color: '#34d399' }}>{stats.planets}</span>
                </div>
              </div>
            </section>

            {/* Selected Celestial Body Inspector Card */}
            {selectedBody && (
              <section className="glass-card" style={{ padding: '0.8rem', borderColor: 'var(--cyan-accent)' }}>
                <div className="meta" style={{ color: 'var(--cyan-accent)', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Celestial Inspector</span>
                  <span className="badge badge-active">{selectedBody.type ? selectedBody.type.replace('_', ' ') : 'Body'}</span>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', marginBottom: '0.4rem' }}>{selectedBody.name}</div>
                
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', marginBottom: '0.8rem' }}>
                  <div>Temp: <b style={{ color: 'white' }}>{Math.round(selectedBody.temp || 0)} K</b></div>
                  <div>Mass: <b style={{ color: 'white' }}>{Math.round(selectedBody.mass || 0)}</b></div>
                  {selectedBody.isPlanet && selectedBody.isPlanet() && (
                    <>
                      <div>Habitability: <b style={{ color: '#34d399' }}>{selectedBody.habitability || 0}%</b></div>
                      <div>Atmo: <b style={{ color: selectedBody.hasAtmosphere ? '#38bdf8' : '#64748b' }}>{selectedBody.hasAtmosphere ? 'Yes' : 'No'}</b></div>
                    </>
                  )}
                </div>

                {selectedBody.isPlanet && selectedBody.isPlanet() && (
                  <button
                    className="btn btn-active"
                    style={{ width: '100%', justifyContent: 'center', padding: '0.5rem' }}
                    onClick={() => handleEnterBiosphere(selectedBody)}
                  >
                    <Globe size={14} /> ENTER BIOSPHERE VIEW
                  </button>
                )}
              </section>
            )}

            {/* Evolutionary Steps Tracker */}
            <section>
              <div className="meta" style={{ marginBottom: '0.8rem' }}>Evolutionary Milestones</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div className={`stat-card ${!milestones.bigBang ? 'opacity-30' : ''}`}>
                  <span className="meta">01 Big Bang Ignition</span>
                  <span className={`badge ${milestones.bigBang ? 'badge-active' : ''}`}>{milestones.bigBang ? 'Active' : 'Locked'}</span>
                </div>
                <div className={`stat-card ${!milestones.star ? 'opacity-30' : ''}`}>
                  <span className="meta">02 First Star Ignited</span>
                  <span className={`badge ${milestones.star ? 'badge-active' : ''}`}>{milestones.star ? 'Active' : 'Locked'}</span>
                </div>
                <div className={`stat-card ${!milestones.planet ? 'opacity-30' : ''}`}>
                  <span className="meta">03 Planetary Accretion</span>
                  <span className={`badge ${milestones.planet ? 'badge-active' : ''}`}>{milestones.planet ? 'Active' : 'Locked'}</span>
                </div>
                <div className={`stat-card ${!milestones.supernova ? 'opacity-30' : ''}`}>
                  <span className="meta">04 Supernova & Heavy Metals</span>
                  <span className={`badge ${milestones.supernova ? 'badge-active' : ''}`}>{milestones.supernova ? 'Active' : 'Locked'}</span>
                </div>
                <div className={`stat-card ${!milestones.life ? 'opacity-30' : ''}`}>
                  <span className="meta">05 Abiogenesis & Life</span>
                  <span className={`badge ${milestones.life ? 'badge-active' : ''}`}>{milestones.life ? 'Active' : 'Locked'}</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Bottom Floating Bar */}
        {started && !inBiosphere && (
          <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.6rem', zIndex: 20 }}>
            <button className="btn glass-panel" onClick={() => setShowTimeline(!showTimeline)}>
              <History size={14} /> TIMELINE ({timelineEvents.length})
            </button>
            <button className="btn glass-panel" onClick={() => setShowLogs(!showLogs)}>
              <Activity size={14} /> LOGS ({logs.length})
            </button>
          </div>
        )}

        {/* Event Logs Drawer */}
        {showLogs && !inBiosphere && (
          <div className="glass-panel" style={{ position: 'absolute', bottom: '4.5rem', left: '50%', transform: 'translateX(-50%)', width: '380px', maxHeight: '250px', overflowY: 'auto', padding: '1rem', zIndex: 30 }}>
            <div className="meta" style={{ marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Cosmic Event Logs</span>
              <X size={14} className="cursor-pointer" onClick={() => setShowLogs(false)} />
            </div>
            {logs.length === 0 ? (
              <div className="meta" style={{ color: 'var(--text-dim)' }}>No events recorded yet.</div>
            ) : (
              logs.map(l => (
                <div key={l.id} style={{ fontSize: '0.75rem', marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.2rem' }}>
                  <span className="meta" style={{ marginRight: '0.5rem', color: 'var(--cyan-accent)' }}>{l.time}</span>
                  {l.msg}
                </div>
              ))
            )}
          </div>
        )}

        {/* Timeline Events Modal */}
        {showTimeline && !inBiosphere && (
          <div className="glass-panel" style={{ position: 'absolute', top: '5rem', left: '50%', transform: 'translateX(-50%)', width: '450px', maxHeight: '420px', overflowY: 'auto', padding: '1.2rem', zIndex: 30 }}>
            <div className="meta" style={{ marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
              <span>Cosmic History Timeline</span>
              <X size={14} className="cursor-pointer" onClick={() => setShowTimeline(false)} />
            </div>
            {timelineEvents.length === 0 ? (
              <div className="meta" style={{ color: 'var(--text-dim)' }}>No timeline events recorded yet.</div>
            ) : (
              timelineEvents.slice().reverse().map(ev => (
                <div key={ev.id || Math.random()} style={{ fontSize: '0.75rem', padding: '0.6rem', marginBottom: '0.4rem', borderLeft: `3px solid ${ev.color || '#38bdf8'}`, background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                  <div style={{ color: ev.color || '#38bdf8', fontWeight: 'bold' }}>[{ev.type || 'EVENT'}] {ev.source || ''}</div>
                  <div style={{ color: '#e2e8f0', marginTop: '0.2rem' }}>{ev.description}</div>
                  <div className="meta" style={{ marginTop: '0.3rem', fontSize: '0.55rem' }}>Age: {formatAgeText(ev.age)}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div className="glass-panel" style={{ position: 'absolute', top: '5rem', left: '50%', transform: 'translateX(-50%)', padding: '0.8rem 1.6rem', fontSize: '0.85rem', fontWeight: 700, color: 'white', borderColor: 'var(--cyan-accent)', boxShadow: '0 0 25px rgba(56, 189, 248, 0.4)', zIndex: 100 }}>
            {toast}
          </div>
        )}

        {/* Start Overlay Screen */}
        {!started && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(4, 7, 18, 0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, pointerEvents: 'auto' }}>
            <div style={{ textAlign: 'center', maxWidth: '600px', padding: '2rem' }}>
              <div className="meta" style={{ color: 'var(--cyan-accent)', letterSpacing: '0.2em', marginBottom: '1rem' }}>
                <Sparkles size={16} inline /> Interactive WorldBox Cosmic Engine
              </div>
              <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1 }}>Universal Evolution</h1>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
                A deterministic 2D universe & astrobiology simulation. Watch stars ignite, heavy metals seed from supernovae, molecules synthesize, and alien cellular automata evolve.
              </p>
              <button className="btn btn-active" style={{ fontSize: '1.1rem', padding: '0.9rem 2.2rem', margin: '0 auto' }} onClick={handleIgnite}>
                <Zap size={18} /> IGNITE BIG BANG
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 🪐 LAYER 2: WORLDBOX PLANETARY BIOSPHERE OVERLAY */}
      {inBiosphere && (
        <div className="worldbox-overlay">
          {/* Top Planet Stats Banner */}
          <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="meta" style={{ color: 'var(--emerald-accent)' }}>WorldBox Layer 2: Biosphere</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>{bioPlanet ? bioPlanet.name : 'Target Planet'}</div>
            </div>

            {bioPlanet && (
              <div style={{ display: 'flex', gap: '1.2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div>Temp: <b style={{ color: 'white' }}>{Math.round(bioPlanet.temp || 0)} K</b></div>
                <div>Atmo: <b style={{ color: 'white' }}>{(bioPlanet.atmosphericPressure || 0).toFixed(2)} atm</b></div>
                <div>Magnetosphere: <b style={{ color: bioPlanet.hasMagnetosphere ? '#34d399' : '#fb7185' }}>{bioPlanet.hasMagnetosphere ? 'ACTIVE SHIELD' : 'STRIPPED'}</b></div>
              </div>
            )}

            <button className="btn" style={{ borderColor: 'var(--rose-accent)', color: 'var(--rose-accent)' }} onClick={handleExitBiosphere}>
              <X size={14} /> EXIT TO COSMOS
            </button>
          </div>

          {/* WorldBox God-Mode Toolbar */}
          <div className="god-toolbar">
            <button className={`god-btn ${bioTool === 'water' ? 'active' : ''}`} onClick={() => setBioTool('water')}>
              <Waves size={14} /> OCEAN BRUSH
            </button>
            <button className={`god-btn ${bioTool === 'heat' ? 'active' : ''}`} onClick={() => setBioTool('heat')}>
              <Flame size={14} /> VOLCANO / HEAT
            </button>
            <button className={`god-btn ${bioTool === 'cool' ? 'active' : ''}`} onClick={() => setBioTool('cool')}>
              <Snowflake size={14} /> CRYO / COOL
            </button>
            <button className={`god-btn ${bioTool === 'life' ? 'active' : ''}`} onClick={() => setBioTool('life')}>
              <Dna size={14} /> SPAWN LIFE
            </button>
          </div>
        </div>
      )}
    </>
  );
}