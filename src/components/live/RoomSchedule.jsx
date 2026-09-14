import { useState } from 'react';
import { useLiveAvailability, liveStore } from '../../availability/live.js';
import { roomBlocksForDay, roomScheduleStatus } from '../../availability/rooms.js';
import { availabilityDays, hkDateKey, hkLabel, hkTime, hkStart } from '../../availability/time.js';
import { STUDIO_IDS } from '../../availability/model.js';
import { LOCATIONS, locName } from '../../data.js';
import { Button, Eyebrow } from '../shared/index.jsx';
import { RoomGrid } from './RoomGrid.jsx';
import './room-grid.css';

const STATUS = {
  loading: 'Loading room schedule…',
  unavailable: 'Latest schedule unavailable; saved records may be outdated.',
  never_synced: 'No successful sync recorded.',
  stale: 'Room sync is overdue; availability is unconfirmed.',
  unmapped: 'A selected studio has no active room connection.',
  outside_coverage: 'Sync does not cover the full selected day.',
  current: 'Room schedule is up to date',
};
const fullTime = value => value != null && Number.isFinite(+new Date(value)) ? `${hkDateKey(value)} · ${hkTime(value)} HKT` : '—';

export function RoomSchedule({ embedded = false }) {
  const state = useLiveAvailability();
  const { snapshot, refreshing, fetchedAt } = state;
  const days = availabilityDays();
  const [chosenDay, chooseDay] = useState(days[0].iso);
  const [studio, chooseStudio] = useState('all');
  const [view, setView] = useState('grid');
  const day = days.some(d => d.iso === chosenDay) ? chosenDay : days[0].iso;
  const [dateInput, setDateInput] = useState(days[0].iso);
  const [dateError, setDateError] = useState('');
  const dayIndex = days.findIndex(d => d.iso === day);
  function selectDay(value) { chooseDay(value); setDateInput(value); setDateError(''); }
  function goToDate(e) {
    e.preventDefault();
    if (days.some(d => d.iso === dateInput)) selectDay(dateInput);
    else setDateError('Choose a date within the next 14 days.');
  }
  const rows = roomBlocksForDay(snapshot, day, studio);
  const status = roomScheduleStatus(state, day, studio);
  const current = status === 'current';
  const now = Date.now();
  const Heading = embedded ? 'h2' : 'h1';
  return <section className={`live-section room-schedule${embedded ? ' room-schedule-embedded' : ''}`} aria-labelledby="room-schedule-title">
    <div className="room-heading room-private-heading"><div><Eyebrow>Studio portal · Daily ops</Eyebrow><Heading id="room-schedule-title">Private room <span>availability</span></Heading><p>When each studio's private room is free. Kwun Tong, Causeway Bay and Central.</p></div>
      <div className="room-refresh"><Button variant="soft" disabled={refreshing} onClick={() => liveStore.refresh()}>{refreshing ? 'Refreshing…' : 'Refresh list'}</Button><span>Checked {fullTime(fetchedAt)}</span></div>
    </div>
    <details className="room-sync room-sync-details" data-state={current ? 'current' : 'warning'}>
      <summary><span role="status">{STATUS[status]}</span> · Sync details</summary>
      <dl><div><dt>Last successful sync</dt><dd>{fullTime(snapshot?.sync?.last_ok_at)}</dd></div>
        <div><dt>List checked</dt><dd>{fullTime(fetchedAt)}</dd></div></dl>
      <p>Mindbody syncs every 5 minutes. Refresh list reads the latest synced data.</p>
    </details>
    <div className="room-date-toolbar">
      <div className="room-day-navigation"><button aria-label="Previous day" disabled={dayIndex === 0} onClick={() => selectDay(days[dayIndex - 1].iso)}>‹</button><button className="room-today" onClick={() => selectDay(days[0].iso)}>Today</button><button aria-label="Next day" disabled={dayIndex === days.length - 1} onClick={() => selectDay(days[dayIndex + 1].iso)}>›</button></div>
      <strong className="room-selected-day">{hkLabel(hkStart(day), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
      <form className="room-date-picker" onSubmit={goToDate}><input aria-label="Room date" type="date" min={days[0].iso} max={days[days.length - 1].iso} value={dateInput} onChange={e => setDateInput(e.target.value)} required /><button type="submit">Go</button></form>
    </div>
    {dateError && <p role="alert">{dateError}</p>}
    <div className="room-filters room-view-toolbar">
      <div className="room-view-switch" role="group" aria-label="Schedule view"><button aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Day view</button><button aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button></div>
      <label>Studio<select aria-label="Room studio" value={studio} onChange={e => chooseStudio(e.target.value)}><option value="all">All studios</option>{LOCATIONS.filter(l => STUDIO_IDS.includes(l.id)).map(l => <option value={l.id} key={l.id}>{l.name}</option>)}</select></label>
    </div>
    {view === 'grid' ? <><RoomGrid state={state} day={day} studio={studio} /><p className="room-explanation">FREE means no synced room occupancy in that interval, including earlier times today. Partial hours show the exact free gaps. The grid covers 07:00–22:00; use List for all recorded times.</p></> : <>
    <p id="room-list-description">{current ? '' : 'Last read: '}{rows.length} busy blocks{studio !== 'all' ? ` · ${locName(studio)}` : ''}</p>
    {!!rows.length && <div className="room-table-scroll"><table className="room-table" aria-describedby="room-list-description">
      <caption>Mindbody occupied room intervals</caption>
      <thead><tr><th scope="col">Studio</th><th scope="col">Start</th><th scope="col">End</th><th scope="col">Timing</th></tr></thead>
      <tbody>{rows.map((row, i) => {
        const timing = +new Date(row.ends_at) <= now ? 'Past' : +new Date(row.starts_at) <= now ? 'Now' : 'Upcoming';
        return <tr key={`${row.studio_id}-${row.starts_at}-${row.ends_at}-${i}`}><th scope="row">{locName(row.studio_id)}</th>
          <td><time dateTime={row.starts_at}>{hkDateKey(row.starts_at)}<br /><strong>{hkTime(row.starts_at)}</strong></time></td>
          <td><time dateTime={row.ends_at}>{hkDateKey(row.ends_at)}<br /><strong>{hkTime(row.ends_at)}</strong></time></td>
          <td>{timing}</td></tr>;
      })}</tbody>
    </table></div>}
    {!rows.length && <p className="room-empty" role="status">{status === 'loading' ? 'Loading records…' : current ? 'No occupied intervals for this selection.' : 'Room occupancy cannot be confirmed for this selection.'}</p>}
    </>}
    <p className="room-explanation">Room occupancy includes Mindbody classes and appointments. Client names and class titles are not imported.</p>
    <p className="room-explanation">A free room also needs an instructor opening before a session can be offered.</p>
  </section>;
}
