const BASE = 'https://gfe4bd9y.eu-central.insforge.app';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTAwNjN9.J71GoMBih3RietpuMmXLeLEU3664bu1jzI3KFZg3dPU';

async function main() {
  // Login
  const loginRes = await fetch(`${BASE}/api/auth/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ email: 'admin@westago.bf', password: 'WestagoAdmin2026!' }),
  });
  const loginData = await loginRes.json();
  const userId = loginData.user?.id;
  const accessToken = loginData.accessToken;
  console.log('User ID:', userId);

  // InsForge utilise PostgREST → endpoint est /rest/v1/
  const endpoints = [
    `/rest/v1/user_profiles?user_id=eq.${userId}&select=*`,
    `/rest/v1/user_profiles?select=*`,
  ];

  for (const ep of endpoints) {
    const r = await fetch(`${BASE}${ep}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': ANON_KEY,
        'Accept': 'application/json',
      },
    });
    console.log(`\n${ep}`);
    console.log('Status:', r.status);
    const body = await r.text();
    console.log('Body:', body.substring(0, 600));
  }
}

main().catch(e => console.error('CRASH:', e));
