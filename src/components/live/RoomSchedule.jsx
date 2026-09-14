import { useState } from 'react';
import { useLiveAvailability, liveStore } from '../../availability/live.js';
import { roomBlocksForDay, roomScheduleStatus } from '../../availability/rooms.js';
import { availabilityDays, hkDateKey, hkLabel, hkTime } from '../../availability/time.js';
import { STUDIO_IDS } from '../../availability/model.js';
import { LOCATIONS, locName } from '../../data.js';
import { Button } from '../shared/index.jsx';

const STATUS = {
  loading: '正在讀取房間日程… · Loading room schedule…',
  unavailable: '未能確認最新日程。下方如有紀錄，只供參考，唔代表房間仍然有空。 · Latest schedule unavailable; saved records may be outdated.',
  never_synced: '未有成功同步紀錄，暫時無法確認房間空檔。 · No successful sync recorded.',
  stale: '房間日程已超過 15 分鐘未成功同步，暫時無法確認空檔。 · Room sync is overdue; availability is unconfirmed.',
  unmapped: '所選分店未完成房間連接，暫時無法確認空檔。 · A selected studio has no active room connection.',
  outside_coverage: '同步資料未涵蓋所選日期全日，暫時無法確認空檔。 · Sync does not cover the full selected day.',
  current: '房間日程同步正常 · Room schedule is up to date',
};
const fullTime = value => value != null && Number.isFinite(+new Date(value)) ? `${hkDateKey(value)} · ${hkTime(value)} HKT` : '—';

export function RoomSchedule() {
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
  return <section className="live-section room-schedule" aria-labelledby="room-schedule-title">
    <div className="room-heading"><div><h1 id="room-schedule-title">房間日程 · Room schedule</h1><p>Mindbody 已佔用時段 · 香港時間 · Room occupancy in Hong Kong time</p></div>
      <Button variant="ghost" disabled={refreshing} onClick={() => liveStore.refresh()}>{refreshing ? '更新中… · Refreshing…' : '更新列表 · Refresh list'}</Button>
    </div>
    <div className="room-sync" data-state={current ? 'current' : 'warning'}>
      <p role="status">{STATUS[status]}</p>
      <dl><div><dt>最後成功同步 · Last successful sync</dt><dd>{fullTime(snapshot?.sync?.last_ok_at)}</dd></div>
        <div><dt>列表讀取時間 · List checked</dt><dd>{fullTime(fetchedAt)}</dd></div></dl>
      <p>Mindbody 每 5 分鐘同步；「更新列表」會重新讀取已同步資料。 · Mindbody syncs every 5 minutes.</p>
    </div>
    <div className="room-filters">
      <label>分店 · Studio<select aria-label="Room studio" value={studio} onChange={e => chooseStudio(e.target.value)}><option value="all">全部分店 · All studios</option>{LOCATIONS.filter(l => STUDIO_IDS.includes(l.id)).map(l => <option value={l.id} key={l.id}>{l.name}</option>)}</select></label>
      <label>日期 · Date<select aria-label="Room date" value={day} onChange={e => chooseDay(e.target.value)}>{days.map(d => <option key={d.iso} value={d.iso}>{d.iso} · {hkLabel(d.date)}</option>)}</select></label>
    </div>
    <p id="room-list-description">{current ? '' : '上次讀取 · Last read: '}{rows.length} 個佔用時段 · busy blocks{studio !== 'all' ? ` · ${locName(studio)}` : ''}</p>
    {!!rows.length && <div className="room-table-scroll"><table className="room-table" aria-describedby="room-list-description">
      <caption>Mindbody 房間佔用紀錄 · Occupied room intervals</caption>
      <thead><tr><th scope="col">分店 · Studio</th><th scope="col">開始 · Start</th><th scope="col">結束 · End</th><th scope="col">時段 · Timing</th></tr></thead>
      <tbody>{rows.map((row, i) => {
        const timing = +new Date(row.ends_at) <= now ? '已過 · Past' : +new Date(row.starts_at) <= now ? '現時 · Now' : '稍後 · Upcoming';
        return <tr key={`${row.studio_id}-${row.starts_at}-${row.ends_at}-${i}`}><th scope="row">{locName(row.studio_id)}</th>
          <td><time dateTime={row.starts_at}>{hkDateKey(row.starts_at)}<br /><strong>{hkTime(row.starts_at)}</strong></time></td>
          <td><time dateTime={row.ends_at}>{hkDateKey(row.ends_at)}<br /><strong>{hkTime(row.ends_at)}</strong></time></td>
          <td>{timing}</td></tr>;
      })}</tbody>
    </table></div>}
    {!rows.length && <p className="room-empty" role="status">{status === 'loading' ? '正在載入紀錄… · Loading records…' : current ? '所選日期及分店未有房間佔用紀錄。 · No occupied intervals for this selection.' : '暫時無法確認所選日期嘅房間日程。 · Room occupancy cannot be confirmed for this selection.'}</p>}
    <p className="room-explanation">列表包括 Mindbody 課堂及預約造成嘅房間佔用；目前只同步分店及開始／結束時間，未有學員姓名或課堂名稱。<br />Room occupancy includes Mindbody classes and appointments. Client names and class titles are not imported.</p>
    <p className="room-explanation">房間冇佔用紀錄，仍需有導師開放時段先可以提供課堂。 · A free room also needs an instructor opening before a session can be offered.</p>
  </section>;
}
