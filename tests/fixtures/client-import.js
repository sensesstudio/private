// Synthetic data only. Never add an actual client export to this repository.
export const rawClientRows = [
  { ClientId: '1000000000000000000001', Name: 'Example Package Holder', Phone: '00123456789', Email: 'holder@example.test', Package: 'Example Private 10', Credits_left: '4', Total_credits: '10', 'Purchase_amount_HK$': '9000', 'Remaining_value_HK$': '3600', Purchase_date: '2026-09-01', Expiry_date: '2026-10-10', Days_to_expiry: '10', Visits_since_Jun: '7' },
  { ClientId: '1000000000000000000001', Name: 'Example Package Holder', Phone: '00123456789', Email: 'holder@example.test', Package: 'Example Private 5', Credits_left: '3', Total_credits: '5', 'Purchase_amount_HK$': '4500', 'Remaining_value_HK$': '2700', Purchase_date: '2026-09-15', Expiry_date: '2027-01-01', Days_to_expiry: '93', Visits_since_Jun: '7' },
];
rawClientRows.push({ ...rawClientRows[0] });
rawClientRows.push({ ...rawClientRows[0], ClientId: '1000000000000000000002', Name: 'Missing Contact Example', Phone: '', Email: '', Visits_since_Jun: '', Expiry_date: '2026-09-30', Days_to_expiry: '0' });
export function clientDirectoryFixture() {
  return {
    import: { id: 'aaaaaaaa-0000-4000-8000-000000000001', source_file: 'synthetic-clients.csv', as_of: '2026-09-30', imported_at: '2026-09-30T01:00:00Z', row_count: rawClientRows.length },
    rows: rawClientRows.map((r, i) => ({ next_visit_at: i === 3 ? null : '2026-10-02T10:30:00+08:00', next_visit_details: i === 3 ? null : 'Central Synthetic private session', no_upcoming_booking: i === 3, last_visit_date: i === 3 ? null : '2026-09-24', never_attended: i === 3, source_row: i + 2, client_id: r.ClientId, client_name: r.Name, phone: r.Phone, email: r.Email, package_name: r.Package,
      private_sessions_lifetime: i === 3 ? 0 : 14, credits_left: +r.Credits_left, total_credits: +r.Total_credits, purchase_amount_hkd: +r['Purchase_amount_HK$'], remaining_value_hkd: +r['Remaining_value_HK$'],
      purchase_date: r.Purchase_date, expiry_date: r.Expiry_date, days_to_expiry: +r.Days_to_expiry, visits_since_jun: r.Visits_since_Jun === '' ? null : +r.Visits_since_Jun, duplicate_of_row: i === 2 ? 2 : null })),
  };
}
