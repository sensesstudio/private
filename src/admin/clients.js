// CSV balances are a dated, read-only source. Never use these totals to book
// sessions or mutate the app's credit ledger.
export function groupClients(rows) {
  const clients = new Map();
  for (const row of rows) {
    if (!clients.has(row.client_id)) clients.set(row.client_id, { id: row.client_id, packages: [] });
    clients.get(row.client_id).packages.push(row);
  }
  return [...clients.values()].map(client => {
    const values = field => [...new Set(client.packages.map(p => p[field]).filter(v => v !== '' && v != null))];
    return { ...client, name: values('client_name').join(' / '), phone: values('phone').join(' / '), email: values('email').join(' / '),
      visits: values('visits_since_jun').join(' / ') || '—',
      credits: client.packages.reduce((n, p) => n + p.credits_left, 0),
      totalCredits: client.packages.reduce((n, p) => n + p.total_credits, 0),
      duplicates: client.packages.filter(p => p.duplicate_of_row != null).length,
      nextExpiry: client.packages.filter(p => p.credits_left > 0).map(p => p.expiry_date).sort()[0] || null,
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id));
}

export function packageStatus(packages, asOf) {
  const available = packages.filter(p => p.credits_left > 0);
  if (!available.length) return 'No credits';
  const inDate = available.filter(p => p.expiry_date >= asOf);
  if (!inDate.length) return 'Expired';
  if (inDate.some(p => p.expiry_date === asOf)) return 'Expires today';
  if (inDate.some(p => p.days_to_expiry <= 30)) return 'Expires within 30 days';
  return 'In date';
}

export function filterClients(clients, query, filter, asOf) {
  const term = query.trim().toLocaleLowerCase();
  return clients.filter(c => {
    const matches = !term || [c.id, c.name, c.phone, c.email, ...c.packages.map(p => p.package_name)]
      .some(v => v.toLocaleLowerCase().includes(term));
    if (!matches) return false;
    if (filter === 'duplicates') return c.duplicates > 0;
    if (filter === 'expiring') return c.packages.some(p => p.credits_left > 0 && p.expiry_date >= asOf && p.days_to_expiry <= 30);
    return true;
  });
}
