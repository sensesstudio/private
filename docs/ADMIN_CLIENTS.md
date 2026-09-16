# Admin Clients CSV snapshots

Admin → Clients reads the latest complete CSV import from Supabase. It retains
the original Admin workspace and English labels, with search, package expiry
filters, pagination and a detail page containing every source field.

This is a dated CSV snapshot, not continuous Mindbody client sync. The date is
validated against every row's `Expiry_date - Days_to_expiry`. Package status,
credits and visits are labeled with that snapshot date. The source has no last
visit timestamp, so the UI does not invent one. `Visits_since_Jun` is shown once
per client, never summed across packages. IDs and phone numbers stay text.

All source rows are preserved, including exact duplicate rows. Duplicates are
flagged with the first matching CSV row number and remain included in balances.
Missing visits are unknown, not zero. Original strings for all 13 columns are
retained in `raw_data` for reconciliation.

## Data and access

- `admin_client_imports`: source filename, SHA-256, snapshot date, import time
  and row count. A repeated file hash is idempotent.
- `admin_client_packages`: one record per CSV row, scoped to an import.
- `admin_client_directory()`: one consistent complete snapshot; checks the
  protected `profiles.role` through `is_admin()`, uses invoker security and RLS,
  and sets `Cache-Control: no-store`.
- Tables allow authenticated admin reads only. Anonymous, client and teacher
  access cannot read client data. Browser roles cannot write imports.
- `import_admin_client_packages(source_file, source_sha256, as_of, rows)` is an
  atomic, service-role-only import operation. `rows` is a JSON array of the 13
  original CSV columns, with string values and empty strings retained.

Deploy the schema through the existing GitHub `supabase` workflow. Then send
the CSV data through a trusted private database connection. Never commit CSV
contents, client-bearing SQL, responses, credentials or real-data screenshots.
Verify the imported raw rows against the source, including order and totals.
The frontend uses component memory only; failed refresh and sign-out clear it.

Imported balances are read-only CRM information. Importing does not create
Auth accounts or alter the booking credit ledger, payments or bookings. These
records are not exposed through `availability_snapshot` or realtime feeds.

Tests use synthetic fixtures only. Database tests cover RLS, role restrictions,
idempotency, rollback, blank values and long IDs. Desktop/mobile tests cover
search, full package details, pagination, failures, empty imports and sign-out.
