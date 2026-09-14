import { roomDayGrid } from '../../availability/rooms.js';
import { hkTime } from '../../availability/time.js';
import { locName } from '../../data.js';

const ORDER = ['kt', 'cwb', 'central'];
const freeLabel = minutes => {
  if (minutes == null) return 'Availability unconfirmed';
  const whole = Math.floor(minutes / 60), rest = Math.floor(minutes % 60);
  return rest ? `${whole}h ${rest}m of 15 hours free` : `${whole} of 15 hours free`;
};

export function RoomGrid({ state, day, studio }) {
  const columns = ORDER.filter(id => studio === 'all' || studio === id).map(id => roomDayGrid(state, day, id));
  return <div className="room-day-scroll" role="region" aria-label="Hourly room availability" tabIndex={0}>
    <table className="room-day-grid">
      <caption>Private room availability · 07:00–22:00 Hong Kong time</caption>
      <thead><tr><th scope="col"><span className="room-time-zone">HKT</span></th>{columns.map(col => <th key={col.studioId} scope="col" data-studio={col.studioId}>
        <span className="room-column-name"><i aria-hidden="true" />{locName(col.studioId)} private room</span>
        <span className="room-free-total" data-current={col.current}>{freeLabel(col.freeMinutes)}</span>
      </th>)}</tr></thead>
      <tbody>{Array.from({ length: 15 }, (_, i) => <tr key={i}>
        <th scope="row">{hkTime(columns[0].hours[i].start)}</th>
        {columns.map(col => {
          const hour = col.hours[i];
          const fullFree = hour.segments.length === 1 && hour.segments[0].kind === 'free';
          return <td key={col.studioId} data-studio={col.studioId} data-hour={hkTime(hour.start)} data-confirmed={col.current}>
            <div className={`room-hour${fullFree ? ' room-hour-free' : ''}`}>
              {hour.segments.map((segment, j) => <div key={j} className={`room-segment room-segment-${segment.kind}${segment.continues ? ' room-segment-continuation' : ''}`}>
                {segment.kind === 'busy' ? <>
                  <strong>{segment.continues ? `↳ Until ${hkTime(segment.actualEnd)}` : `${hkTime(segment.actualStart)}–${hkTime(segment.actualEnd)}`} · Occupied</strong>
                  {!segment.continues && <span>{col.current ? 'Mindbody' : 'Last read · Unconfirmed'}</span>}
                </> : segment.kind === 'free' ? fullFree ? <strong>FREE</strong> : <span>Free {hkTime(segment.start)}–{hkTime(segment.end)}</span> : <span>UNCONFIRMED</span>}
              </div>)}
            </div>
          </td>;
        })}
      </tr>)}</tbody>
    </table>
  </div>;
}
