# Client access and attendance (2026-09-16)

Admin → Clients → select a client → Client login → verify email → Create login.
The server creates a Supabase Auth client with a unique three-word/four-digit
password, binds its UUID to exactly one studio client ID, and returns the
credentials once. The admin hands them directly to the verified client. No
invitation is sent, no CSV/mobile-based passwords are used, and existing Auth
accounts are never overwritten or automatically linked by matching email.

Client → My account (or `/?account=1#client`) accepts email/password. The first
login requires a different password (12–72 characters, letters and numbers)
before the CRM data projection returns any packages or attendance. Password
verification and change use Auth APIs; only the server may activate the CRM
link. Packages and attendance are selected by the authenticated UUID's explicit
mapping, not by a client-supplied ID or user metadata. The underlying CRM tables
retain admin-only RLS. New endpoints send Cache-Control: no-store; private
records and temporary credentials are never written to browser storage.

This first release supports new login assignment only. Existing-email
collisions, account relinking and forgotten-password recovery need studio
support; no bulk account creation, password reset, or notification occurs on
deployment. A lost one-time credential response also needs support. Editing a
CRM contact email does not change an existing Auth login email.

Client packages use the same last available Mindbody values as Admin Clients
(with source/update notices), and remain separate from online checkout credits.
Last visit, next visit and Private lifetime are CSV snapshots, not a complete
Mindbody visit history. Private lifetime is the per-client cumulative attendance
from `Private_sessions_lifetime` (column P); it is never summed across package
rows. Zero means zero; missing means unknown. Column Q is preserved in private
raw import evidence but is not displayed by this request.

Admin Clients defaults to Next visit ascending with missing dates last. Lifetime
attendance can also be sorted. The latest CSV adds evidence only: existing studio
package IDs, balances, admin edits and Mindbody links are preserved.

Validation: database ownership/RLS tests; server authentication, duplicate and
rollback tests; desktop/mobile account provisioning, first-password change,
private record rendering and sign-out tests. Fixtures are synthetic. Live
customer account creation is performed by an admin, not by the test suite.
