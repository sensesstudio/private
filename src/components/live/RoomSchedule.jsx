import { useState } from 'react';
import { useLiveAvailability, liveStore } from '../../availability/live.js';
import { roomBlocksForDay, roomScheduleStatus } from '../../availability/rooms.js';
import { availabilityDays, hkDateKey, hkLabel, hkTime } from '../../availability/time.js';
import { STUDIO_IDS } from '../../availability/model.js';
import { LOCATIONS, locName } from '../../data.js';
import { Button } from '../shared/index.jsx';

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
  const day = days.some(d => d.iso === chosenDay) ? chosenDay : days[0].iso;
  const rows = roomBlocksForDay(snapshot, day, studio);
  const status = roomScheduleStatus(state, day, studio);
  const current = status === 'current';
  const now = Date.now();
  const Heading = embedded ? 'h2' : 'h1';
  return <section className={`live-section room-schedule${embedded ? ' room-schedule-embedded' : ''}`} aria-labelledby="room-schedule-title">
    <div className="room-heading"><div><Heading id="room-schedule-title">Room schedule</Heading><p>Mindbody room occupancy · Hong Kong time</p></div>
      <Button variant="ghost" disabled={refreshing} onClick={() => liveStore.refresh()}>{refreshing ? 'Refreshing…' : 'Refresh list'}</Button>
    </div>
    <div className="room-sync" data-state={current ? 'current' : 'warning'}>
      <p role="status">{STATUS[status]}</p>
      <dl><div><dt>Last successful sync</dt><dd>{fullTime(snapshot?.sync?.last_ok_at)}</dd></div>
        <div><dt>List checked</dt><dd>{fullTime(fetchedAt)}</dd></div></dl>
      <p>Mindbody syncs every 5 minutes. Refresh list reads the latest synced data.</p>
    </div>
    <div className="room-filters">
      <label>Studio<select aria-label="Room studio" value={studio} onChange={e => chooseStudio(e.target.value)}><option value="all">All studios</option>{LOCATIONS.filter(l => STUDIO_IDS.includes(l.id)).map(l => <option value={l.id} key={l.id}>{l.name}</option>)}</select></label>
      <label>Date<select aria-label="Room date" value={day} onChange={e => chooseDay(e.target.value)}>{days.map(d => <option key={d.iso} value={d.iso}>{d.iso} · {hkLabel(d.date)}</option>)}</select></label>
    </div>
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
    <p className="room-explanation">Room occupancy includes Mindbody classes and appointments. Client names and class titles are not imported.</p>
    <p className="room-explanation">A free room also needs an instructor opening before a session can be offered.</p>
  </section>;
}
