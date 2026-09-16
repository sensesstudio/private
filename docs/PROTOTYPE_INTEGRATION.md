# Live prototype layouts — 16 September 2026

The uploaded Aligned prototype supplies the visual structure; its sample clients,
bookings, payment methods, reviews, medical observations and charts are not used
by the live portals. Existing live availability, protected CRM records, account
access and Stripe package checkout remain connected through their current APIs.
The shared light beige surface remains #FAF7F3. UI copy is English.

## Client pages

The bottom navigation is Home, Book, Match for me, Pricing and Profile. Home has
an anonymous welcome and an authenticated view using the account snapshot.
Profile restores the avatar, espresso progress/credits cards, recorded next visit,
focus area and menu. Milestones use actual cumulative private attendance; missing
counts remain unknown, and exact multiples of ten start a new ten-session block.
The progress details never infer physical improvement or invent coaching notes.

Profile opens: About me (the original intake sections with unavailable inputs),
Bookings (Upcoming/Past), Favourite teachers, Progress log, Payment & packages,
Studios & locations, Preferences, Terms & Conditions and Liability waiver.
Terms and waiver text come from the supplied project. Waiver signing and status
are explicitly unavailable; the page does not record consent. Notification
preferences are not switched on. No fake card, receipt or payment success appears.
Instructor detail includes teaching information, certifications, availability
and a separate client-review frame.

Packages and visits use only my_client_account(), never the admin directory.
Source dates remain visible: attendance is the imported studio snapshot, while
matched package balances use the last available Mindbody sync. Passed next-visit
snapshots are labelled accordingly. All packages remain accessible; a preview
card does not combine ambiguous balances or mark a payment as completed.

## Teacher and admin

Teacher restores Today, Availability, Sessions, Earnings and Profile in the
original responsive workspace. Availability remains editable against the live
API. Today's openings and public instructor details use the live reference
snapshot. Sessions, progress note entry, earnings, payouts and reflections show
explicitly unconnected frames until their production workflows are wired.

Admin keeps its original eight sections, real Clients tools and Room schedule.
Already-restored management frames remain empty when their source is unconnected.

## Validation and limitations

Desktop and mobile browser checks cover all client menu destinations, milestones,
package/visit isolation, first-password gating, teacher navigation and availability
editing. Existing tests cover all eight admin sections and absence of demo records.
Private account data is held in component memory and cleared on sign-out/failure.
The prototype's localStorage demo stores are not used for these pages.

This is a layout integration. It does not claim that coach notes, intake editing,
saved favourites, notifications, waiver signing, payment history, teacher session
management or earnings are operational. Those integrations need real data and
save/read paths before enabling their actions.
