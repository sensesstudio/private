# Client Pricing and Stripe Checkout

The live Client portal has Browse, Match for me and Pricing. Pricing uses the
active Supabase catalogue, not the demo constants. Private 1:1 prices match the
owner's reference (HK$900, 1,200, 4,750, 9,000); semi-private 1:2 prices use the
existing project catalogue (HK$1,200, 1,600, 6,500, 12,000, total for two people).
Both formats offer trial, single, five and ten sessions, with validity of one,
one, three and six months from the first visit. Old catalogue IDs are retained
for historical references and are not offered for sale.

## Payment flow

1. A guest browses prices, then signs in or creates a client account. Email
   confirmation is respected. Signup cannot assign a staff role.
2. `create-checkout` verifies the bearer token with Supabase Auth. A service-only
   database function reserves an order from the current catalogue, storing its
   price, credits, format and validity. A pending order is reused. A paid trial
   cannot be bought again by that account in that format.
3. Stripe-hosted Checkout uses the order snapshot, a fixed origin allowlist,
   English locale, dynamic payment methods and an order-specific idempotency key.
   Prices or client IDs sent by the browser are never authoritative. No card
   details are collected in the app.
4. The signed webhook retrieves the current Stripe Session and fulfills only
   a paid payment. `fulfill_package_checkout` validates the amount, currency,
   client, Session and live/test mode before committing payment plus credit
   ledger entry in one transaction. Unique keys and a row lock prevent duplicate
   credits. Database failures return 500 so Stripe retries.
5. The checkout return independently verifies the Session server-side and uses
   the same fulfillment function. A success query parameter is not payment
   proof. Pending payments are polled, with a manual retry. Paid purchases appear
   under “Your purchases on this app”, protected by RLS and explicit ownership.

The webhook processes completed, async success/failure and expired Checkout
Sessions for this integration only. Uncertain old reservations without a saved
Session ID are retained for studio review instead of risking a second charge.
The existing credit balance view now uses invoker security so RLS applies.

## Deployment and configuration

The main-branch Supabase workflow deploys the migration, `create-checkout` and
`stripe-webhook`. Both use JWT verification off at the gateway: the former checks
Auth itself and the latter requires a verified Stripe signature. Secrets remain
in Supabase's secret storage: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
Use a restricted key with the necessary Accounts read and Checkout Sessions
read/write permissions where possible. The configured merchant must be the
connected Senses Studio account. Production defaults to live mode; only explicit
`STRIPE_MODE=test` plus a test key permits test mode, labeled in Pricing.

The public readiness action exposes only availability and live/test mode. It
checks key mode, webhook-secret presence, merchant identity and charges enabled.
It does not expose secrets. If readiness fails, package cards remain visible but
purchase buttons are disabled. No credentials or real client fixtures belong in
this public repository.

## Current boundaries

Package purchases do not reserve sessions or write to Mindbody. The first visit
is arranged with the studio; automatic per-package activation, expiry deductions,
refund synchronization and Mindbody credit write-back are separate work. Purchased
session counts are labeled as purchases, not a calculated remaining balance.
CSV-imported legacy package balances remain separate read-only Admin snapshots.

Tests use synthetic identities and payments only: database permissions, exact
amount checks, atomic rollback, idempotency, trial restrictions, handler signature
gating, async payment handling, UI authentication, redirect, pending/confirmed
return states, signup, missing catalogue and disabled payments. No live payment
is submitted by automated tests.
