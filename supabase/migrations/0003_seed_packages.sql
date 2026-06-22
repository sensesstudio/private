-- Seed the packages catalogue. The create-checkout Edge Function reads the
-- authoritative price from this table (never from the browser), so a row must
-- exist for every package id used by the client (see src/data.js PACKAGES).
--
-- Upsert so this migration is safe to re-run and easy to amend later: change a
-- price here (or in the dashboard) and checkout charges the new amount.

insert into packages (id, name, credits, price_hkd, validity_months, tag) values
  ('trial',   'First session', 1,  900,  null, 'Begin'),
  ('starter', '5-class pack',  5,  4750, 3,    null),
  ('studio',  '10-class pack', 10, 9000, 6,    'Most chosen')
on conflict (id) do update set
  name            = excluded.name,
  credits         = excluded.credits,
  price_hkd       = excluded.price_hkd,
  validity_months = excluded.validity_months,
  tag             = excluded.tag;
