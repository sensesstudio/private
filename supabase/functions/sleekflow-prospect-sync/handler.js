import { provider, findLabel, fetchProspects, removeProspectLabel } from './provider.js';
const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Cache-Control':'no-store', 'Content-Type':'application/json' };
const reply = (data,status=200) => new Response(JSON.stringify(data),{status,headers:cors});
const safeError = error => ['invalid_key','rate_limited','label_not_found','source_changed','source_format','too_many_contacts'].includes(error?.message) ? error.message : 'sync_unavailable';
const boards = {
  prospects: {label:'Private - Prospect',begin:'begin_sleekflow_sync',finish:'finish_sleekflow_sync'},
  booking_in_progress: {label:'Private - Booking in Progress',begin:'begin_booking_progress_sync',finish:'finish_booking_progress_sync'},
};
export function createHandler({ syncKey, authorize, rpc, fetcher = fetch }) {
  async function syncBoard(board) {
    const config=boards[board];let run;
    try {
      run=await rpc(config.begin,{});
      if(run.status!=='ready')return {status:run.status};
      const rows=await fetchProspects(provider(run.api_key,fetcher,AbortSignal.timeout(105000)),config.label);
      const count=await rpc(config.finish,{p_run_id:run.run_id,p_rows:rows,p_error:null});
      return {status:'synced',count};
    } catch(error) {
      const code=safeError(error);
      if(run?.run_id) {try {await rpc(config.finish,{p_run_id:run.run_id,p_rows:null,p_error:code});}catch {/* Never log keys, messages or upstream errors. */}}
      return {error:code};
    }
  }
  return async req => {
    if (req.method === 'OPTIONS') return new Response(null,{status:204,headers:cors});
    if (req.method !== 'POST') return reply({error:'method_not_allowed'},405);
    try {
      const scheduled = Boolean(syncKey) && req.headers.get('x-sync-key') === syncKey;
      const user = scheduled ? null : await authorize(req.headers.get('authorization') || '');
      if (!scheduled && !user) return reply({error:'admin_access_required'},403);
      let body;
      try { body = await req.json(); } catch { return reply({error:'invalid_request'},400); }
      if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'invalid_request'},400);
      const board=body.board??'prospects';
      if(typeof board!=='string'||!Object.hasOwn(boards,board))return reply({error:'invalid_request'},400);
      if (body.action === 'remove-prospect') {
        if(scheduled||board!=='prospects')return reply({error:'admin_access_required'},403);
        if(typeof body.id!=='string'||!body.id||body.id.length>200||!Number.isInteger(body.version)||body.confirmed!==true)return reply({error:'invalid_request'},400);
        const directory=await user('admin_prospect_directory',{});
        if(!directory.rows?.some(r=>r.id===body.id&&r.version===body.version&&r.source_present))return reply({error:'source_changed'},409);
        let run;
        try {
          run=await rpc(boards.prospects.begin,{});
          if(run.status!=='ready')return reply({status:run.status});
          const api=provider(run.api_key,fetcher,AbortSignal.timeout(105000));
          await removeProspectLabel(api,body.id);
          const rows=await fetchProspects(api);
          if(rows.some(r=>r.id===body.id))throw new Error('source_changed');
          await rpc(boards.prospects.finish,{p_run_id:run.run_id,p_rows:rows,p_error:null});
          return reply({status:'removed'});
        }catch(error){
          const code=safeError(error);
          if(run?.run_id){try{await rpc(boards.prospects.finish,{p_run_id:run.run_id,p_rows:null,p_error:code});}catch{}}
          return reply({error:code},503);
        }
      }
      if (body.action === 'connect') {
        if (scheduled) return reply({error:'admin_access_required'},403);
        const key = typeof body.api_key === 'string' ? body.api_key.trim() : '';
        if (key.length < 10 || key.length > 4096 || /\s/.test(key)) return reply({error:'invalid_key'},400);
        await findLabel(provider(key,fetcher),boards[board].label);
        await user('configure_sleekflow',{p_key:key});
      } else if (body.action != null && body.action !== 'sync') return reply({error:'invalid_request'},400);
      // The existing cron refreshes both labels. Each snapshot has its own lease
      // and error state, so one missing label cannot erase or block the other.
      if(scheduled&&body.board==null) {
        const results=Object.fromEntries(await Promise.all(Object.keys(boards).map(async name=>[name,await syncBoard(name)])));
        const failed=Object.values(results).some(result=>result.error);
        return reply({status:failed?'partial':'synced',results},failed?503:200);
      }
      const result=await syncBoard(board);
      return reply(result,result.error?503:200);
    } catch(error) { return reply({error:safeError(error)},503); }
  };
}
