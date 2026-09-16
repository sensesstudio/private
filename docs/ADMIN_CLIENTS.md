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

## Editable studio records and automatic Mindbody readings (16 September 2026)

Admin → Clients supports Add client, then Edit client / Add package / Edit package
inside a client's detail view. Clients may have no packages. New manual IDs are
server-generated; imported Mindbody client IDs stay immutable text. These are CRM
records, not Auth accounts, Stripe charges or online booking credits.

`studio_clients` / `studio_client_packages` are backfilled from the latest CSV.
Original imports and all raw fields remain immutable. New CSV snapshots remain
source evidence; they do **not** overwrite edited studio records automatically.
Future CSV imports need explicit reconciliation against these working records.
Admin-only RLS, restricted column grants, validated RPCs, optimistic versions and
append-only audit history in `private.studio_client_changes` protect edits. No deletes.

`mindbody-client-sync` runs server-side every 15 minutes with `x-sync-key`. It pages
GetClientServices for the imported clients, including exhausted/inactive services,
and stores only matching readings in admin-only `mindbody_package_links`.
Initial matching requires exact normalized package name + purchase date + original
session count within the same ClientId, with exactly one candidate on both sides.
Then the purchase-specific ClientService.Id is retained across later updates.
ProductId is not a purchase identity. Ambiguous CSV duplicates remain flagged and
unmatched. Missing matches never become zero balances. No source rows are deleted.
Manual clients/packages are not automatically linked, and new unrelated Mindbody
purchases are not imported into the directory by this sync.

Mindbody remaining/count/expiry are authoritative for matched packages; local
recorded values remain available separately. Matched identity/balance fields must
be changed in Mindbody. Monetary values and historical visits remain labelled
**Recorded**, since GetClientServices is not a payment or visit-history report.
The displayed sessions used = Count − Remaining (consumed units, not an attendance
list). An API error retains the last readings, with a delayed-update warning.

The mounted Admin Clients view reads the private directory every 60 seconds while
visible, and on focus. Refresh is optional. Editing forms retain their draft while
background updates arrive. No CRM data is stored in localStorage or the public
availability feed. Closing the page does not stop the server cron.

Primary API reference: Mindbody's official Public API SDK,
https://github.com/mindbody/Mindbody-API-SDKs/tree/main/PublicAPI,
`ClientServiceWithActivationType`, `GetClientServices`.
