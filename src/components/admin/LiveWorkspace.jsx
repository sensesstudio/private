import { useState } from 'react';
import { ADMIN_NAV, Workspace, PageHead, Stat } from './Portal.jsx';
import { Button, Card, Icon, Pill } from '../shared/index.jsx';
import { RoomSchedule } from '../live/RoomSchedule.jsx';
import { useLiveAvailability } from '../../availability/live.js';
import { roomBlocksForDay, roomScheduleStatus } from '../../availability/rooms.js';
import { hkDateKey, hkTime } from '../../availability/time.js';
import { LOCATIONS, locName } from '../../data.js';
import { useAdminRoomDetails } from '../../availability/adminRoomDetails.js';
import { RoomBookingDetails } from '../live/RoomBookingDetails.jsx';
import { AdminClients } from './Clients.jsx';
import { AdminProspects } from './Prospects.jsx';
import './admin.css';

// Use the original Admin workspace and design components. Live panels only
// render connected data; the preserved demo screens are never mounted here.
function Dashboard({ go }) {
  const state = useLiveAvailability();
  const today = hkDateKey(new Date());
  const rows = roomBlocksForDay(state.snapshot, today);
  const details = useAdminRoomDetails(today, state.snapshot?.sync?.last_ok_at);
  const current = roomScheduleStatus(state, today) === 'current';
  const max = Math.max(1, ...LOCATIONS.map(l => rows.filter(r => r.studio_id === l.id).length));
  return <div className="admin-page">
    <PageHead eyebrow={`Studio overview · ${today}`} title="Dashboard" sub="Across all three Hong Kong studios."
      right={<Button variant="soft" size="sm" icon="calendar" onClick={() => go('Bookings')}>Room schedule</Button>} />
    <div className="admin-stats">
      <Stat icon="calendar-check" label="Bookings this month · Not connected" value="—" />
      <Stat icon="banknote" label="Revenue · Not connected" value="—" />
      <Stat icon="users" label="Active teachers · Not connected" value="—" tone="sand" />
      <Stat icon="user" label="Active clients · Not connected" value="—" tone="sand" />
    </div>
    <div className="admin-dashboard-panels">
      <Card pad={24}>
        <h2 className="admin-card-title">Revenue trend</h2>
        <p className="admin-muted">HK$ · Revenue reporting</p>
        <div className="admin-pending-chart"><Icon n="chart-no-axes-combined" size={32} color="var(--accent)" />
          <p>Not connected yet</p><span>Revenue reporting will appear here once connected.</span>
        </div>
      </Card>
      <Card pad={24}>
        <h2 className="admin-card-title">By studio</h2>
        <p className="admin-muted">Occupied intervals today</p>
        <div className="admin-studio-counts">{LOCATIONS.map(l => {
          const count = rows.filter(r => r.studio_id === l.id).length;
          return <div key={l.id}><div className="admin-studio-count-label"><span>{l.name}</span><strong>{current ? count : '—'}</strong></div>
            <div className="admin-studio-bar"><span style={{ width: current ? `${count / max * 100}%` : '0%' }} /></div>
          </div>;
        })}</div>
        <p className="admin-muted" role="status">{current ? 'Mindbody sync is current' : state.loading ? 'Loading schedule…' : 'Schedule unconfirmed'}</p>
      </Card>
    </div>
    <Card pad={0}>
      <div className="admin-card-head"><h2 className="admin-card-title">Today's room schedule</h2>
        <Button variant="ghost" size="sm" onClick={() => go('Bookings')}>View all</Button></div>
      {!current && <p className="admin-panel-note">Saved records may be outdated.</p>}
      {rows.slice(0, 6).map((row, i) => <div key={`${row.studio_id}-${row.starts_at}-${i}`} className="admin-room-row">
        <span className="admin-room-icon"><Icon n="calendar" size={18} color="var(--accent)" /></span>
        <div><strong>{locName(row.studio_id)}</strong><span>{hkTime(row.starts_at)}–{hkTime(row.ends_at)} HKT</span><RoomBookingDetails details={details} studio={row.studio_id} start={row.starts_at} end={row.ends_at} exact /></div>
        <Pill color="var(--taupe)" bg="var(--sand)">Mindbody</Pill>
      </div>)}
      {!rows.length && <p className="admin-panel-note">{current ? 'No occupied intervals today.' : 'Today’s schedule is unconfirmed.'}</p>}
    </Card>
  </div>;
}

const UNCONNECTED = {
  Teachers: { eyebrow: 'Studio team', title: 'Teachers', description: 'Instructor management is not connected yet.', columns: ['Instructor', 'Focus', 'Studio', 'Rate', 'Rating', 'Sessions', 'Status'] },
  Approvals: { eyebrow: 'Onboarding', title: 'Teacher approvals', description: 'Instructor applications and approvals are not connected yet.', icon: 'user-check' },
  Payouts: { eyebrow: 'Studio finance', title: 'Payouts', description: 'Payout reporting is not connected yet.', columns: ['Payout', 'Period', 'Gross', 'Fees', 'Refunds', 'Net', 'Status'], stats: [['banknote', 'Total paid out'], ['clock', 'In transit'], ['wallet', 'Next payout']] },
  Refunds: { eyebrow: 'Client care', title: 'Refunds', description: 'Refund requests and processing are not connected yet.', icon: 'rotate-ccw' },
};

function UnconnectedSection({ section }) {
  const content = UNCONNECTED[section];
  return <div className="admin-page">
    <PageHead eyebrow={content.eyebrow} title={content.title} sub="Not connected yet" />
    {content.stats && <div className="admin-stats">{content.stats.map(([icon, label]) => <Stat key={label} icon={icon} label={label} value="—" />)}</div>}
    <Card pad={content.columns ? 0 : 32}>
      {content.columns && <div className="admin-table-scroll"><table className="admin-table"><thead><tr>{content.columns.map(h => <th key={h}>{h}</th>)}</tr></thead></table></div>}
      <div className="admin-empty-panel"><Icon n={content.icon || 'database'} size={30} color="var(--accent)" /><p>{content.description}</p></div>
    </Card>
  </div>;
}

export function LiveAdminWorkspace({ account, session }) {
  const [tab, setTab] = useState('Dashboard');
  // Keep one subscription across sections, avoiding needless reconnects when
  // the user opens one of the still-unconnected management screens.
  useLiveAvailability();
  const badge = <div className="admin-account"><div className="admin-account-identity"><span className="admin-account-mark">S</span><div className="hide-mobile"><strong>{account.full_name || 'Studio Ops'}</strong><span>Studio Ops</span></div></div>
    <Button variant="ghost" size="sm" onClick={session.logout}>Sign out</Button>
  </div>;
  const content = tab === 'Dashboard' ? <Dashboard go={setTab} /> : tab === 'Clients' ? <AdminClients /> : tab === 'Prospects' ? <AdminProspects /> : tab === 'Bookings' ? <div className="admin-page"><RoomSchedule embedded /></div> : <UnconnectedSection section={tab} />;
  return <Workspace title="Admin" nav={ADMIN_NAV} tab={tab} setTab={setTab} headRight={badge}>
    {session.error && <p className="admin-panel-note" role="alert">{session.error}</p>}
    <div key={tab}>{content}</div>
  </Workspace>;
}
