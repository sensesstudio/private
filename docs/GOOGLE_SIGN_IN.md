# Client Google sign-in

The client Profile login and Pricing sign-in sheet use Supabase Google OAuth
with PKCE. The button checks `/auth/v1/settings` and stays disabled with an
honest message until the Google provider is enabled. Existing email sign-in
continues to work. No Google client secret belongs in GitHub or Vite variables.

## One-time dashboard setup

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview)
   and select the studio's Google Cloud project. Set Branding to Senses Studio
   and Audience to External. Use only `openid`, email and profile scopes.
   During Testing, add the studio's test Google accounts. Publish the app to
   Production when it is ready for all clients; complete any Google-required
   branding or domain verification.
2. In Clients, create an OAuth client with type **Web application**.
   Authorized JavaScript origin: `https://sensesprivate.up.railway.app`.
   Authorized redirect URI:
   `https://wvyqxafhiawwyexiggxh.supabase.co/auth/v1/callback`.
3. Open [Supabase Authentication → Sign In / Providers](https://supabase.com/dashboard/project/wvyqxafhiawwyexiggxh/auth/providers),
   select Google, enter the Client ID and Client Secret directly there, enable
   the provider and save. Keep nonce validation enabled.
4. In [URL Configuration](https://supabase.com/dashboard/project/wvyqxafhiawwyexiggxh/auth/url-configuration),
   confirm the site's URL. The main deployment adds these two exact redirect
   URLs while preserving the existing list:
   - `https://sensesprivate.up.railway.app/?account=1&oauth=google`
   - `https://sensesprivate.up.railway.app/?pricing=1&oauth=google`
5. Reload Client → Profile. Test with a studio-owned Google account whose
   email matches its linked client login. Confirm only its packages and visits
   appear. Test a different email, cancellation, reload, sign-out, and pricing.
   Pricing returns to the catalogue; Google login never starts a payment.

When the custom domain is ready, register that origin and its two exact
Supabase return URLs too. Do not add broad wildcard redirects in production.

## Identity and access

Supabase automatically links a verified Google identity to an existing Auth
user with the same email. That user keeps its existing explicit
`studio_client_accounts` mapping. A different email is not automatically
matched to a CRM record; it sees the existing contact-studio message.

Google sessions can read their own linked records without first choosing a
studio password. The private snapshot function requires the Auth-issued OAuth
AMR, a verified Google identity on the same user with the linked login email,
and a current real Auth session. It never changes `password_changed_at`.
Temporary-password sessions still require a password change, even after Google
has been linked. Admin reset session cutoffs and operation locks still apply.
Google login does not change profile roles or grant admin or teacher access.

References: [Google provider](https://supabase.com/docs/guides/auth/social-login/auth-google),
[identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking),
[JWT AMR](https://supabase.com/docs/guides/auth/jwt-fields).
