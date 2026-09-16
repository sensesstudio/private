// Studio records are separate from online booking credits and payments.
export function groupClients(rows, records = []) {
  const clients = new Map(records.map(r => [r.id, { id: r.id, record: r, packages: [] }]));
  for (const row of rows) {
    if (!clients.has(row.client_id)) clients.set(row.client_id, { id: row.client_id, packages: [] });
    clients.get(row.client_id).packages.push(row);
  }
  return [...clients.values()].map(client => {
    const values = field => [...new Set(client.packages.map(p => p[field]).filter(v => v !== '' && v != null))];
    return { ...client, version: client.record?.version, name: client.record?.client_name ?? values('client_name').join(' / '), phone: client.record?.phone ?? values('phone').join(' / '), email: client.record?.email ?? values('email').join(' / '),
      visits: client.record ? String(client.record.visits_since_jun ?? '—') : values('visits_since_jun').join(' / ') || '—',
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

export function sortClients(clients, key, direction, asOf) {
  const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
  const value = client => {
    if (key === 'credits') return client.credits;
    if (key === 'packages') return client.packages.length;
    if (key === 'visits') return /^\d+$/.test(String(client.visits)) ? Number(client.visits) : null;
    if (key === 'expiry') return client.nextExpiry;
    if (key === 'status') return packageStatus(client.packages, asOf);
    return client.name;
  };
  return [...clients].sort((a, b) => {
    const left = value(a), right = value(b);
    // Missing dates or visit counts stay last in either direction.
    if (left == null && right != null) return 1;
    if (left != null && right == null) return -1;
    const comparison = left == null ? 0 : typeof left === 'number' ? left - right : collator.compare(left, right);
    return comparison * (direction === 'desc' ? -1 : 1)
      || collator.compare(a.name, b.name) || a.id.localeCompare(b.id);
  });
}
