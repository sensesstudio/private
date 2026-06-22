-- Seed the packages catalogue. The create-checkout Edge Function reads the
-- authoritative price from this table (never from the browser), so a row must
-- exist for every package id used by the client (see src/data.js PACKAGES).
--
-- Two formats — private 1:1 and semi-private 1:2 — each with trial, single
-- class, 5-class and 10-class packs. Upsert so this is safe to re-run and easy
-- to amend later: change a price here (or in the dashboard) and checkout
-- charges the new amount.

insert into packages (id, name, credits, price_hkd, validity_months, tag) values
  -- Private 1:1
  ('p11-trial',  'Trial session (1:1)',  1,  900,   null, 'Begin'),
  ('p11-single', 'Single class (1:1)',   1,  1200,  null, null),
  ('p11-5',      '5-class pack (1:1)',    5,  4750,  3,    null),
  ('p11-10',     '10-class pack (1:1)',   10, 9000,  6,    'Most chosen'),
  -- Semi-private 1:2 (prices are the total for two sharing the session)
  ('p12-trial',  'Trial session (1:2)',  1,  1200,  null, 'Begin'),
  ('p12-single', 'Single class (1:2)',   1,  1600,  null, null),
  ('p12-5',      '5-class pack (1:2)',    5,  6500,  3,    null),
  ('p12-10',     '10-class pack (1:2)',   10, 12000, 6,    'Most chosen')
on conflict (id) do update set
  name            = excluded.name,
  credits         = excluded.credits,
  price_hkd       = excluded.price_hkd,
  validity_months = excluded.validity_months,
  tag             = excluded.tag;
