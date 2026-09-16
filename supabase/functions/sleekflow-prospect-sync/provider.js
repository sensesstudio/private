// Official Platform API: /api/labels and /api/contact/dynamicSearch.
// https://apidoc.sleekflow.io/docs/platform-api/branches/main/hhpzcos4fmvyf-search-contacts-with-dynamic-included-fields
// The published response spells labels/latestMessage as lables/lastestMessage.
export const PROSPECT_LABEL = 'Private - Prospect';
const normalized = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const instant = value => {
  if (value == null || value === '') return null;
  const date = new Date(typeof value === 'number' ? (value < 1e12 ? value * 1000 : value) : /(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : `${value}Z`);
  if (!Number.isFinite(+date) || date.getUTCFullYear() < 2000) return null;
  return date.toISOString();
};
const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : null;
export function provider(key, fetcher = fetch, signal) {
  return async (path, body) => {
    const response = await fetcher(`https://api.sleekflow.io${path}`, {
      method: body ? 'POST' : 'GET', redirect: 'error',
      headers: { 'X-Sleekflow-Api-Key': key, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error([401,403].includes(response.status) ? 'invalid_key' : response.status === 429 ? 'rate_limited' : 'sync_unavailable');
    return response.json();
  };
}
export async function findLabel(api, label = PROSPECT_LABEL) {
  const labels = await api('/api/labels');
  if (!Array.isArray(labels)) throw new Error('source_format');
  const matches = labels.filter(l => normalized(l.hashtag) === normalized(label));
  if (matches.length !== 1 || !matches[0].id) throw new Error('label_not_found');
  return matches[0];
}
export async function fetchProspects(api, label = PROSPECT_LABEL) {
  const target = await findLabel(api, label), rows = [], seen = new Set();
  let total = null;
  // Read-only search. We filter the explicitly included labels locally because
  // label filter operators are not specified in the provider's public contract.
  // Only matching contacts leave this function or reach the database.
  for (let offset = 0; offset <= 10000; offset += 200) {
    const data = await api('/api/contact/dynamicSearch', {
      conditions: [], include: { labels: true, latestMessage: true, customFields: ['LastContact','LastContactFromCustomers'] },
      pagination: { limit: 200, offset }, sort: { field: 'CreatedAt', order: 'ASC' },
    });
    if (!Array.isArray(data?.results) || !Number.isSafeInteger(data.totalContact) || data.totalContact < 0 || data.results.length > 200) throw new Error('source_format');
    if (data.totalContact > 10000) throw new Error('too_many_contacts');
    if (total !== null && total !== data.totalContact) throw new Error('source_changed');
    total = data.totalContact;
    for (const c of data.results) {
      if (typeof c.id !== 'string' || !c.id || c.id.length > 200 || seen.has(c.id)) throw new Error('source_changed');
      seen.add(c.id);
      const labels = c.labels ?? c.lables;
      if (!Array.isArray(labels) || labels.some(l => typeof l !== 'string')) throw new Error('source_format');
      if (!labels.some(l => normalized(l) === normalized(target.hashtag) || l === target.id)) continue;
      const m = c.latestMessage ?? c.lastestMessage;
      if (m != null && (typeof m !== 'object' || Array.isArray(m))) throw new Error('source_format');
      const live = m && m.isSandbox !== true;
      const messageAt = live ? instant(m.createdAt) || instant(m.timestamp) : null;
      const lastContact = [messageAt, instant(c.lastContactedFromCompany), instant(c.lastContactedFromUser),
        ...(Array.isArray(c.customFields) ? c.customFields.filter(f => ['LastContact','LastContactFromCustomers'].includes(f.customFieldName)).map(f => instant(f.customValue)) : [])].filter(Boolean).sort().at(-1) || null;
      rows.push({ id: c.id, client_name: [text(c.firstName,150), text(c.lastName,150)].filter(Boolean).join(' ').trim() || 'Name unavailable',
        mobile: text(c.phoneNumber,80), last_message: live ? text(m.messageContent,10000) || (m.uploadedFiles?.length ? '[Attachment]' : null) : null,
        message_at: messageAt, channel: live ? text(m.channel,80) : null, conversation_id: live ? text(m.conversationId,200) : null, last_contact_at: lastContact });
    }
    if (seen.size === total) return rows;
    if (seen.size > total || data.results.length !== 200) throw new Error('source_changed');
  }
  throw new Error('too_many_contacts');
}
