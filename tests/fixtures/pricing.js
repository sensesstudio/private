export const pricingPackages = ['1:1','1:2'].flatMap(format => [
  { suffix:'trial',name:'Trial session',credits:1,price:format==='1:1'?900:1200,months:1,is_trial:true },
  { suffix:'single',name:'Single class',credits:1,price:format==='1:1'?1200:1600,months:1 },
  { suffix:'5',name:'5-class pack',credits:5,price:format==='1:1'?4750:6500,months:3 },
  { suffix:'10',name:'10-class pack',credits:10,price:format==='1:1'?9000:12000,months:6,tag:'Most chosen' },
].map((p,i)=>({id:`p${format.replace(':','')}-${p.suffix}`,name:p.name,credits:p.credits,price_hkd:p.price,validity_months:p.months,is_trial:!!p.is_trial,tag:p.tag||null,format,sort_order:i+1})));
