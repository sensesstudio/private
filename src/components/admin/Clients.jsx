import { useMemo, useState } from 'react';
import { Button, Card, Icon, Pill } from '../shared/index.jsx';
import { PageHead } from './Portal.jsx';
import { useClients } from '../../admin/useClients.js';
import { filterClients, groupClients, packageStatus } from '../../admin/clients.js';

const PAGE_SIZE = 25;
const date = value => value ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Hong_Kong' }).format(new Date(`${value}T00:00:00+08:00`)) : '—';
const money = value => `HK$${Number(value).toLocaleString('en-HK', { maximumFractionDigits: 2 })}`;
function Status({ packages, asOf }) {
  const status = packageStatus(packages, asOf);
  return <span className="admin-client-status"><Pill color={status === 'In date' ? 'var(--sage)' : 'var(--taupe)'} bg={status === 'In date' ? 'rgba(138,144,121,.16)' : 'var(--sand)'}>{status}</Pill></span>;
}
function Field({ label, children }) {
  return <div><dt>{label}</dt><dd>{children === '' || children == null ? '—' : children}</dd></div>;
}
function ClientDetails({ client, batch, onBack }) {
  return <>
    <Button variant="ghost" size="sm" icon="arrow-left" onClick={onBack}>Back to clients</Button>
    <div className="admin-client-detail-head"><PageHead eyebrow="Client details" title={client.name} sub={`${client.packages.length} package records · CSV snapshot ${date(batch.as_of)}`} /></div>
    <Card pad={22}>
      <dl className="admin-client-fields">
        <Field label="Client ID">{client.id}</Field><Field label="Phone">{client.phone}</Field><Field label="Email">{client.email}</Field>
        <Field label="Credits left / total">{client.credits} / {client.totalCredits}</Field>
        <Field label="Visits since Jun">{client.visits}</Field>
        <Field label="Package status"><Status packages={client.packages} asOf={batch.as_of} /></Field>
      </dl>
    </Card>
    <h2 className="admin-card-title admin-client-packages-title">Packages</h2>
    {client.duplicates > 0 && <p className="admin-client-notice">Possible duplicate rows are preserved and included in totals. Check the source before using these balances.</p>}
    <div className="admin-client-packages">{client.packages.map(p => <Card key={p.source_row} pad={22}>
      <div className="admin-client-package-head"><h3>{p.package_name}</h3><Status packages={[p]} asOf={batch.as_of} /></div>
      <p className="admin-muted">CSV row {p.source_row}{p.duplicate_of_row != null && ` · Possible duplicate of row ${p.duplicate_of_row}`}</p>
      <dl className="admin-client-fields">
        <Field label="Credits left">{p.credits_left}</Field><Field label="Total credits">{p.total_credits}</Field>
        <Field label="Purchase amount">{money(p.purchase_amount_hkd)}</Field><Field label="Remaining value">{money(p.remaining_value_hkd)}</Field>
        <Field label="Purchase date">{date(p.purchase_date)}</Field><Field label="Expiry date">{date(p.expiry_date)}</Field>
        <Field label="Days to expiry (at snapshot)">{p.days_to_expiry}</Field><Field label="Visits since Jun">{p.visits_since_jun}</Field>
      </dl>
    </Card>)}</div>
    <p className="admin-muted admin-client-source">Source: {batch.source_file}. Balances and visits reflect the CSV snapshot. Visits are a client total, repeated per package in the source.</p>
  </>;
}

export function AdminClients() {
  const { data, loading, error, refresh } = useClients();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const clients = useMemo(() => groupClients(data?.rows || []), [data]);
  const batch = data?.import;
  const filtered = useMemo(() => filterClients(clients, query, filter, batch?.as_of), [clients, query, filter, batch]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const selected = clients.find(c => c.id === selectedId);
  const duplicates = clients.reduce((n, c) => n + c.duplicates, 0);
  if (selected && batch) return <div className="admin-page"><ClientDetails client={selected} batch={batch} onBack={() => setSelectedId(null)} /></div>;
  return <div className="admin-page">
    <PageHead eyebrow="Studio community" title="Clients" sub={loading ? 'Loading client records…' : batch ? `${clients.length} clients · ${data.rows.length} package records` : 'Client records'}
      right={<Button variant="soft" size="sm" icon="refresh-cw" disabled={loading} onClick={() => { setSelectedId(null); refresh(); }}>Refresh clients</Button>} />
    {batch && <>
      <p className="admin-client-source admin-muted">CSV snapshot · {date(batch.as_of)}. Balances and visits are updated by CSV import.</p>
      {duplicates > 0 && <p className="admin-client-notice">{duplicates} possible duplicate {duplicates === 1 ? 'row is' : 'rows are'} included in totals. Open a client to review their packages.</p>}
      <div className="admin-client-tools">
        <label className="admin-client-search"><Icon n="search" size={17} /><input aria-label="Search clients" placeholder="Search name, phone, email, ID or package…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></label>
        <select aria-label="Filter clients" value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}>
          <option value="all">All clients</option><option value="expiring">Expiring within 30 days</option><option value="duplicates">Possible duplicates</option>
        </select>
      </div>
    </>}
    <Card pad={0}>
      {loading ? <div className="admin-empty-panel" role="status">Loading client records…</div> : error ? <div className="admin-empty-panel" role="alert"><p>Client records could not be loaded. Please try again.</p><Button variant="soft" size="sm" onClick={refresh}>Retry</Button></div> : !batch ? <div className="admin-empty-panel"><Icon n="database" size={30} color="var(--accent)" /><p>No client CSV has been imported yet.</p></div> : <>
        <div className="admin-table-scroll"><table className="admin-table admin-clients-table">
          <caption className="admin-client-caption">Credits, visits and package status as of {date(batch.as_of)}. Select a name to see all package details.</caption>
          <thead><tr>{['Client', 'Credits left', 'Packages', 'Visits since Jun', 'Earliest expiry', 'Package status'].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{visible.map(client => <tr key={client.id}>
            <td><button className="admin-client-name" onClick={() => setSelectedId(client.id)}>{client.name}<Icon n="chevron-right" size={14} /></button>
              <span className="admin-client-contact">{client.email || client.phone || 'No contact details'}</span>
              {client.duplicates > 0 && <span className="admin-client-duplicate">Possible duplicate</span>}
            </td>
            <td>{client.credits} <span className="admin-client-secondary">/ {client.totalCredits}</span></td>
            <td>{client.packages.length}</td><td>{client.visits}</td><td>{date(client.nextExpiry)}</td>
            <td><Status packages={client.packages} asOf={batch.as_of} /></td>
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
