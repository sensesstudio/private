import { useState, useEffect, useRef } from 'react';
import { PhoneFrame, Sheet, Icon, Button, Avatar, Pill, Segmented, hkd, useLiveProgress, addReview, useFavs, toggleFav } from '../shared/index.jsx';
import { PACKAGES, BOOKINGS, CLIENTS, PROGRESS_LOG, GOALS, LOCATIONS, isTrial } from '../../data.js';
import { locName, teacherById } from '../../data.js';
import { useSlots, holdSlot, releaseSlot, bookSlot, slotById, holdSecondsLeft } from '../../slots.js';
import { saveClientProfile, isDeclarationComplete, getClientProfile, useClientStore, intakeStatus, recordPayment, setClientCredits } from '../../clientStore.js';
import { useStudios } from '../../supabase/useReference.js';
import { isSupabaseConfigured } from '../../supabase/client.js';
import * as db from '../../supabase/queries.js';
import { signOut } from '../../supabase/auth.js';
import { startCheckout } from '../../supabase/checkout.js';
import { WAIVER_SECTIONS, WAIVER_TITLE } from '../../waiver.js';
import { inputStyle, sheetTitle, linkBtn, labelMini, backLink } from '../../styles.js';
import { ClientBrowse } from './Browse.jsx';
import { ClientNav, ClientLogin, Intake } from './ClientCore.jsx';
import { ClientHome, ClientSearch, TeacherDetail, EmptyState, sortByMatch } from './ClientDetail.jsx';
import { MatchBadge } from '../shared/index.jsx';

function PayOption({ id, method, setMethod, icon, label, note }) {
  const on = method === id;
  return (
    <button className="tap" onClick={() => setMethod(id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 13, padding: '14px 15px', borderRadius: 15, minHeight: 58, background: on ? 'var(--accent-tint)' : 'var(--ivory)', border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--border)') }}>
      <Icon n={icon} size={22} color="var(--espresso)" />
      <span style={{ flex: 1, textAlign: 'left' }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--espresso)' }}>{label}</span>
        <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--fg3)' }}>{note}</span>
      </span>
      <span style={{ width: 20, height: 20, flex: 'none', borderRadius: '50%', border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--linen)'), background: on ? 'var(--accent)' : 'transparent', display: 'grid', placeItems: 'center' }}>{on && <Icon n="check" size={12} color="#fff" sw={3} />}</span>
    </button>
  );
}

function BookingFlow({ t, day, slot, credits = 0, purchased = [], onClose, onConfirmed, declarationOk = true, onCompleteDeclaration, waiverOk = true, onSignWaiver }) {
  useSlots(); // re-render as the held slot's state changes
  const ready = declarationOk && waiverOk;
  const [stage, setStage] = useState('review');
  const [pkg, setPkg] = useState('p11-10');
  const [method, setMethod] = useState('apple');
  const [editCard, setEditCard] = useState(false); // show new-card fields only on request
  const [format, setFormat] = useState('1:1');
  const [mode, setMode] = useState(credits > 0 ? 'credit' : 'buy');
  const [, tick] = useState(0);
  const bookedRef = useRef(false);

  // Switching format swaps the package list, so re-pick a sensible default
  // within the new format (the popular pack, else the first).
  const pickFormat = (f) => {
    setFormat(f);
    const def = PACKAGES.find(p => p.format === f && p.popular) || PACKAGES.find(p => p.format === f);
    if (def) setPkg(def.id);
  };

  // Hold the slot for 10 minutes while the client decides; release it if they
  // back out before booking.
  useEffect(() => {
    if (slot) holdSlot(slot.id);
    return () => { if (slot && !bookedRef.current) releaseSlot(slot.id); };
  }, [slot ? slot.id : null]);

  // Tick once a second so the hold countdown re-renders.
  useEffect(() => {
    const i = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const held = holdSecondsLeft(slot ? (slotById(slot.id) || slot) : null);
  const slotTime = slot ? slot.time : '—';
  const dayLabel = day ? `${day.dow} ${day.dom} June` : '';
  const selectedPkg = PACKAGES.find(p => p.id === pkg);
  const amount = selectedPkg.price;
  const fmtLabel = format === '1:1' ? 'Private · 1-on-1' : 'Semi-private · 1-on-2';
  const addCredits = typeof selectedPkg.credits === 'number' ? selectedPkg.credits : 30;
  const usedCredit = mode === 'credit';
  const mmss = `${Math.floor(held / 60)}:${String(held % 60).padStart(2, '0')}`;

  const book = () => { if (slot) { bookSlot(slot.id); bookedRef.current = true; } };
  // Payment is allowed without the declaration, but the booking only confirms
  // once the health declaration is complete.
  const pay = () => { setStage('processing'); setTimeout(() => { if (ready) { book(); setStage('done'); } else { setStage('declare'); } }, 1900); };
  const confirmCredit = () => { if (!ready) return; setStage('processing'); setTimeout(() => { book(); setStage('done'); }, 1400); };

  return (
    <div style={{ padding: '4px 22px 30px' }}>
      {(stage === 'review' || stage === 'pay') && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--accent-tint)', borderRadius: 999, padding: '9px 14px', marginBottom: 14, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, color: 'var(--accent)' }}>
          <Icon n="timer" size={14} color="var(--accent)" /> This slot is held for you · {mmss}
        </div>
      )}

      {stage === 'review' && (
        <>
          <h2 style={sheetTitle}>Confirm your session</h2>
          {!ready && (
            <div style={{ background: 'rgba(185,117,91,.12)', border: '1px solid var(--terracotta)', borderRadius: 14, padding: '13px 14px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 12.5, color: 'var(--terracotta)', marginBottom: 7 }}><Icon n="shield-alert" size={15} color="var(--terracotta)" /> Required before booking</div>
              <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--espresso)', margin: '0 0 10px', lineHeight: 1.5 }}>Please complete the following before confirming this session. You can still pay for a package now.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!declarationOk && <Button variant="dark" full onClick={onCompleteDeclaration} iconRight="arrow-right">Complete health declaration</Button>}
                {!waiverOk && <Button variant="dark" full onClick={onSignWaiver} iconRight="arrow-right">Read &amp; sign liability waiver</Button>}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 13, alignItems: 'center', background: 'var(--ivory)', borderRadius: 18, padding: 14, border: '1px solid var(--border-soft)', marginBottom: 16 }}>
            <Avatar t={t} size={54} radius={14} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: 'var(--espresso)' }}>{t.name}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--taupe)' }}>{t.headline}</div>
            </div>
            <MatchBadge pct={t.match} />
          </div>
          <div style={labelMini}>Session format</div>
          <div style={{ display: 'flex', gap: 9, margin: '10px 0 16px' }}>
            {[['1:1', 'users', 'Private', '1-on-1'], ['1:2', 'users-round', 'Semi-private', '1-on-2']].map(([f, ic, a, b]) => {
              const on = format === f;
              return (
                <button key={f} className="tap" onClick={() => pickFormat(f)} style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderRadius: 15, background: on ? 'var(--accent-tint)' : 'var(--ivory)', border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--border)') }}>
                  <Icon n={ic} size={19} color={on ? 'var(--accent)' : 'var(--taupe)'} />
                  <span style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13, color: 'var(--espresso)' }}>{a}</span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, color: 'var(--fg3)' }}>{b}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--ivory)', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border-soft)', marginBottom: 18 }}>
            {[['calendar', 'Date', dayLabel || 'Tomorrow'], ['clock', 'Time', `${slotTime} · 60 min`], ['map-pin', 'Studio', locName(t.locId)], ['users', 'Format', fmtLabel]].map(([ic, k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border-soft)' }}>
                <Icon n={ic} size={17} color="var(--accent)" />
                <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, color: 'var(--fg3)' }}>{k}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--espresso)' }}>{v}</span>
              </div>
            ))}
          </div>
          {mode === 'credit' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, background: 'var(--accent-tint)', borderRadius: 16, padding: '15px 16px', marginBottom: 14 }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon n="ticket" size={20} color="#fff" /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: 'var(--espresso)' }}>{credits} credits available</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--taupe)' }}>This session uses 1 credit · {Math.max(0, credits - 1)} will remain</div>
                </div>
              </div>
              <Button variant="accent" full size="lg" disabled={!ready} onClick={confirmCredit} iconRight="arrow-right">Confirm with 1 credit</Button>
              <button className="tap" onClick={() => setMode('buy')} style={linkBtn}>Buy a package instead</button>
            </>
          ) : (
            <>
              <div style={labelMini}>{credits > 0 ? 'Top up with a package' : 'Choose a package to begin'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, margin: '10px 0 14px' }}>
                {PACKAGES.filter(p => p.format === format && !(isTrial(p.id) && purchased.includes(p.id))).map(p => {
                  const on = pkg === p.id;
                  return (
                    <button key={p.id} className="tap" onClick={() => setPkg(p.id)} style={{ cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderRadius: 15, minHeight: 56, background: on ? 'var(--accent-tint)' : 'var(--ivory)', border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--border)') }}>
                      <span style={{ width: 20, height: 20, flex: 'none', borderRadius: '50%', border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--linen)'), background: on ? 'var(--accent)' : 'transparent', display: 'grid', placeItems: 'center' }}>{on && <Icon n="check" size={12} color="#fff" sw={3} />}</span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, color: 'var(--espresso)' }}>{p.name}</span>
                          {p.tag && <Pill color={p.popular ? '#fff' : 'var(--accent)'} bg={p.popular ? 'var(--accent)' : 'var(--accent-tint)'} style={{ fontSize: 8.5, padding: '3px 8px' }}>{p.tag}</Pill>}
                        </span>
                        <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--fg3)', marginTop: 2 }}>{p.blurb}</span>
                      </span>
                      <span style={{ textAlign: 'right', flex: 'none' }}>
                        <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: 'var(--espresso)' }}>{hkd(p.price)}</span>
                        {p.per && <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 10.5, color: 'var(--fg3)' }}>{hkd(p.per)}/session</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <Button variant="accent" full size="lg" onClick={() => setStage('pay')} iconRight="arrow-right">Continue to payment · {hkd(amount)}</Button>
              {credits > 0 && <button className="tap" onClick={() => setMode('credit')} style={linkBtn}>Use 1 credit instead</button>}
            </>
          )}
        </>
      )}

      {stage === 'pay' && (
        <>
          <button className="tap" onClick={() => setStage('review')} style={{ ...backLink, marginBottom: 6 }}><Icon n="arrow-left" size={15} /> Back</button>
          <h2 style={sheetTitle}>Payment</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--espresso)', color: 'var(--cream)', borderRadius: 16, padding: '16px 18px', marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, opacity: .8 }}>{selectedPkg.name}{!isTrial(pkg) && ` · ${selectedPkg.credits} credits`}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, opacity: .6, marginTop: 2 }}>{t.name} · {dayLabel} · {slotTime}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 26, color: 'var(--blush)' }}>{hkd(amount)}</div>
          </div>
          <div style={labelMini}>Payment method</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, margin: '10px 0 16px' }}>
            <PayOption id="apple" method={method} setMethod={setMethod} icon="apple" label="Apple Pay" note="Face ID · ···· 4291" />
            <PayOption id="card" method={method} setMethod={setMethod} icon="credit-card" label="Credit / debit card" note="Visa ···· 8842" />
          </div>
          {method === 'card' && (
            editCard ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
                <input placeholder="Card number" style={inputStyle} />
                <div style={{ display: 'flex', gap: 9 }}>
                  <input placeholder="MM / YY" style={inputStyle} />
                  <input placeholder="CVC" style={inputStyle} />
                </div>
                <button className="tap" onClick={() => setEditCard(false)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12.5, color: 'var(--taupe)' }}>Use saved card (Visa ···· 8842)</button>
              </div>
            ) : (
              <button className="tap" onClick={() => setEditCard(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 12.5, color: 'var(--accent)' }}><Icon n="credit-card" size={14} color="var(--accent)" /> Change credit card</button>
            )
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 14, fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)' }}>
            <Icon n="lock" size={13} color="var(--fg3)" /> Secured by Stripe · cancel free up to 24h before
          </div>
          <Button variant="dark" full size="lg" onClick={pay} icon={method === 'apple' ? 'apple' : 'lock'}>{`Pay ${hkd(amount)}`}</Button>
        </>
      )}

      {stage === 'processing' && (
        <div style={{ textAlign: 'center', padding: '50px 0 40px' }}>
          <div className="spin-slow" style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid var(--sand)', borderTopColor: 'var(--accent)', margin: '0 auto 22px' }} />
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 20, color: 'var(--espresso)' }}>Processing payment…</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, color: 'var(--fg3)', marginTop: 6 }}>One breath. Almost there.</div>
        </div>
      )}

      {stage === 'declare' && (
        <div style={{ textAlign: 'center', padding: '24px 0 14px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-tint)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}><Icon n="shield-alert" size={30} color="var(--accent)" /></div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 24, color: 'var(--espresso)', margin: '0 0 8px' }}>One more step</h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 14, color: 'var(--taupe)', margin: '0 0 22px', lineHeight: 1.5 }}>Your payment went through. Complete the following to confirm your session — it keeps you safe on the mat.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!declarationOk && <Button variant="accent" full size="lg" onClick={onCompleteDeclaration} iconRight="arrow-right">Complete health declaration</Button>}
            {!waiverOk && <Button variant="accent" full size="lg" onClick={onSignWaiver} iconRight="arrow-right">Read &amp; sign liability waiver</Button>}
          </div>
          <button className="tap" onClick={onClose} style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--taupe)' }}>Later</button>
        </div>
      )}

      {stage === 'done' && (
        <div style={{ textAlign: 'center', padding: '24px 0 14px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}><Icon n="check" size={36} color="#fff" sw={2.6} /></div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}><Icon n={usedCredit ? 'ticket' : 'zap'} size={13} color="var(--accent)" /> {usedCredit ? '1 credit used' : 'Confirmed instantly'}</span>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 28, color: 'var(--espresso)', margin: '0 0 8px' }}>You're booked</h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 14.5, color: 'var(--taupe)', margin: '0 0 4px', lineHeight: 1.5 }}>{t.name} · {fmtLabel} · {dayLabel} · {slotTime}</p>
          <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, color: 'var(--fg3)', margin: '0 0 26px' }}>{locName(t.locId)} studio · {usedCredit ? `${Math.max(0, credits - 1)} credits remaining.` : 'pack added to your account.'} Calendar invite sent to your email.</p>
          <Button variant="accent" full size="lg" onClick={() => onConfirmed({ t, dayLabel, slotTime, fmtLabel, usedCredit, addCredits, pkgName: selectedPkg.name, amount })}>View my bookings</Button>
          <button className="tap" onClick={onClose} style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--taupe)' }}>Done</button>
        </div>
      )}
    </div>
  );
}

function ClientBookings({ extra, onRate, live }) {
  const [tab, setTab] = useState('Upcoming');
  const [showLog, setShowLog] = useState(false);
  const mine = live ? [] : BOOKINGS.filter(b => b.cId === 'c1'); // real users have only their own (real) bookings
  const upcoming = [...(extra || []), ...mine.filter(b => b.status === 'confirmed').map(toCard)];
  const past = mine.filter(b => b.status !== 'confirmed').map(toCard);
  const list = tab === 'Upcoming' ? upcoming : past;

  function toCard(b) { const t = teacherById(b.tId); return { id: b.id, t, dayLabel: fmtDate(b.date), slotTime: b.time, status: b.status }; }
  function fmtDate(s) { const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('en-HK', { weekday: 'short', day: 'numeric', month: 'short' }); }

  return (
    <div style={{ padding: '8px 20px 28px' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 30, color: 'var(--espresso)', margin: '6px 0 16px' }}>My bookings</h1>
      <Segmented options={['Upcoming', 'Past']} value={tab} onChange={setTab} style={{ marginBottom: 18, width: '100%', display: 'flex' }} />
      {tab === 'Past' && (
        <button className="tap" onClick={() => setShowLog(true)} style={{ width: '100%', marginBottom: 16, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--accent-tint)', border: '1px solid var(--accent)', borderRadius: 14, padding: '13px', minHeight: 48, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}><Icon n="clipboard-list" size={16} color="var(--accent)" /> See your progress log</button>
      )}
      {list.length === 0 ? (
        <EmptyState icon="calendar-x" title={tab === 'Upcoming' ? 'Nothing booked yet' : 'No past sessions'} body={tab === 'Upcoming' ? 'When you book a private session it will appear here, ready when you are.' : 'Your completed sessions will gather here over time.'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {list.map((b, i) => (
            <div key={b.id + i} style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--ivory)', borderRadius: 20, padding: 14, border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)' }}>
              <Avatar t={b.t} size={56} radius={15} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 17, color: 'var(--espresso)' }}>{b.t.name}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--taupe)', marginTop: 2 }}>{b.dayLabel} · {b.slotTime} · {locName(b.t.locId)}</div>
                {b.status === 'completed' && <button className="tap" onClick={() => onRate(b.t)} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-tint)', border: 'none', cursor: 'pointer', borderRadius: 999, padding: '7px 13px', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11.5, color: 'var(--accent)' }}><Icon n="star" size={13} color="var(--accent)" /> Rate session</button>}
              </div>
              {b.status === 'confirmed'
                ? <Pill color="var(--accent)" bg="var(--accent-tint)">Confirmed</Pill>
                : b.status === 'cancelled'
                ? <Pill color="var(--terracotta)" bg="rgba(185,117,91,.14)">Cancelled</Pill>
                : <Icon n="chevron-right" size={18} color="var(--clay)" />}
            </div>
          ))}
        </div>
      )}
      {showLog && <ProgressLog onClose={() => setShowLog(false)} />}
    </div>
  );
}

function RatingSheet({ t, onClose, clientName }) {
  const [n, setN] = useState(0);
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  const share = () => {
    addReview({ tId: t.id, cId: 'c1', clientName: clientName || 'A client', stars: n, text: text.trim() });
    setDone(true);
  };
  return (
    <div style={{ padding: '4px 24px 36px', textAlign: 'center' }}>
      {!done ? (
        <>
          <Avatar t={t} size={68} radius={18} style={{ margin: '6px auto 14px' }} />
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 23, color: 'var(--espresso)', margin: '0 0 6px' }}>How was your session with {t.name.split(' ')[0]}?</h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13.5, color: 'var(--fg3)', margin: '0 0 20px' }}>Your reflection helps others find their match.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 22 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <button key={i} className="tap" onClick={() => setN(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <Icon n="star" size={36} color={i <= n ? 'var(--accent)' : 'var(--linen)'} sw={0} style={{ fill: i <= n ? 'var(--accent)' : 'var(--linen)' }} />
              </button>
            ))}
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Add a few words (optional)" style={{ ...inputStyle, minHeight: 88, resize: 'none' }} />
          <Button variant="accent" full size="lg" disabled={n === 0} onClick={share} style={{ marginTop: 14 }}>Share reflection</Button>
        </>
      ) : (
        <div style={{ padding: '30px 0 10px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}><Icon n="heart" size={30} color="#fff" /></div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 24, color: 'var(--espresso)', margin: '0 0 8px' }}>Thank you</h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 14, color: 'var(--taupe)', margin: '0 0 22px' }}>Your reflection has been shared.</p>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      )}
    </div>
  );
}

function ProgressLog({ onClose }) {
  const live = useLiveProgress('c1');
  const merged = [...live, ...PROGRESS_LOG];
  const totalN = merged.length;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', padding: '14px 18px 10px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-soft)' }}>
        <button className="tap" onClick={onClose} style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--ivory)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none' }}><Icon n="arrow-left" size={18} color="var(--espresso)" /></button>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 19, color: 'var(--espresso)', lineHeight: 1 }}>Progress log</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)', marginTop: 3 }}>{merged.length} sessions · notes from your instructors</div>
        </div>
      </div>
      <div className="screen-scroll" style={{ flex: 1, minHeight: 0, padding: '16px 18px 28px' }}>
        <div style={{ position: 'relative', paddingLeft: 26 }}>
          <div style={{ position: 'absolute', left: 9, top: 6, bottom: 6, width: 2, background: 'var(--border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {merged.map((p, idx) => {
              const t = teacherById(p.tId);
              const num = totalN - idx;
              const isNew = !!p.id && p.id.startsWith('live');
              return (
                <div key={p.id} style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: -26, top: 18, width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', border: '3px solid var(--cream)', display: 'grid', placeItems: 'center' }}><span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 8, color: '#fff' }}>{num}</span></span>
                  <div style={{ background: 'var(--ivory)', borderRadius: 18, border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)', padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', whiteSpace: 'nowrap' }}>Session {num}</span>
                        {isNew && <Pill color="#fff" bg="var(--accent)" style={{ fontSize: 8, padding: '2px 7px' }}>New</Pill>}
                      </span>
                      <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)', whiteSpace: 'nowrap', flex: 'none' }}>{new Date(p.date + 'T00:00:00').toLocaleDateString('en-HK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    {p.focus && <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: 'var(--espresso)', lineHeight: 1.25, margin: '0 0 12px' }}>{p.focus}</div>}
                    <div style={{ background: 'var(--cream)', borderRadius: 12, padding: '11px 13px', marginBottom: 10 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg3)', marginBottom: 5 }}>Session notes</div>
                      <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, lineHeight: 1.55, color: 'var(--espresso)', margin: 0 }}>{p.note}</p>
                    </div>
                    {p.posture && (
                      <div style={{ background: 'var(--cream)', borderRadius: 12, padding: '11px 13px', marginBottom: 12 }}>
                        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg3)', marginBottom: 5 }}>Posture record</div>
                        <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, lineHeight: 1.55, color: 'var(--espresso)', margin: 0 }}>{p.posture}</p>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Avatar t={t} size={26} radius={8} />
                      <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 12, color: 'var(--taupe)' }}>{t.name} · {locName(t.locId)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const PAYMENTS = [
  { id: 'pay3', date: '2026-05-02', desc: '10-class pack', credits: 10, amount: 9000, method: 'Visa ···· 8842' },
  { id: 'pay2', date: '2026-01-15', desc: '5-class pack', credits: 5, amount: 4750, method: 'Apple Pay' },
  { id: 'pay1', date: '2024-01-10', desc: 'First session', credits: 1, amount: 900, method: 'Visa ···· 8842' },
];

function PaymentPackages({ onClose, credits = 7 }) {
  useClientStore();
  const prof = getClientProfile('c1') || {};
  const liveCredits = typeof prof.credits === 'number' ? prof.credits : credits;
  const payments = [...(prof.payments || []), ...PAYMENTS];
  const total = 10;
  const pct = Math.min(100, Math.round((liveCredits / total) * 100));
  const fmtDate = s => new Date(s + 'T00:00:00').toLocaleDateString('en-HK', { day: 'numeric', month: 'short', year: 'numeric' });
  const sectionLabel = { fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg3)', margin: '22px 0 10px' };
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', padding: '14px 18px 10px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-soft)' }}>
        <button className="tap" onClick={onClose} style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--ivory)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none' }}><Icon n="arrow-left" size={18} color="var(--espresso)" /></button>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 19, color: 'var(--espresso)', lineHeight: 1 }}>Payment &amp; packages</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)', marginTop: 3 }}>Credits, card on file &amp; receipts</div>
        </div>
      </div>
      <div className="screen-scroll" style={{ flex: 1, minHeight: 0, padding: '6px 18px 28px' }}>
        <div style={sectionLabel}>Active package</div>
        <div style={{ borderRadius: 20, background: 'var(--espresso)', color: 'var(--cream)', padding: '20px 20px 18px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--blush)' }}>10-class pack · credits</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '12px 0 2px' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 36, lineHeight: 1 }}>{liveCredits}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, opacity: .8 }}>of {total} credits remaining</span>
          </div>
          <div style={{ height: 6, background: 'rgba(250,247,243,.2)', borderRadius: 999, overflow: 'hidden', margin: '12px 0 4px' }}>
            <div style={{ width: pct + '%', height: '100%', background: 'var(--accent)', borderRadius: 999 }} />
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, opacity: .7 }}>Valid through Dec 2026 · use at any studio</div>
        </div>

        <div style={sectionLabel}>Payment method</div>
        <div style={{ background: 'var(--ivory)', borderRadius: 18, border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <span style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--sand)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon n="credit-card" size={20} color="var(--espresso)" /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--espresso)' }}>Visa ···· 8842</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--fg3)' }}>Expires 09 / 27</div>
            </div>
            <button className="tap" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 12, color: 'var(--accent)', flex: 'none' }}>Update</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 13, paddingTop: 13, borderTop: '1px solid var(--border-soft)', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)' }}>
            <Icon n="lock" size={13} color="var(--accent)" /> Card stored securely by Stripe — we never see your full number.
          </div>
        </div>

        <div style={sectionLabel}>Payment history</div>
        <div style={{ background: 'var(--ivory)', borderRadius: 18, border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          {payments.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: i < payments.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--espresso)' }}>{p.desc}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)', marginTop: 2 }}>{fmtDate(p.date)} · {p.method} · +{p.credits} credit{p.credits === 1 ? '' : 's'}</div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, color: 'var(--espresso)' }}>{hkd(p.amount)}</div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--accent)' }}><Icon n="check" size={10} color="var(--accent)" sw={3} /> Paid</span>
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, color: 'var(--fg3)', margin: '16px 0 0' }}>Receipts are emailed automatically · payments processed by Stripe</p>
      </div>
    </div>
  );
}

function WaiverSheet({ onClose, onSigned, signed }) {
  const [read, setRead] = useState(!!signed);
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState('');
  const onScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) setRead(true);
  };
  const today = new Date().toLocaleDateString('en-HK', { day: 'numeric', month: 'long', year: 'numeric' });
  const canSign = read && agreed && name.trim().length >= 2;
  const submit = () => { if (canSign) onSigned({ name: name.trim(), date: new Date().toISOString(), agreed: true }); };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 95, background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', padding: '14px 18px 10px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-soft)' }}>
        <button className="tap" onClick={onClose} style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--ivory)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none' }}><Icon n="arrow-left" size={18} color="var(--espresso)" /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: 'var(--espresso)', lineHeight: 1.1 }}>{WAIVER_TITLE}</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)', marginTop: 3 }}>Senses Studio · please read in full</div>
        </div>
      </div>

      {signed && (
        <div style={{ flex: 'none', margin: '12px 18px 0', display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(138,144,121,.14)', borderRadius: 12, padding: '11px 13px' }}>
          <Icon n="badge-check" size={18} color="var(--sage)" />
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 12.5, color: 'var(--espresso)' }}>Signed by <b>{signed.name}</b> on {new Date(signed.date).toLocaleDateString('en-HK', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      )}

      <div className="screen-scroll" onScroll={onScroll} style={{ flex: 1, minHeight: 0, padding: '14px 20px 22px' }}>
        {WAIVER_SECTIONS.map((s, i) => (
          <div key={i} style={{ marginBottom: 18 }}>
            {s.h && <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', margin: '0 0 8px' }}>{s.h}</div>}
            {(s.paras || []).map((p, j) => <p key={j} style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, lineHeight: 1.6, color: 'var(--espresso)', margin: '0 0 9px' }}>{p}</p>)}
            {(s.bullets || []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, margin: '2px 0 9px' }}>
                {s.bullets.map((b, j) => (
                  <div key={j} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ flex: 'none', width: 5, height: 5, borderRadius: 999, background: 'var(--accent)', marginTop: 7 }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, lineHeight: 1.55, color: 'var(--espresso)' }}>{b}</span>
                  </div>
                ))}
              </div>
            )}
            {s.after && <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, lineHeight: 1.6, color: 'var(--espresso)', margin: 0 }}>{s.after}</p>}
          </div>
        ))}
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11.5, color: read ? 'var(--sage)' : 'var(--fg3)', padding: '6px 0 2px' }}>
          {read ? '✓ You’ve reached the end of the waiver' : '↓ Scroll to the end to continue'}
        </div>
      </div>

      {!signed && (
        <div style={{ flex: 'none', borderTop: '1px solid var(--border)', background: 'var(--cream)', padding: '14px 20px calc(16px + env(safe-area-inset-bottom))', boxShadow: '0 -10px 20px -8px rgba(58,50,44,.12)' }}>
          <button className="tap" disabled={!read} onClick={() => read && setAgreed(a => !a)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: read ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'flex-start', gap: 11, opacity: read ? 1 : .5, marginBottom: 12 }}>
            <span style={{ width: 22, height: 22, flex: 'none', borderRadius: 6, border: '1.5px solid ' + (agreed ? 'var(--accent)' : 'var(--linen)'), background: agreed ? 'var(--accent)' : 'transparent', display: 'grid', placeItems: 'center', marginTop: 1 }}>{agreed && <Icon n="check" size={13} color="#fff" sw={3} />}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 12.5, lineHeight: 1.5, color: 'var(--espresso)' }}>I have carefully read, understood, and agree to this Waiver and Release of Liability, and I am signing it voluntarily.</span>
          </button>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Type your full legal name to sign" style={{ ...inputStyle, marginBottom: name.trim() ? 8 : 12 }} />
          {name.trim() && (
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, margin: '0 2px 12px', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              <span style={{ fontFamily: 'var(--font-script)', fontSize: 30, color: 'var(--espresso)', lineHeight: 1 }}>{name.trim()}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, color: 'var(--fg3)', flex: 'none' }}>{today}</span>
            </div>
          )}
          <Button variant="accent" full size="lg" disabled={!canSign} onClick={submit} iconRight="check">Agree &amp; sign</Button>
          {!canSign && <p style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11.5, color: 'var(--fg3)', margin: '9px 0 0' }}>{!read ? 'Scroll to the end, then tick and sign.' : !agreed ? 'Tick the box to agree.' : 'Type your full name to sign.'}</p>}
        </div>
      )}
    </div>
  );
}

function PrefToggle({ on, onChange }) {
  return (
    <button type="button" className="tap" onClick={onChange} aria-pressed={on} style={{ flex: 'none', width: 46, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 3, background: on ? 'var(--accent)' : 'var(--linen)', transition: 'background .2s' }}>
      <span style={{ display: 'block', width: 22, height: 22, borderRadius: 999, background: '#fff', boxShadow: 'var(--shadow-sm)', transform: on ? 'translateX(18px)' : 'translateX(0)', transition: 'transform .2s var(--ease)' }} />
    </button>
  );
}

const COUNTRY_CODES = [
  { code: '+852', flag: '🇭🇰' }, { code: '+86', flag: '🇨🇳' }, { code: '+853', flag: '🇲🇴' },
  { code: '+886', flag: '🇹🇼' }, { code: '+65', flag: '🇸🇬' }, { code: '+44', flag: '🇬🇧' },
  { code: '+1', flag: '🇺🇸' }, { code: '+61', flag: '🇦🇺' }, { code: '+81', flag: '🇯🇵' },
  { code: '+82', flag: '🇰🇷' }, { code: '+60', flag: '🇲🇾' }, { code: '+63', flag: '🇵🇭' },
  { code: '+66', flag: '🇹🇭' }, { code: '+91', flag: '🇮🇳' }, { code: '+971', flag: '🇦🇪' },
];

function PreferencesSheet({ onClose }) {
  const prof = getClientProfile('c1') || {};
  const [code, setCode] = useState(prof.phoneCode || '+852');
  const [num, setNum] = useState(prof.phoneNumber || '');
  const [email, setEmail] = useState(prof.email || '');
  const [channels, setChannels] = useState(prof.channels || { whatsapp: true, email: false });
  const [notify, setNotify] = useState(prof.notify || { reminders: true, availability: false, promos: false });
  const [saved, setSaved] = useState(false);
  const flip = k => setNotify(n => ({ ...n, [k]: !n[k] }));
  const flipCh = k => setChannels(c => ({ ...c, [k]: !c[k] }));
  const save = () => { saveClientProfile('c1', { phoneCode: code, phoneNumber: num, phone: `${code} ${num}`.trim(), email, channels, notify }); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  const rows = [
    ['reminders', 'Booking reminders', 'Confirmations and a nudge before each session'],
    ['availability', 'Class availability alerts', 'When a favourite instructor opens new slots'],
    ['promos', 'Promotions & news', 'Occasional offers and studio updates'],
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', padding: '14px 18px 10px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-soft)' }}>
        <button className="tap" onClick={onClose} style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--ivory)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none' }}><Icon n="arrow-left" size={18} color="var(--espresso)" /></button>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 19, color: 'var(--espresso)' }}>Preferences</div>
      </div>
      <div className="screen-scroll" style={{ flex: 1, minHeight: 0, padding: '18px 18px 28px' }}>
        <div style={labelMini}>Contact details</div>
        <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--fg3)', margin: '5px 0 12px' }}>So we can confirm bookings and reach you on WhatsApp.</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <select value={code} onChange={e => setCode(e.target.value)} style={{ ...inputStyle, width: 104, flex: 'none', paddingRight: 8, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' }}>
            {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
          </select>
          <input value={num} onChange={e => setNum(e.target.value)} type="tel" placeholder="9123 4567" style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
        </div>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email address" style={inputStyle} />

        <div style={{ ...labelMini, marginTop: 24 }}>Notify me by</div>
        <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--fg3)', margin: '5px 0 10px' }}>Choose one or both.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['whatsapp', 'message-circle', 'WhatsApp'], ['email', 'mail', 'Email']].map(([k, ic, label]) => {
            const on = !!channels[k];
            return (
              <button key={k} type="button" className="tap" onClick={() => flipCh(k)} style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderRadius: 14, background: on ? 'var(--accent-tint)' : 'var(--ivory)', border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--border)') }}>
                <Icon n={on ? 'check-circle-2' : ic} size={18} color={on ? 'var(--accent)' : 'var(--taupe)'} />
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 13.5, color: on ? 'var(--accent)' : 'var(--espresso)' }}>{label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ ...labelMini, marginTop: 24 }}>Notifications</div>
        <div style={{ background: 'var(--ivory)', borderRadius: 18, border: '1px solid var(--border-soft)', overflow: 'hidden', marginTop: 10 }}>
          {rows.map(([k, title, sub], i) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px', borderBottom: i < rows.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--espresso)' }}>{title}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--fg3)', marginTop: 2 }}>{sub}</div>
              </div>
              <PrefToggle on={!!notify[k]} onChange={() => flip(k)} />
            </div>
          ))}
        </div>

        <Button variant="accent" full size="lg" onClick={save} icon={saved ? 'check' : 'save'} style={{ marginTop: 22 }}>{saved ? 'Saved' : 'Save preferences'}</Button>
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, color: 'var(--fg3)', margin: '12px 0 0', lineHeight: 1.5 }}>We'll send reminders to your chosen channels.</p>
      </div>
    </div>
  );
}

function UpcomingSheet({ upcoming = [], onClose, onCancel, onReschedule }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', padding: '14px 18px 10px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-soft)' }}>
        <button className="tap" onClick={onClose} style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--ivory)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none' }}><Icon n="arrow-left" size={18} color="var(--espresso)" /></button>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 19, color: 'var(--espresso)', lineHeight: 1 }}>Upcoming bookings</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)', marginTop: 3 }}>{upcoming.length} booked</div>
        </div>
      </div>
      <div className="screen-scroll" style={{ flex: 1, minHeight: 0, padding: '16px 18px 28px' }}>
        {upcoming.length === 0 ? (
          <EmptyState icon="calendar-x" title="No upcoming bookings" body="When you book a private session it will appear here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {upcoming.map((b, idx) => (
              <div key={b.id + idx} style={{ background: 'var(--ivory)', border: '1px solid var(--border-soft)', borderRadius: 18, padding: 14, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <Avatar t={b.t} size={50} radius={14} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 17, color: 'var(--espresso)', lineHeight: 1.1 }}>{b.t.name}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--taupe)', marginTop: 2 }}>{b.dayLabel} · {b.slotTime} · {locName(b.t.locId)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
                  <button className="tap" onClick={() => onReschedule && onReschedule(b.t)} style={{ flex: 1, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--accent-tint)', border: '1px solid var(--accent)', borderRadius: 12, padding: '10px', minHeight: 42, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 12.5, color: 'var(--accent)' }}><Icon n="calendar-clock" size={14} color="var(--accent)" /> Reschedule</button>
                  <button className="tap" onClick={() => onCancel && onCancel(b.id)} style={{ flex: 1, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--ivory)', border: '1px solid var(--terracotta)', borderRadius: 12, padding: '10px', minHeight: 42, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 12.5, color: 'var(--terracotta)' }}><Icon n="x" size={14} color="var(--terracotta)" /> Cancel</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, color: 'var(--fg3)', margin: '16px 0 0', lineHeight: 1.5 }}>Free cancellation up to 24 hours before your session.</p>
      </div>
    </div>
  );
}

function SheetShell({ title, sub, onClose, children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', padding: '14px 18px 10px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-soft)' }}>
        <button className="tap" onClick={onClose} style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--ivory)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none' }}><Icon n="arrow-left" size={18} color="var(--espresso)" /></button>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 19, color: 'var(--espresso)', lineHeight: 1 }}>{title}</div>
          {sub && <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)', marginTop: 3 }}>{sub}</div>}
        </div>
      </div>
      <div className="screen-scroll" style={{ flex: 1, minHeight: 0, padding: '16px 18px 28px' }}>{children}</div>
    </div>
  );
}

function FavouritesSheet({ favTeachers = [], onClose, onOpen }) {
  return (
    <SheetShell title="Favourite teachers" sub={`${favTeachers.length} saved`} onClose={onClose}>
      {favTeachers.length === 0 ? (
        <EmptyState icon="heart" title="No favourites yet" body="Tap the heart on an instructor's profile to save them — we'll suggest them more on your Home." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {favTeachers.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 13, background: 'var(--ivory)', border: '1px solid var(--border-soft)', borderRadius: 16, padding: 12, boxShadow: 'var(--shadow-sm)' }}>
              <button className="tap" onClick={() => { onClose(); onOpen && onOpen(t); }} style={{ display: 'flex', alignItems: 'center', gap: 13, flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                <Avatar t={t} size={48} radius={13} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: 'var(--espresso)', lineHeight: 1.1 }}>{t.name}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--taupe)', marginTop: 2 }}>{t.headline}</div>
                </div>
              </button>
              <button className="tap" onClick={() => toggleFav(t.id)} aria-label="Remove favourite" style={{ flex: 'none', width: 38, height: 38, borderRadius: 999, background: 'var(--accent-tint)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon n="heart" size={17} color="var(--terracotta)" sw={0} style={{ fill: 'var(--terracotta)' }} /></button>
            </div>
          ))}
        </div>
      )}
    </SheetShell>
  );
}

function PastSessionsSheet({ past = [], onClose, onRate }) {
  return (
    <SheetShell title="Past sessions" sub={`${past.length} completed`} onClose={onClose}>
      {past.length === 0 ? (
        <EmptyState icon="clipboard-list" title="No past sessions" body="Your completed sessions will gather here over time." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {past.map((b, idx) => (
            <div key={b.id + idx} style={{ display: 'flex', alignItems: 'center', gap: 13, background: 'var(--ivory)', border: '1px solid var(--border-soft)', borderRadius: 16, padding: 13, boxShadow: 'var(--shadow-sm)' }}>
              <Avatar t={b.t} size={48} radius={13} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: 'var(--espresso)', lineHeight: 1.1 }}>{b.t.name}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--taupe)', marginTop: 2 }}>{b.dayLabel} · {b.slotTime} · {locName(b.t.locId)}</div>
              </div>
              <button className="tap" onClick={() => { onClose(); onRate && onRate(b.t); }} style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--accent-tint)', border: 'none', cursor: 'pointer', borderRadius: 999, padding: '8px 13px', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 11.5, color: 'var(--accent)' }}><Icon n="star" size={13} color="var(--accent)" /> Rate</button>
            </div>
          ))}
        </div>
      )}
    </SheetShell>
  );
}

function ClientProfile({ onRestart, answers, credits = 7, onWaiver, waiver, name, live, onAuth, upcoming = [], onCancelBooking, onReschedule, favTeachers = [], past = [], onOpen, onRate }) {
  const [showLog, setShowLog] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [showFavs, setShowFavs] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const displayName = live ? (name || 'Member') : 'Mara Whitfield';
  const initials = (live && name) ? name.split(/\s+/).map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() : 'MW';
  const memberLine = live ? 'New member' : 'Member since Jan 2024 · 28 sessions';
  const status = intakeStatus(answers);
  const aboutPill = status === 'completed'
    ? <Pill color="var(--sage)" bg="rgba(138,144,121,.16)">Completed</Pill>
    : status === 'partial'
    ? <Pill color="#9a7b3c" bg="rgba(201,178,124,.22)">Partially completed</Pill>
    : <Pill color="var(--terracotta)" bg="rgba(185,117,91,.14)">Not started</Pill>;
  const goalLabels = (answers.goals || []).map(g => (GOALS.find(x => x.id === g) || {}).label).filter(Boolean);
  const total = 10;
  const pct = Math.min(100, Math.round((credits / total) * 100));
  return (
    <div style={{ padding: '8px 20px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '6px 0 20px' }}>
        <Avatar t={{ initials, ph: 'almond' }} size={66} />
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 25, color: 'var(--espresso)', margin: 0 }}>{displayName}</h1>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--fg3)', marginTop: 3 }}>{memberLine}</div>
        </div>
      </div>

      <div style={{ borderRadius: 22, background: 'var(--espresso)', color: 'var(--cream)', padding: '22px 22px 20px', position: 'relative', overflow: 'hidden', marginBottom: 18 }}>
        <img src="assets/submark-black-trim.png" alt="" style={{ position: 'absolute', right: -14, top: -8, height: 110, filter: 'brightness(0) invert(1)', opacity: .1 }} />
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--blush)' }}>10-class pack · credits</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '12px 0 2px' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 38, color: 'var(--cream)', lineHeight: 1 }}>{credits}</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, opacity: .8 }}>credit{credits === 1 ? '' : 's'} remaining</span>
        </div>
        <div style={{ height: 6, background: 'rgba(250,247,243,.2)', borderRadius: 999, overflow: 'hidden', margin: '12px 0 4px' }}>
          <div style={{ width: pct + '%', height: '100%', background: 'var(--accent)', borderRadius: 999 }} />
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, opacity: .7 }}>Valid through Dec 2026 · use at any studio</div>
      </div>

      {upcoming.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...labelMini, marginBottom: 10 }}><Icon n="bell" size={12} color="var(--accent)" /> {upcoming.length > 1 ? 'Upcoming bookings' : 'Next booking'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.slice(0, 3).map((b, idx) => (
              <div key={b.id + idx} style={{ display: 'flex', alignItems: 'center', gap: 13, background: 'var(--ivory)', border: '1px solid var(--border-soft)', borderRadius: 18, padding: 14, boxShadow: 'var(--shadow-sm)' }}>
                <Avatar t={b.t} size={46} radius={13} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: 'var(--espresso)', lineHeight: 1.1 }}>{b.t.name}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--taupe)', marginTop: 2 }}>{b.dayLabel} · {b.slotTime} · {locName(b.t.locId)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {goalLabels.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={labelMini}>Your focus</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{goalLabels.map(g => <Pill key={g} color="var(--accent)" bg="var(--accent-tint)">{g}</Pill>)}</div>
        </div>
      )}

      <div style={{ background: 'var(--ivory)', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
        <button className="tap" onClick={onWaiver} style={{ width: '100%', textAlign: 'left', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', minHeight: 56, border: 'none', borderBottom: '1px solid var(--border-soft)' }}>
          <Icon n="shield-check" size={18} color="var(--accent)" />
          <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--accent)' }}>Liability waiver</span>
          {waiver && waiver.agreed
            ? <Pill color="var(--sage)" bg="rgba(138,144,121,.16)">Signed</Pill>
            : <Pill color="var(--terracotta)" bg="rgba(185,117,91,.14)">Required</Pill>}
        </button>
        {[['user-round', 'About me', onRestart, aboutPill], ['calendar-check', 'Upcoming bookings', () => setShowBookings(true), upcoming.length ? <Pill color="var(--accent)" bg="var(--accent-tint)">{upcoming.length}</Pill> : null], ['heart', 'Favourite teachers', () => setShowFavs(true), favTeachers.length ? <Pill color="var(--accent)" bg="var(--accent-tint)">{favTeachers.length}</Pill> : null], ['history', 'Past sessions', () => setShowPast(true), null], ['clipboard-list', 'Progress log', () => setShowLog(true), null], ['credit-card', 'Payment & packages', () => setShowPay(true), null], ['settings', 'Preferences', () => setShowPrefs(true), null], [live ? 'log-out' : 'log-in', live ? 'Sign out' : 'Sign in', onAuth, null]].map(([ic, l, fn, badge], i, a) => (
          <button key={l} className="tap" onClick={fn} style={{ width: '100%', textAlign: 'left', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', minHeight: 56, border: 'none', borderBottom: i < a.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
            <Icon n={ic} size={18} color={i <= 2 ? 'var(--accent)' : 'var(--taupe)'} />
            <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontWeight: i <= 2 ? 500 : 400, fontSize: 14, color: i <= 2 ? 'var(--accent)' : 'var(--espresso)' }}>{l}</span>
            {badge || <Icon n="chevron-right" size={16} color="var(--clay)" />}
          </button>
        ))}
      </div>
      {showLog && <ProgressLog onClose={() => setShowLog(false)} />}
      {showPay && <PaymentPackages onClose={() => setShowPay(false)} credits={credits} />}
      {showPrefs && <PreferencesSheet onClose={() => setShowPrefs(false)} />}
      {showBookings && <UpcomingSheet upcoming={upcoming} onClose={() => setShowBookings(false)} onCancel={onCancelBooking} onReschedule={t => { setShowBookings(false); onReschedule && onReschedule(t); }} />}
      {showFavs && <FavouritesSheet favTeachers={favTeachers} onClose={() => setShowFavs(false)} onOpen={onOpen} />}
      {showPast && <PastSessionsSheet past={past} onClose={() => setShowPast(false)} onRate={onRate} />}
    </div>
  );
}

function ClientLocations() {
  const { studios, live } = useStudios();
  return (
    <div style={{ padding: '8px 20px 28px' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 30, color: 'var(--espresso)', margin: '6px 0 4px' }}>Locations</h1>
      <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, color: 'var(--fg3)', margin: '0 0 4px' }}>Five studios across Hong Kong · your credits work at all of them.</p>
      <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--fg3)', margin: 0, lineHeight: 1.7 }}>全港五間工作室 · 套票通用。</p>
      {live && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-tint)', padding: '5px 11px', borderRadius: 999 }}>
          <span className="live-dot" /> Live from database
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        {studios.map(l => (
          <div key={l.id} style={{ background: 'var(--ivory)', borderRadius: 20, overflow: 'hidden', border: '1.5px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ height: 158, position: 'relative', background: 'linear-gradient(135deg, var(--blush), var(--sand))' }}>
              <img src={`assets/locations/${l.id}.jpg`} alt={l.name} loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--accent-tint)', flex: 'none' }}>
                <Icon n={l.sea ? 'waves' : 'map-pin'} size={19} color="var(--accent)" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 19, color: 'var(--espresso)', lineHeight: 1.1 }}>{l.name}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--taupe)', marginTop: 2 }}>{l.note}</div>
              </div>
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-soft)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Icon n="navigation" size={14} color="var(--fg3)" style={{ marginTop: 2, flex: 'none' }} />
              <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 13, color: 'var(--espresso)', lineHeight: 1.5 }}>{l.address}</span>
            </div>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Senses Studio ' + l.name + ', ' + l.address)}`}
               target="_blank" rel="noopener noreferrer" className="tap"
               style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, textDecoration: 'none', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 12, color: 'var(--accent)' }}>
              <Icon n="map-pin" size={14} color="var(--accent)" /> Google Map
            </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientPricing({ onBook, onBuy, purchased = [], live = false, onNeedAuth }) {
  const [buying, setBuying] = useState(null);
  const [fmt, setFmt] = useState('1:1');
  // Hide a trial once the customer has already bought it (one-time per format).
  const list = PACKAGES.filter(p => p.format === fmt && !(isTrial(p.id) && purchased.includes(p.id)));
  const buy = async (id) => {
    if (!live) { onNeedAuth?.(); return; } // guests: sign in before buying
    if (!onBuy) return;
    setBuying(id);
    const res = await onBuy(id);
    if (res && res.ok === false) { alert(res.error || 'Could not start checkout. Please try again.'); setBuying(null); }
  };
  return (
    <div style={{ padding: '8px 20px 28px' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 30, color: 'var(--espresso)', margin: '6px 0 4px' }}>Pricing</h1>
      <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, color: 'var(--fg3)', margin: '0 0 4px' }}>Private 1:1 &amp; semi-private 1:2 · prepaid class packs.</p>
      <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--fg3)', margin: 0, lineHeight: 1.7 }}>私人一對一及一對二課程 · 預付課程套票。</p>
      <Segmented options={[{ value: '1:1', label: 'Private · 1:1' }, { value: '1:2', label: 'Semi-private · 1:2' }]} value={fmt} onChange={setFmt} style={{ marginTop: 18, width: '100%', display: 'flex' }} />
      {fmt === '1:2' && <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 12, color: 'var(--taupe)', margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}><Icon n="users-round" size={13} color="var(--taupe)" /> Prices are the total for two people sharing the session.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {list.map(p => (
          <div key={p.id} style={{ position: 'relative', background: 'var(--ivory)', borderRadius: 20, padding: '18px 18px 16px', border: '1.5px solid ' + (p.popular ? 'var(--accent)' : 'var(--border-soft)'), boxShadow: p.popular ? 'var(--shadow-md)' : 'var(--shadow-sm)' }}>
            {p.popular && <div style={{ position: 'absolute', top: -10, left: 18 }}><Pill color="#fff" bg="var(--accent)">Most chosen</Pill></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 20, color: 'var(--espresso)', lineHeight: 1.1 }}>{p.name}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--taupe)', marginTop: 3 }}>{p.blurb}</div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 22, color: 'var(--espresso)', lineHeight: 1 }}>{hkd(p.price)}</div>
                {p.per && <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, color: 'var(--fg3)', marginTop: 3 }}>{hkd(p.per)}/session</div>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 13, paddingTop: 13, borderTop: '1px solid var(--border-soft)' }}>
              <Icon n="check-circle-2" size={15} color="var(--accent)" />
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12.5, color: 'var(--espresso)' }}>{p.credits === '∞' ? 'Unlimited private sessions' : (p.credits + (p.credits === 1 ? ' private session' : ' private sessions'))}</span>
            </div>
            {p.validityMonths && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 }}>
                <Icon n="calendar-clock" size={15} color="var(--taupe)" />
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 12.5, color: 'var(--taupe)' }}>Valid for {p.validityMonths} month{p.validityMonths > 1 ? 's' : ''} from first visit</span>
              </div>
            )}
            {onBuy && (
              <button className="tap" onClick={() => buy(p.id)} disabled={buying === p.id} style={{ marginTop: 14, width: '100%', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13.5, padding: '12px', minHeight: 46, borderRadius: 12, border: 'none', background: p.format === '1:2' ? 'var(--terracotta)' : 'var(--accent)', color: '#fff', opacity: buying === p.id ? 0.6 : 1 }}>
                {!live ? 'Sign in to buy' : (buying === p.id ? 'Starting checkout…' : `Buy · ${hkd(p.price)}`)}
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, background: 'var(--accent-tint)', borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
        <Icon n="info" size={16} color="var(--accent)" style={{ marginTop: 1 }} />
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--taupe)', lineHeight: 1.6 }}>Credits are shared across all five studios and any instructor. Cancel free up to 24 hours before a session.</span>
      </div>
      <Button variant="accent" full size="lg" onClick={onBook} iconRight="arrow-right" style={{ marginTop: 18 }}>Find my instructor</Button>
    </div>
  );
}

// GUEST_MODE lets people try the full app without signing in — they land
// straight in the client app (demo data). Set to false to require login again.
const GUEST_MODE = true;

export function ClientPortal() {
  const [stage, setStage] = useState(GUEST_MODE ? 'app' : 'browse');
  const [tab, setTab] = useState('Home');
  const [answers, setAnswers] = useState({ age: '25–34', goals: ['rehab', 'posture'], level: 'some', injury: ['Lower back'], schedule: ['am'], location: ['central'] });
  const [detail, setDetail] = useState(null);
  const [booking, setBooking] = useState(null);
  const [rating, setRating] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [extraBookings, setExtraBookings] = useState([]);
  const [cancelled, setCancelled] = useState([]); // booking ids the client cancelled
  const favIds = useFavs();
  const [credits, setCredits] = useState(7);
  const [showWaiver, setShowWaiver] = useState(false);
  const [authUserId, setAuthUserId] = useState(null); // real Supabase user id when signed in for real
  const [authName, setAuthName] = useState('');
  const [purchased, setPurchased] = useState([]); // package ids this user has paid for (limits one-time trials)
  const live = !!authUserId; // true when a real Supabase account is signed in

  // When signed in for real, load this user's own data — their saved intake,
  // real credit balance (0 to start) and name — replacing the demo placeholder.
  useEffect(() => {
    if (!authUserId || !isSupabaseConfigured) return undefined;
    let active = true;
    (async () => {
      try {
        const [prof, bal, name, purch] = await Promise.all([
          db.fetchClientProfile(authUserId),
          db.fetchCreditBalance(authUserId),
          db.fetchProfileName(authUserId),
          db.fetchPurchasedPackageIds(authUserId),
        ]);
        if (!active) return;
        if (prof) setAnswers(prof);
        setCredits(bal || 0);
        if (name) setAuthName(name);
        setPurchased(purch || []);
      } catch (e) { console.warn('Could not load profile', e); }
    })();
    return () => { active = false; };
  }, [authUserId]);
  useClientStore();
  const profile = getClientProfile('c1');
  const waiverOk = !!(profile && profile.waiver && profile.waiver.agreed);

  const openDetail = t => setDetail(t);
  const startBooking = (t, day, slot) => { if (!slot) return; setBooking({ t, day, slot }); };
  const goSearch = () => { setTab('Search'); setSearchLoading(true); setTimeout(() => setSearchLoading(false), 900); };
  // Sign out (if signed in) or open the login screen (from guest mode).
  const handleAuth = () => {
    if (live && isSupabaseConfigured) signOut().catch(() => {});
    setAuthUserId(null); setAuthName(''); setPurchased([]); setCredits(7);
    setTab('Home'); setStage('login');
  };

  if (stage === 'browse') {
    const gate = () => setStage('login');
    const gateScreen = (icon, title) => (
      <EmptyState icon={icon} title={title}
        body="Create a free account to see this — browsing stays free, sign in only when you're ready."
        action={<Button variant="accent" size="lg" onClick={gate} iconRight="arrow-right" style={{ marginTop: 18 }}>Sign in / Sign up</Button>} />
    );
    const publicScreens = {
      Home: <ClientBrowse onGate={gate} onOpen={openDetail} />,
      Search: <ClientBrowse onGate={gate} onOpen={openDetail} />,
      Pricing: <ClientPricing onBook={gate} onBuy={isSupabaseConfigured ? (() => { setStage('login'); }) : undefined} />,
      Locations: <ClientLocations />,
      Bookings: gateScreen('calendar-check', 'Sign in to see bookings'),
      Profile: gateScreen('user', 'Sign in to view your profile'),
    };
    return (
      <PhoneFrame navBar={<ClientNav tab={tab} setTab={setTab} />} overlay={detail && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'var(--cream)', overflow: 'auto' }} className="screen-scroll">
          <TeacherDetail t={detail} onClose={() => setDetail(null)} onBook={() => { setDetail(null); setStage('login'); }} />
        </div>
      )}>
        <div key={tab} style={{ minHeight: '100%' }}>{publicScreens[tab]}</div>
      </PhoneFrame>
    );
  }
  if (stage === 'login') {
    return <PhoneFrame><ClientLogin onBack={() => { setTab('Home'); setStage('app'); }} onBrowse={() => { setTab('Search'); setStage('app'); }} onSignIn={(uid, isNew) => { if (uid) setAuthUserId(uid); setTab('Home'); setStage(isNew ? 'intake' : 'app'); }} /></PhoneFrame>;
  }
  if (stage === 'intake') {
    return <PhoneFrame><Intake answers={answers} setAnswers={setAnswers} onBack={() => setStage('login')} onDone={() => { saveClientProfile('c1', answers); if (isSupabaseConfigured && authUserId) db.saveClientProfile(authUserId, answers).catch(e => console.warn('Supabase profile save failed', e)); setStage('app'); setTab('Home'); }} /></PhoneFrame>;
  }

  const fmtClassDate = s => new Date(s + 'T00:00:00').toLocaleDateString('en-HK', { weekday: 'short', day: 'numeric', month: 'short' });
  const demoUpcoming = live ? [] : BOOKINGS.filter(b => b.cId === 'c1' && b.status === 'confirmed').slice().sort((a, b) => a.date.localeCompare(b.date)).map(b => ({ id: b.id, t: teacherById(b.tId), dayLabel: fmtClassDate(b.date), slotTime: b.time }));
  const upcomingAll = [...extraBookings, ...demoUpcoming].filter(b => !cancelled.includes(b.id));
  const nextClass = upcomingAll[0] || null;       // Home: just the next one
  const cancelBooking = (id) => { setCancelled(c => [...c, id]); setExtraBookings(b => b.filter(x => x.id !== id)); };
  const favTeachers = favIds.map(id => teacherById(id)).filter(Boolean);
  const pastClasses = live ? [] : BOOKINGS.filter(b => b.cId === 'c1' && b.status === 'completed').slice().sort((a, b) => b.date.localeCompare(a.date)).map(b => ({ id: b.id, t: teacherById(b.tId), dayLabel: fmtClassDate(b.date), slotTime: b.time }));

  const screens = {
    Home: <ClientHome answers={answers} onOpen={openDetail} goSearch={goSearch} name={authName} live={live} nextClass={nextClass} goTab={setTab} />,
    Search: <ClientBrowse embedded onOpen={openDetail} onGate={() => {}} />,
    Pricing: <ClientPricing onBook={goSearch} onBuy={isSupabaseConfigured ? startCheckout : undefined} purchased={purchased} live={live} onNeedAuth={() => setStage('login')} />,
    Locations: <ClientLocations />,
    Bookings: <ClientBookings extra={extraBookings} onRate={setRating} live={live} />,
    Profile: <ClientProfile answers={answers} credits={credits} onRestart={() => setStage('intake')} onWaiver={() => setShowWaiver(true)} waiver={profile && profile.waiver} name={authName} live={live} onAuth={handleAuth} upcoming={upcomingAll} onCancelBooking={cancelBooking} onReschedule={openDetail} favTeachers={favTeachers} past={pastClasses} onOpen={openDetail} onRate={setRating} />,
  };

  return (
    <PhoneFrame navBar={<ClientNav tab={tab} setTab={setTab} />} overlay={<>
      {detail && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'var(--cream)', overflow: 'auto' }} className="screen-scroll">
          <TeacherDetail t={detail} onClose={() => setDetail(null)} onBook={startBooking} />
        </div>
      )}
      <Sheet open={!!booking} onClose={() => setBooking(null)}>
        {booking && <BookingFlow {...booking} credits={credits} purchased={purchased} declarationOk={isDeclarationComplete(answers)} waiverOk={waiverOk} onCompleteDeclaration={() => { setBooking(null); setStage('intake'); }} onSignWaiver={() => setShowWaiver(true)} onClose={() => setBooking(null)} onConfirmed={info => {
          const next = info.usedCredit ? Math.max(0, credits - 1) : credits + (info.addCredits || 0) - 1;
          setCredits(next);
          setClientCredits('c1', next); // sync balance to admin
          if (!info.usedCredit && info.amount) {
            recordPayment('c1', { id: 'pay' + Date.now(), date: new Date().toISOString().slice(0, 10), desc: info.pkgName, credits: info.addCredits || 0, amount: info.amount, method: 'Visa ···· 8842' });
          }
          setExtraBookings(b => [{ id: 'new' + Date.now(), t: info.t, dayLabel: info.dayLabel, slotTime: info.slotTime, fmtLabel: info.fmtLabel, status: 'confirmed' }, ...b]);
          setBooking(null); setDetail(null); setTab('Profile');
        }} />}
      </Sheet>
      <Sheet open={!!rating} onClose={() => setRating(null)} maxH="80%">
        {rating && <RatingSheet t={rating} clientName={authName || 'Mara Whitfield'} onClose={() => setRating(null)} />}
      </Sheet>
      {showWaiver && <WaiverSheet signed={profile && profile.waiver} onClose={() => setShowWaiver(false)} onSigned={rec => { saveClientProfile('c1', { waiver: rec }); setShowWaiver(false); }} />}
    </>}>
      <div key={tab} style={{ minHeight: '100%' }}>{screens[tab]}</div>
    </PhoneFrame>
  );
}
