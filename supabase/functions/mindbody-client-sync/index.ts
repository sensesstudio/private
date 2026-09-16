import { db, mb, staffToken } from '../_shared/mb.ts';
import { fetchServices, matchServices } from '../_shared/client-services.js';

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
Deno.serve(async req => {
  const key = Deno.env.get('SYNC_KEY');
  if (!key || req.headers.get('x-sync-key') !== key) return reply({ error: 'unauthorized' }, 401);
  if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);
  const started = new Date().toISOString(), d = db();
  let stage = 'read_records';
  try {
    // Explicit paging: never silently sync only PostgREST's first 1,000 rows.
    const packages: any[] = [], links: any[] = [];
    for (let offset = 0; ; offset += 500) {
      const rows = await d.select('studio_client_packages', `select=id,client_id,package_name,purchase_date,total_credits,version&import_id=not.is.null&order=id&limit=500&offset=${offset}`);
      packages.push(...rows); if (rows.length < 500) break;
    }
    for (let offset = 0; ; offset += 500) {
      const rows = await d.select('mindbody_package_links', `select=package_id,service_id&order=package_id&limit=500&offset=${offset}`);
      links.push(...rows); if (rows.length < 500) break;
    }
    const clientIds = [...new Set(packages.map(p => p.client_id))];
    const earliest = packages.map(p => p.purchase_date).sort()[0];
    const end = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const start = earliest ? new Date(+new Date(`${earliest}T00:00:00Z`) - 86400000).toISOString().slice(0,10) : end;
    stage = 'mindbody_services';
    const services = clientIds.length ? await fetchServices((path: string, token: string) => mb(path,token,AbortSignal.timeout(15000)), await staffToken(), clientIds, start, end) : [];
    stage = 'match_packages';
    const results = matchServices(packages, services, links);
    stage = 'save_readings';
    const summary = await d.rpc('apply_mindbody_client_sync', { p_started: started, p_results: results, p_error: false });
    return reply(summary); // Counts only: never publish client data in cron/CI output.
  } catch (error) {
    // Upstream errors may contain PII. Persist only a fixed error code.
    try { await d.rpc('apply_mindbody_client_sync', { p_started: started, p_results: [], p_error: true }); } catch { /* retry next scheduled run */ }
    const message = error instanceof Error ? error.message : '';
    const allowed = ['invalid_date','invalid_service_identity','duplicate_service_identity','incomplete_services','pagination_limit'];
    const reason = allowed.includes(message) ? message : /(?:clientservices|usertoken\/issue) (\d{3})/.exec(message)?.[1] || 'unavailable';
    return reply({ error: 'client_sync_failed', stage, reason }, 503);
  }
});
