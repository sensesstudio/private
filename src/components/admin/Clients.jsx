import { ClientEditor } from './ClientEditor.jsx';
import { useMemo, useState } from 'react';
import { Button, Card, Icon, Pill } from '../shared/index.jsx';
import { PageHead } from './Portal.jsx';
import { useClients } from '../../admin/useClients.js';
import { filterClients, groupClients, packageStatus, sortClients } from '../../admin/clients.js';

const PAGE_SIZE = 25;
const SORT_COLUMNS = [
  { key: 'name', label: 'Client', asc: 'Name: A–Z', desc: 'Name: Z–A' },
  { key: 'credits', label: 'Credits left', asc: 'Credits: lowest first', desc: 'Credits: highest first' },
  { key: 'packages', label: 'Packages', asc: 'Packages: fewest first', desc: 'Packages: most first' },
  { key: 'visits', label: 'Recorded visits since Jun', asc: 'Visits: fewest first', desc: 'Visits: most first' },
  { key: 'expiry', label: 'Earliest expiry', asc: 'Expiry: earliest first', desc: 'Expiry: latest first' },
  { key: 'status', label: 'Package status', asc: 'Status: A–Z', desc: 'Status: Z–A' },
];
const date = value => value ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Hong_Kong' }).format(new Date(`${value}T00:00:00+08:00`)) : '—';
const money = value => `HK$${Number(value).toLocaleString('en-HK', { maximumFractionDigits: 2 })}`;
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
    <Card pad={22}>
      <dl className="admin-client-fields">
        <Field label="Client ID">{client.id}</Field><Field label="Phone">{client.phone}</Field><Field label="Email">{client.email}</Field>
        <Field label="Credits left / total">{client.credits} / {client.totalCredits}</Field>
        <Field label="Recorded visits since Jun">{client.visits}</Field>
        <Field label="Package status"><Status packages={client.packages} asOf={asOf} /></Field>
      </dl>
    </Card>
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
        <Field label="Days to expiry">{p.days_to_expiry}</Field><Field label="Recorded visits since Jun">{p.visits_since_jun}</Field>
      </dl>
    </Card>)}</div>
    <p className="admin-muted admin-client-source">{batch ? `Original source: ${batch.source_file}. ` : ''}Studio records include admin updates. Visits are a client total. These balances are separate from online booking credits.</p>
  </>;
}

export function AdminClients() {
  const { data, loading, error, refresh } = useClients();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('name:asc');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState('');
  const clients = useMemo(() => groupClients(data?.rows || [], data?.clients || []), [data]);
  const batch = data?.import;
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
  return <div className="admin-page">
    <PageHead eyebrow="Studio community" title="Clients" sub={loading ? 'Loading client records…' : data ? `${clients.length} clients · ${data.rows.length} package records` : 'Client records'}
      right={<div className="admin-editor-actions"><Button size="sm" disabled={loading || error} onClick={() => setEditor({ kind: 'client', record: null })}>Add client</Button><Button variant="soft" size="sm" icon="refresh-cw" disabled={loading} onClick={() => { setSelectedId(null); refresh(); }}>Refresh clients</Button></div>} />
    {data && <>
      <SyncStatus sync={data.sync} />
      <p className="admin-client-source admin-muted">{batch ? `Originally imported ${date(batch.as_of)}. ` : ''}Studio records include admin updates. Package status as of {date(asOf)}.</p>
      {duplicates > 0 && <p className="admin-client-notice">{duplicates} possible duplicate {duplicates === 1 ? 'row is' : 'rows are'} included in totals. Open a client to review their packages.</p>}
      <div className="admin-client-tools">
        <label className="admin-client-search"><Icon n="search" size={17} /><input aria-label="Search clients" placeholder="Search name, phone, email, ID or package…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></label>
        <select aria-label="Filter clients" value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}>
          <option value="all">All clients</option><option value="expiring">Expiring within 30 days</option><option value="duplicates">Possible duplicates</option>
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
          <thead><tr>{SORT_COLUMNS.map(column => <th key={column.key} scope="col" aria-sort={sortKey === column.key ? sortDirection === 'asc' ? 'ascending' : 'descending' : undefined}>
            <button className="admin-client-sort-heading" type="button" aria-label={`Sort by ${column.label}`} onClick={() => changeSort(`${column.key}:${sortKey === column.key && sortDirection === 'asc' ? 'desc' : 'asc'}`)}>
              {column.label}<span aria-hidden="true">{sortKey === column.key ? sortDirection === 'asc' ? '↑' : '↓' : '↕'}</span>
            </button>
          </th>)}</tr></thead>
          <tbody>{visible.map(client => <tr key={client.id}>
            <td><button className="admin-client-name" onClick={() => setSelectedId(client.id)}>{client.name}<Icon n="chevron-right" size={14} /></button>
              <span className="admin-client-contact">{client.email || client.phone || 'No contact details'}</span>
              {client.duplicates > 0 && <span className="admin-client-duplicate">Possible duplicate</span>}
            </td>
            <td>{client.credits} <span className="admin-client-secondary">/ {client.totalCredits}</span></td>
            <td>{client.packages.length}<span className="admin-client-contact">{client.packages.filter(p => p.mindbody?.status === 'synced').length} synced</span></td><td>{client.visits}</td><td>{date(client.nextExpiry)}</td>
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
