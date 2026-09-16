"""Add exact client OAuth returns during the main-branch deployment.

Preserve all existing providers and URLs. Provider credentials are configured
in the Supabase dashboard; never print the Management API configuration.
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
if updated != (config.get('uri_allow_list') or ''):
    request('PATCH', {'uri_allow_list': updated})
verified = request('GET')
if not set(urls).issubset(set((verified.get('uri_allow_list') or '').split(','))):
    raise SystemExit('Client OAuth redirect verification failed.')
print('Client OAuth redirects are configured.')
print('Google provider enabled.' if verified.get('external_google_enabled') else 'Google provider needs activation in the Supabase dashboard.')
