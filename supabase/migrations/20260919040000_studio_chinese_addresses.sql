-- Studio cards show the address only. The marketing taglines are removed and
-- each open studio gains its Chinese address beside the English one.
alter table public.studios add column if not exists address_zh text;
update public.studios set note=null;
update public.studios set address_zh=case id
  when 'central' then '中環皇后大道中80號H Queen’s 17樓'
  when 'cwb' then '銅鑼灣勿地臣街 11 號 The Hedon 20 樓'
  when 'kt' then '觀塘成業街 10 號電訊一代廣場 (TG Place) 30 樓 B 室'
  end where id in ('central','cwb','kt');
