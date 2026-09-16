import { ClientActivity } from '../shared/ClientActivity.jsx';
import { ClientSubmittedDetails } from './ClientSubmittedDetails.jsx';
import { ClientEditor } from './ClientEditor.jsx';
import { ClientLoginAccess } from './ClientLoginAccess.jsx';
import { useMemo, useState } from 'react';
import { Button, Card, Icon, Pill } from '../shared/index.jsx';
import { PageHead } from './Portal.jsx';
import { useClients } from '../../admin/useClients.js';
import { filterClients, groupClients, packageStatus, sortClients } from '../../admin/clients.js';

const PAGE_SIZE = 25;
const SORT_COLUMNS = [
  { key: 'name', width: 13, label: 'Client', asc: 'Name: A–Z', desc: 'Name: Z–A' },
  { key: 'credits', width: 6, label: 'Credits left', asc: 'Credits: lowest first', desc: 'Credits: highest first' },
  { key: 'packages', width: 6, label: 'Packages', asc: 'Packages: fewest first', desc: 'Packages: most first' },
  { key: 'package_names', width: 14, label: 'Package names', asc: 'Package names: A–Z', desc: 'Package names: Z–A' },
  { key: 'last_visit', width: 8, label: 'Last visit date', asc: 'Last visit: oldest first', desc: 'Last visit: newest first' },
  { key: 'next_visit', width: 10, label: 'Next visit date', asc: 'Next visit: earliest first', desc: 'Next visit: latest first' },
  { key: 'private_lifetime', width: 8, label: 'Private lifetime', asc: 'Private lifetime: fewest first', desc: 'Private lifetime: most first' },
  { key: 'expiry', width: 8, label: 'Earliest expiry', asc: 'Expiry: earliest first', desc: 'Expiry: latest first' },
  { key: 'intake', width: 9, label: 'Intake', asc: 'Intake: pending first', desc: 'Intake: completed first' },
  { key: 'waiver', width: 9, label: 'Waiver', asc: 'Waiver: unsigned first', desc: 'Waiver: signed first' },
  { key: 'status', width: 9, label: 'Package status', asc: 'Status: A–Z', desc: 'Status: Z–A' },
];
const date = value => value ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Hong_Kong' }).format(new Date(`${value}T00:00:00+08:00`)) : '—';
const money = value => `HK$${Number(value).toLocaleString('en-HK', { maximumFractionDigits: 2 })}`;
const lastVisit = client => client.lastVisit ? date(client.lastVisit) : client.neverAttended ? 'Never attended' : '—';
function NextVisit({ client, details = false }) {
  if (!client.nextVisit) return client.noUpcomingBooking ? 'No upcoming booking' : '—';
  const when = new Date(client.nextVisit);
  return <><span>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Hong_Kong' }).format(when)}</span>
    <span className="admin-client-contact">{new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone: 'Asia/Hong_Kong' }).format(when)} HKT</span>
    {details && client.nextVisitDetails && <span className="admin-client-contact">{client.nextVisitDetails}</span>}</>;
}
function SyncStatus({ sync }) {
  if (!sync?.last_ok_at) return <p className="admin-client-notice">Mindbody auto-sync: {sync?.failed ? 'temporarily unavailable' : 'awaiting first update'}. Imported balances may be out of date.</p>;
  const stale = sync.failed || Date.now() - new Date(sync.last_ok_at).getTime() > 30 * 60000;
  return <p className={stale ? 'admin-client-notice' : 'admin-client-source admin-muted'}>Mindbody auto-sync every 15 minutes · Last checked {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Hong_Kong' }).format(new Date(sync.last_ok_at))} HKT · {sync.matched} packages synced{sync.pending > 0 ? ` · ${sync.pending} need review` : ''}.{stale ? ' Update delayed; showing last available values.' : ' This page updates automatically.'}</p>;
}
function PackageSync({ pack }) {
  const mb = pack.mindbody;
  if (!pack.source_row) return <p className="admin-muted">Manual studio record · not linked to Mindbody</p>;
  if (mb?.status === 'synced') return <p className="admin-muted">Mindbody · {mb.total - mb.remaining} used / {mb.total} sessions · Last updated {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Hong_Kong' }).format(new Date(mb.last_ok_at))} HKT{mb.current === false ? ' · Not currently usable in Mindbody' : ''}</p>;
  return <p className="admin-client-notice">{mb?.status === 'needs_review' ? 'Multiple possible matches in Mindbody. Needs review.' : 'Not yet matched to a Mindbody purchase.'} {mb?.last_ok_at ? 'Showing last synced values.' : 'Showing studio record values.'}</p>;
}
function Status({ packages, asOf }) {
  const status = packageStatus(packages, asOf);
  return <span className="admin-client-status"><Pill color={status === 'In date' ? 'var(--sage)' : 'var(--taupe)'} bg={status === 'In date' ? 'rgba(138,144,121,.16)' : 'var(--sand)'}>{status}</Pill></span>;
}
function Field({ label, children }) {
  return <div><dt>{label}</dt><dd>{children === '' || children == null ? '—' : children}</dd></div>;
}
function ClientDetails({ client, batch, asOf, sync, onBack, onEdit }) {
  return <>
    <Button variant="ghost" size="sm" icon="arrow-left" onClick={onBack}>Back to clients</Button>
    <div className="admin-client-detail-head"><PageHead eyebrow="Client details" title={client.name} sub={`${client.packages.length} package records`} right={<Button size="sm" variant="soft" onClick={() => onEdit('client', client)}>Edit client</Button>} /></div>
    <SyncStatus sync={sync} />
    <nav className="admin-client-section-nav" aria-label="Client record sections">{[['about','About me'],['waiver','Liability waiver'],['progress','Progress log'],['packages','Payment & packages'],['preferences','Preferences']].map(([id,label])=><Button key={id} size="sm" variant="soft" onClick={()=>document.getElementById(`client-${id}`)?.scrollIntoView({block:'start',behavior:'smooth'})}>{label}</Button>)}</nav>
    <Card pad={22}>
      <dl className="admin-client-fields">
        <Field label="Client ID">{client.id}</Field><Field label="Phone">{client.phone}</Field><Field label="Email">{client.email}</Field>
        {client.record?.signup_source === 'google' && <><Field label="Registration">Google sign-up</Field><Field label="Profile">{client.record.profile_completed_at ? 'Complete' : 'Awaiting contact details'}</Field></>}
        <Field label="Credits left / total">{client.credits} / {client.totalCredits}</Field>
        <Field label="Last visit date">{lastVisit(client)}</Field>
        <Field label="Next visit date"><NextVisit client={client} details /></Field>
        <Field label="Private lifetime">{client.privateLifetime == null ? '—' : `${client.privateLifetime} sessions attended`}</Field>
        <Field label="Package status"><Status packages={client.packages} asOf={asOf} /></Field>
      </dl>
    </Card>
    <ClientSubmittedDetails client={client}/>
    <section id="client-progress" className="admin-client-section"><h2 className="admin-card-title">Progress log</h2><ClientActivity key={`progress:${client.id}`} kind="progress" clientId={client.id}/></section>
    <div className="admin-client-login"><ClientLoginAccess key={client.id} client={client} /></div>
    <section id="client-packages" className="admin-client-section"><h2 className="admin-card-title">Payment &amp; packages</h2><p className="admin-muted">Studio packages from Mindbody and imported records</p>
    <div className="admin-client-package-head admin-client-packages-title"><h2 className="admin-card-title">Packages</h2><Button size="sm" onClick={() => onEdit('package', null)}>Add package</Button></div>
    {client.duplicates > 0 && <p className="admin-client-notice">Possible duplicate rows are preserved and included in totals. Check the source before using these balances.</p>}
    <div className="admin-client-packages">{client.packages.map(p => <Card key={p.id || p.source_row} pad={22}>
      <div className="admin-client-package-head"><h3>{p.package_name}</h3><Status packages={[p]} asOf={asOf} /></div>
      <p className="admin-muted">{p.source_row ? `CSV row ${p.source_row}` : 'Added by admin'}{p.duplicate_of_row != null && ` · Possible duplicate of row ${p.duplicate_of_row} in source CSV`}</p><Button size="sm" variant="soft" onClick={() => onEdit('package', p)}>Edit package</Button>
      <PackageSync pack={p} />
      <dl className="admin-client-fields">
        <Field label="Credits left">{p.credits_left}</Field><Field label="Total credits">{p.total_credits}</Field>
        <Field label="Recorded purchase amount">{money(p.purchase_amount_hkd)}</Field><Field label="Recorded remaining value">{money(p.remaining_value_hkd)}</Field>
        <Field label="Purchase date">{date(p.purchase_date)}</Field><Field label="Expiry date">{date(p.expiry_date)}</Field>
        <Field label="Days to expiry">{p.days_to_expiry}</Field>
      </dl>
    </Card>)}</div>
    <ClientActivity key={`packages:${client.id}`} kind="packages" clientId={client.id}/><ClientActivity key={`payments:${client.id}`} kind="payments" clientId={client.id}/></section>
    <p className="admin-muted admin-client-source">{batch ? `Source: ${batch.source_file}. ` : ''}Last and next visit dates are from the latest client CSV. Studio records include admin updates and client submissions. These balances are separate from online booking credits.</p>
  </>;
}

export function AdminClients() {
  const { data, loading, error, refresh } = useClients();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('next_visit:asc');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState('');
  const clients = useMemo(() => groupClients(data?.rows || [], data?.clients || []), [data]);
  const batch = data?.lifetime_import || data?.next_visit_import || data?.last_visit_import || data?.import;
  const asOf = data?.as_of || batch?.as_of;
  const filtered = useMemo(() => filterClients(clients, query, filter, asOf), [clients, query, filter, asOf]);
  const [sortKey, sortDirection] = sort.split(':');
  const sorted = useMemo(() => sortClients(filtered, sortKey, sortDirection, asOf), [filtered, sortKey, sortDirection, asOf]);
  const changeSort = value => { setSort(value); setPage(0); };
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const selected = clients.find(c => c.id === selectedId);
  const duplicates = clients.reduce((n, c) => n + c.duplicates, 0);
  if (editor) return <ClientEditor key={`${editor.kind}:${editor.record?.id || 'new'}`} {...editor} onCancel={() => setEditor(null)} onSaved={async id => {
    setEditor(null); setSelectedId(id); setNotice('Changes saved.'); await refresh();
  }} />;
  if (selected) return <div className="admin-page">{notice && <p role="status">{notice}</p>}<ClientDetails client={selected} batch={batch} asOf={asOf} sync={data?.sync} onBack={() => { setSelectedId(null); setNotice(''); }} onEdit={(kind, record) => { setNotice(''); setEditor({ kind, record, client: selected }); }} /></div>;
  return <div className="admin-page admin-clients-page">
    <PageHead eyebrow="Studio community" title="Clients" sub={loading ? 'Loading client records…' : data ? `${clients.length} clients · ${data.rows.length} package records` : 'Client records'}
      right={<div className="admin-editor-actions"><Button size="sm" disabled={loading || error} onClick={() => setEditor({ kind: 'client', record: null })}>Add client</Button><Button variant="soft" size="sm" icon="refresh-cw" disabled={loading} onClick={() => { setSelectedId(null); refresh(); }}>Refresh clients</Button></div>} />
    {data && <>
      <SyncStatus sync={data.sync} />
      <p className="admin-client-source admin-muted">{batch ? `Client CSV dated ${date(batch.as_of)}. ` : ''}Last and next visit dates are from the client CSV. Studio records include admin updates and client submissions. Package status as of {date(asOf)}.</p>
      {duplicates > 0 && <p className="admin-client-notice">{duplicates} possible duplicate {duplicates === 1 ? 'row is' : 'rows are'} included in totals. Open a client to review their packages.</p>}
      <div className="admin-client-tools">
        <label className="admin-client-search"><Icon n="search" size={17} /><input aria-label="Search clients" placeholder="Search name, phone, email, ID or package…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></label>
        <select aria-label="Filter clients" value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}>
          <option value="all">All clients</option><option value="expiring">Expiring within 30 days</option><option value="duplicates">Possible duplicates</option>
          <option value="intake_pending">Intake not submitted</option><option value="waiver_pending">Waiver not signed</option><option value="google">Google sign-ups</option><option value="incomplete">Awaiting contact details</option>
        </select>
        <label className="admin-client-sort-label">Sort
          <select aria-label="Sort clients" value={sort} onChange={e => changeSort(e.target.value)}>
            {SORT_COLUMNS.flatMap(column => ['asc', 'desc'].map(direction => <option key={`${column.key}:${direction}`} value={`${column.key}:${direction}`}>{column[direction]}</option>))}
          </select>
        </label>
      </div>
    </>}
    <Card pad={0}>
      {loading ? <div className="admin-empty-panel" role="status">Loading client records…</div> : error ? <div className="admin-empty-panel" role="alert"><p>Client records could not be loaded. Please try again.</p><Button variant="soft" size="sm" onClick={refresh}>Retry</Button></div> : !clients.length ? <div className="admin-empty-panel"><Icon n="database" size={30} color="var(--accent)" /><p>No clients yet. Select Add client to get started.</p></div> : <>
        <div className="admin-table-scroll"><table className="admin-table admin-clients-table">
          <caption className="admin-client-caption">Package status as of {date(asOf)}. Select a name to see all package details.</caption>
          <colgroup>{SORT_COLUMNS.map(column => <col key={column.key} style={{ width: `${column.width}%` }} />)}</colgroup>
          <thead><tr>{SORT_COLUMNS.map(column => <th key={column.key} scope="col" aria-sort={sortKey === column.key ? sortDirection === 'asc' ? 'ascending' : 'descending' : undefined}>
            <button className="admin-client-sort-heading" type="button" aria-label={`Sort by ${column.label}`} onClick={() => changeSort(`${column.key}:${sortKey === column.key && sortDirection === 'asc' ? 'desc' : 'asc'}`)}>
              {column.label}<span aria-hidden="true">{sortKey === column.key ? sortDirection === 'asc' ? '↑' : '↓' : '↕'}</span>
            </button>
          </th>)}</tr></thead>
          <tbody>{visible.map(client => <tr key={client.id}>
            <td><button className="admin-client-name" onClick={() => setSelectedId(client.id)}>{client.name}<Icon n="chevron-right" size={14} /></button>
              <span className="admin-client-contact">{client.email || client.phone || 'No contact details'}</span>
              {client.record?.signup_source === 'google' && <span className="admin-client-contact">Google sign-up{!client.record.profile_completed_at && ' · Awaiting contact details'}</span>}
              {client.duplicates > 0 && <span className="admin-client-duplicate">Possible duplicate</span>}
            </td>
            <td>{client.credits} <span className="admin-client-secondary">/ {client.totalCredits}</span></td>
            <td>{client.packages.length}<span className="admin-client-contact">{client.packages.filter(p => p.mindbody?.status === 'synced').length} synced</span></td>
            <td className="admin-client-package-names">{client.packages.length ? client.packages.map((pack, index) => <span key={pack.id || pack.source_row || index}>{pack.package_name}</span>) : '—'}</td>
            <td>{lastVisit(client)}</td><td><NextVisit client={client} /></td><td>{client.privateLifetime ?? '—'}<span className="admin-client-contact">sessions attended</span></td><td>{date(client.nextExpiry)}</td>
            <td>{client.record?.portal_profile?.intake_completed_at ? 'Submitted' : 'Not submitted'}</td>
            <td>{client.record?.waiver_signatures?.length ? 'Signed' : 'Not signed'}</td>
            <td><Status packages={client.packages} asOf={asOf} /></td>
          </tr>)}</tbody>
        </table></div>
        {!visible.length && <p className="admin-empty-panel">No clients match your search.</p>}
        <div className="admin-client-pagination"><span role="status">{filtered.length ? `${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} clients` : '0 clients'}</span>
          <div><Button variant="ghost" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</Button><Button variant="ghost" size="sm" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Next</Button></div>
        </div>
      </>}
    </Card>
    {batch && <p className="admin-muted admin-client-source">Source: {batch.source_file} · Imported {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Hong_Kong' }).format(new Date(batch.imported_at))} HKT</p>}
  </div>;
}
