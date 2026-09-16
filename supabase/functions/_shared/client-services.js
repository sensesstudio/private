// Mindbody's purchase-specific ClientService.Id is the identity, not ProductId.
const norm = value => String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
export function hkDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) throw new Error('invalid_date');
  // Mindbody documents expiration as UTC; unzoned API timestamps are UTC here.
  const date = new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`);
  if (!Number.isFinite(+date)) throw new Error('invalid_date');
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function normalizeService(s, allowedClients) {
  const clientId = typeof s.ClientId === 'string' ? s.ClientId : '';
  if (!allowedClients.has(clientId) || !Number.isSafeInteger(s.Id) || s.Id <= 0) throw new Error('invalid_service_identity');
  if (!Number.isSafeInteger(s.Count) || !Number.isSafeInteger(s.Remaining) || s.Count < 0 || s.Remaining < 0 || s.Remaining > s.Count) return null;
  if (s.Returned === true || !s.PaymentDate || !s.ExpirationDate || typeof s.Name !== 'string') return null;
  return { client_id: clientId, service_id: String(s.Id), name: s.Name, total: s.Count, remaining: s.Remaining,
    purchase_date: hkDate(s.PaymentDate), expiry_date: hkDate(s.ExpirationDate), current: s.Current === true };
}
export function matchServices(packages, services, links = []) {
  const prior = new Map(links.map(l => [l.package_id, l]));
  const identity = s => `${s.client_id}:${s.service_id}`;
  if (new Set(services.map(identity)).size !== services.length) throw new Error('duplicate_service_identity');
  const candidates = new Map(packages.map(p => {
    const link = prior.get(p.id);
    return [p.id, services.filter(s => s.client_id === p.client_id && (link?.service_id
      ? s.service_id === link.service_id
      : norm(s.name) === norm(p.package_name) && s.purchase_date === p.purchase_date && s.total === p.total_credits))];
  }));
  const claims = new Map();
  for (const options of candidates.values()) for (const s of options) claims.set(identity(s), (claims.get(identity(s)) || 0) + 1);
  return packages.map(p => {
    const options = candidates.get(p.id);
    const unique = options.length === 1 && claims.get(identity(options[0])) === 1;
    return { package_id: p.id, version: p.version, status: unique ? 'synced' : options.length ? 'needs_review' : 'not_found',
      ...(unique ? options[0] : {}) };
  });
}
export async function fetchServices(mb, token, clientIds, start, end) {
  const all = [];
  for (let batch = 0; batch < clientIds.length; batch += 20) {
    const ids = clientIds.slice(batch, batch + 20), allowed = new Set(ids);
    let offset = 0;
    for (;;) {
      const q = new URLSearchParams({ 'request.startDate': `${start}T00:00:00`, 'request.endDate': `${end}T23:59:59`,
        'request.showActiveOnly': 'false', 'request.useActivateDate': 'false', 'request.limit': '200', 'request.offset': String(offset) });
      ids.forEach(id => q.append('request.clientIds', id));
      const data = await mb(`/client/clientservices?${q}`, token);
      const rows = data?.ClientServices, total = data?.PaginationResponse?.TotalResults;
      if (!Array.isArray(rows) || !Number.isSafeInteger(total) || total < 0 || (rows.length === 0 && offset < total)) throw new Error('incomplete_services');
      for (const raw of rows) { const s = normalizeService(raw, allowed); if (s) all.push(s); }
      offset += rows.length;
      if (offset >= total) break;
      if (offset >= 10000) throw new Error('pagination_limit');
    }
  }
  return all;
}
