# Admin client attendance

Last visit and next visit currently come from private CSV snapshots. The admin interface identifies this source; Mindbody auto-sync currently updates package usage and expiry only.

Next bookings are stored as timestamps with the CSV interpreted in Asia/Hong_Kong. The original studio/class text is preserved, together with an explicit no-booking flag. Missing data remains distinct from no booking. Original CSV rows stay private and are not committed to GitHub.

## Planned Mindbody cutover

Replace the attendance snapshot readings with a private, per-client Mindbody sync when that phase is requested. Include both class bookings and appointments across the studio locations, use the earliest eligible upcoming booking and the latest attended visit, and exclude cancelled bookings. Keep timestamps in Hong Kong time in the UI and preserve last-known values with a stale/error state when Mindbody cannot be reached. Maintain the existing admin-only access and keep CSV provenance separate from live readings. Do not infer attendance from the June visit count or from room availability.
