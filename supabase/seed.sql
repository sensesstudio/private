-- Senses Studio — reference-data seed (safe to re-run).
-- Teacher/client rows are created through Supabase Auth (they need auth.users),
-- so they're not seeded here; studios and packages are pure reference data.

insert into studios (id, name, blurb, note, sea) values
  ('central', 'Central',      'Refined energy in the heart of the city', 'Flagship · 3 reformer studios', false),
  ('cwb',     'Causeway Bay', 'Vibrant and social — always in motion',   'Open late · 6 days',           false),
  ('qb',      'Quarry Bay',   'Sea-view stillness above the harbour',    'Harbour-view studio',          true),
  ('kt',      'Kwun Tong',    'Industrial calm, athletic focus',         'Largest mat space',            false),
  ('lck',     'Lai Chi Kok',  'Quiet, local and grounded',               'Neighbourhood studio',         false)
on conflict (id) do update set
  name = excluded.name, blurb = excluded.blurb, note = excluded.note, sea = excluded.sea;

insert into packages (id, name, credits, price_hkd, validity_months, tag) values
  ('trial',   'First session', 1,  900,  3, 'Begin'),
  ('starter', '5-class pack',  5,  4750, 3, ''),
  ('studio',  '10-class pack', 10, 9000, 6, 'Most chosen')
on conflict (id) do update set
  name = excluded.name, credits = excluded.credits, price_hkd = excluded.price_hkd,
  validity_months = excluded.validity_months, tag = excluded.tag;
