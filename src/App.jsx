import { useState, useEffect } from 'react';
import { ClientPortal } from './components/client/Portal.jsx';
import { TeacherPortal } from './components/teacher/Portal.jsx';
import { AdminPortal } from './components/admin/Portal.jsx';
import { Icon } from './components/shared/index.jsx';
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle } from './components/TweaksPanel.jsx';

const TWEAK_DEFAULTS = {
  accent: '#c79b8e',
  calm: false,
};

const PORTALS = [
  { id: 'client',  label: 'Client',  icon: 'smartphone' },
  { id: 'teacher', label: 'Teacher', icon: 'flower-2' },
  { id: 'admin',   label: 'Admin',   icon: 'layout-dashboard' },
];

const COMP = { client: ClientPortal, teacher: TeacherPortal, admin: AdminPortal };

// CLIENT_ONLY hides the Teacher/Admin switcher so friends only see the student
// portal. You can still reach the others by adding #teacher / #admin to the URL.
// Set to false to show all three tabs again.
const CLIENT_ONLY = true;

const readHash = () => {
  const h = (location.hash || '#client').replace('#', '').split('/')[0];
  return COMP[h] ? h : 'client';
};

function PortalSwitch({ portal, setPortal }) {
  return (
    <div className="pswitch">
      {PORTALS.map(p => (
        <button key={p.id} className={portal === p.id ? 'on' : ''} onClick={() => setPortal(p.id)}>
          <Icon n={p.icon} size={15} sw={1.8} color="currentColor" />
          <span className="plabel">{p.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [portal, setPortal] = useState(readHash);

  useEffect(() => {
    const on = () => setPortal(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = (id) => {
    location.hash = id;
    setPortal(id);
  };

  useEffect(() => {
    const hex = t.accent.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--accent-tint', `rgba(${r},${g},${b},0.15)`);
  }, [t.accent]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', !!t.calm);
  }, [t.calm]);

  const Portal = COMP[portal];

  return (
    <>
      <div id="chrome">
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <img src="assets/submark-brown-trim.png" alt=""
               style={{ height: 26, filter: 'brightness(0) invert(1)', opacity: .92 }} />
          <div className="hide-mobile" style={{ lineHeight: 1 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, color: 'var(--cream)' }}>Senses Pilates</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 8.5, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(245,239,234,.5)', marginTop: 2 }}>Body Strong · Mind Calm</div>
          </div>
        </div>
        {!CLIENT_ONLY && <PortalSwitch portal={portal} setPortal={go} />}
      </div>
      <div id="portal-root">
        <div key={portal} style={{ position: 'absolute', inset: 0 }}>
          <Portal />
        </div>
      </div>
      <TweaksPanel>
        <TweakSection label="Brand accent" />
        <TweakColor label="Accent" value={t.accent}
          options={['#8a9079', '#b9755b', '#c79b8e']}
          onChange={(v) => setTweak('accent', v)} />
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, color: 'var(--fg3)', padding: '2px 2px 6px', lineHeight: 1.5 }}>
          Sage · Clay terracotta · Dusty rose. The cream &amp; taupe base stays constant.
        </div>
        <TweakSection label="Feel" />
        <TweakToggle label="Calm (reduce motion)" value={t.calm} onChange={(v) => setTweak('calm', v)} />
      </TweaksPanel>
    </>
  );
}
