import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchServices, matchServices, normalizeService, hkDate } from '../supabase/functions/_shared/client-services.js';
const raw = { ClientId:'0012345678901234567890',Id:123,Name:'Private 5',Count:5,Remaining:2,PaymentDate:'2026-09-01T00:00:00Z',ExpirationDate:'2026-12-01T00:00:00Z',Current:true };
const service = normalizeService(raw,new Set([raw.ClientId]));
const pack = { id:'pack1',client_id:raw.ClientId,package_name:'Private 5',total_credits:5,purchase_date:'2026-09-01',version:1 };
test('Mindbody matching uses purchase identity, never guesses between repeated packages',()=>{
 assert.equal(matchServices([pack],[service])[0].status,'synced');
 assert.equal(matchServices([pack],[service,{...service,service_id:'456'}])[0].status,'needs_review');
 assert.ok(matchServices([pack,{...pack,id:'duplicate'}],[service]).every(r=>r.status==='needs_review'));
 assert.equal(matchServices([pack],[{...service,name:'Renamed',remaining:0}], [{package_id:'pack1',service_id:'123'}])[0].remaining,0);
 assert.equal(matchServices([pack],[{...service,service_id:'999'}],[{package_id:'pack1',service_id:'123'}])[0].status,'not_found');
 assert.throws(()=>matchServices([pack],[service,service]),/duplicate_service_identity/);
 assert.throws(()=>normalizeService({...raw,ClientId:123},new Set([raw.ClientId])),/client_id_mismatch/);
 assert.equal(normalizeService({...raw,Remaining:-1},new Set([raw.ClientId])),null);
 assert.equal(hkDate('2026-09-30T18:00:00Z'),'2026-10-01');
});
test('service retrieval paginates fully, includes exhausted services and rejects partial data',async()=>{
 const paths=[];
 const result=await fetchServices(async path=>{paths.push(path);return {ClientServices:[{...raw,Id:123+paths.length}],PaginationResponse:{TotalResults:2}}},'token',[raw.ClientId],'2026-08-31','2026-09-30');
 assert.equal(result.length,2); assert.match(paths[1],/request.offset=1/); assert.match(paths[0],/request.showActiveOnly=false/);
 assert.ok(decodeURIComponent(paths[0]).includes(raw.ClientId));
 await assert.rejects(fetchServices(async()=>({ClientServices:[],PaginationResponse:{TotalResults:3}}),'token',[raw.ClientId],'2026-08-31','2026-09-30'),/incomplete_services/);
});

test('single-client query safely handles omitted ownership fields and string purchase IDs',async()=>{
 const result=await fetchServices(async path=>{
  assert.match(path,/request.clientId=0012345678901234567890/);
  return {ClientServices:[{...raw,ClientId:null,Id:'123'}],PaginationResponse:{TotalResults:1}};
 },'token',[raw.ClientId],'2026-08-31','2026-09-30');
 assert.equal(result[0].client_id,raw.ClientId); assert.equal(result[0].service_id,'123');
 await assert.rejects(fetchServices(async()=>({ClientServices:[{...raw,ClientId:'another-client'}],PaginationResponse:{TotalResults:1}}),'token',[raw.ClientId],'2026-08-31','2026-09-30'),/client_id_mismatch/);
});
