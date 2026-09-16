import { provider, findLabel, fetchProspects } from './provider.js';
const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Cache-Control':'no-store', 'Content-Type':'application/json' };
const reply = (data,status=200) => new Response(JSON.stringify(data),{status,headers:cors});
const safeError = error => ['invalid_key','rate_limited','label_not_found','source_changed','source_format','too_many_contacts'].includes(error?.message) ? error.message : 'sync_unavailable';
export function createHandler({ syncKey, authorize, rpc, fetcher = fetch }) {
  return async req => {
    if (req.method === 'OPTIONS') return new Response(null,{status:204,headers:cors});
    if (req.method !== 'POST') return reply({error:'method_not_allowed'},405);
    let run;
    try {
      const scheduled = Boolean(syncKey) && req.headers.get('x-sync-key') === syncKey;
      const user = scheduled ? null : await authorize(req.headers.get('authorization') || '');
      if (!scheduled && !user) return reply({error:'admin_access_required'},403);
      let body;
      try { body = await req.json(); } catch { return reply({error:'invalid_request'},400); }
      if (body.action === 'connect') {
        if (scheduled) return reply({error:'admin_access_required'},403);
        const key = typeof body.api_key === 'string' ? body.api_key.trim() : '';
        if (key.length < 10 || key.length > 4096 || /\s/.test(key)) return reply({error:'invalid_key'},400);
        await findLabel(provider(key,fetcher));
        await user('configure_sleekflow',{p_key:key});
      } else if (body.action != null && body.action !== 'sync') return reply({error:'invalid_request'},400);
      run = await rpc('begin_sleekflow_sync',{});
      if (run.status !== 'ready') return reply({status:run.status});
      const rows = await fetchProspects(provider(run.api_key,fetcher,AbortSignal.timeout(105000)),run.label);
      const count = await rpc('finish_sleekflow_sync',{p_run_id:run.run_id,p_rows:rows,p_error:null});
      return reply({status:'synced',count});
    } catch(error) {
      const code = safeError(error);
      if (run?.run_id) { try { await rpc('finish_sleekflow_sync',{p_run_id:run.run_id,p_rows:null,p_error:code}); } catch { /* Never log keys, messages or upstream errors. */ } }
      return reply({error:code},503);
    }
  };
}
