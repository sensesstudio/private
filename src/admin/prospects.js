export const PROSPECT_STATUSES = ['matching teacher','pending teacher','pending payment','pending us','confirmed booking'];
export const statusLabel = value => value[0].toUpperCase() + value.slice(1);
export function visibleProspects(rows,{query='',status='all',scope='active',sort='next_action_date:asc'}) {
  const term=query.trim().toLowerCase(),phone=term.replace(/\D/g,'');
  const [field,direction]=sort.split(':');
  return rows.filter(r=>(scope==='all'||r.source_present===(scope==='active'))&&(status==='all'||r.status===status)&&
    (!term||`${r.client_name} ${r.mobile||''} ${r.remarks}`.toLowerCase().includes(term)||(phone.length>2&&(r.mobile||'').replace(/\D/g,'').includes(phone))))
    .sort((a,b)=>{
      const x=a[field],y=b[field];
      if (!x&&!y) return a.id.localeCompare(b.id);
      if (!x) return 1;if (!y) return -1;
      return String(x).localeCompare(String(y),undefined,{sensitivity:'base'})*(direction==='desc'?-1:1)||a.id.localeCompare(b.id);
    });
}
export const SYNC_ERRORS={
 invalid_key:'The API key was not accepted. Check your SleekFlow Platform API access.',
 label_not_found:'The label “Private - Prospect” was not found uniquely in SleekFlow. Check its name and try again.',
 rate_limited:'SleekFlow’s API limit was reached. The next scheduled sync will try again.',
 source_changed:'Contacts changed during the sync. Your saved records are unchanged; the next sync will retry.',
 source_format:'SleekFlow returned an unexpected format. Saved records are unchanged; please contact the studio administrator.',
 too_many_contacts:'The number of matching prospects exceeds the current sync limit. Saved records are unchanged.',
 sync_unavailable:'SleekFlow sync could not finish. Check the connection and try again.',
 admin_access_required:'Please sign in again with your admin account.',
};
