"""Add exact client OAuth returns during the main-branch deployment.

Preserve existing provider credentials and URLs. Enable Google if its OAuth
credentials are already configured; never print the API configuration.
"""
import json
import os
import urllib.error
import urllib.request

endpoint = f"https://api.supabase.com/v1/projects/{os.environ['PROJECT_REF']}/config/auth"
headers = {"Authorization": f"Bearer {os.environ['SUPABASE_ACCESS_TOKEN']}", "Content-Type": "application/json"}

def request(method, payload=None):
    body = None if payload is None else json.dumps(payload).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(endpoint, data=body, headers=headers, method=method), timeout=30) as response:
            return json.load(response)
    except (urllib.error.URLError, ValueError):
        raise SystemExit("Could not configure client OAuth redirects; check the Supabase Auth dashboard.") from None

config = request('GET')
urls = [url.strip() for url in (config.get('uri_allow_list') or '').split(',') if url.strip()]
for destination in ('account', 'pricing'):
    url = f'https://sensesprivate.up.railway.app/?{destination}=1&oauth=google'
    if url not in urls:
        urls.append(url)
updated = ','.join(urls)
patch = {}
if updated != (config.get('uri_allow_list') or ''):
    patch['uri_allow_list'] = updated
if config.get('external_google_client_id') and config.get('external_google_secret'):
    patch['external_google_enabled'] = True
if patch:
    request('PATCH', patch)
verified = request('GET')
if not set(urls).issubset(set((verified.get('uri_allow_list') or '').split(','))):
    raise SystemExit('Client OAuth redirect verification failed.')
print('Client OAuth redirects are configured.')
print('Google provider enabled.' if verified.get('external_google_enabled') else 'Google OAuth credentials need setup in the Supabase dashboard.')
