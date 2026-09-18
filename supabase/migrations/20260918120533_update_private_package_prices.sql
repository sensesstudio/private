-- Owner-approved 1:1 catalogue prices. Existing orders retain their agreed price.
update public.packages
set price_hkd = case id
  when 'p11-trial' then 1000
  when 'p11-5' then 5250
  when 'p11-10' then 10000
end
where format = '1:1' and id in ('p11-trial', 'p11-5', 'p11-10');
