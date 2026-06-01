const BASE = 'https://gfe4bd9y.eu-central.insforge.app';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTAwNjN9.J71GoMBih3RietpuMmXLeLEU3664bu1jzI3KFZg3dPU';

async function main() {
  // Login
  const loginRes = await fetch(`${BASE}/api/auth/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ email: 'admin@westago.bf', password: 'WestagoAdmin2026!' }),
  });
  const { user, accessToken } = await loginRes.json();
  console.log('User ID:', user.id);

  const headers = { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' };

  // Chercher le profil
  const r1 = await fetch(`${BASE}/api/database/records/user_profiles?user_id=eq.${user.id}&select=*`, { headers });
  console.log('\n[user_profiles] status:', r1.status);
  console.log('[user_profiles] body:', (await r1.text()).substring(0, 600));

  // Chercher les companies
  const r2 = await fetch(`${BASE}/api/database/records/companies?select=id,name`, { headers });
  console.log('\n[companies] status:', r2.status);
  console.log('[companies] body:', (await r2.text()).substring(0, 600));
}

main().catch(e => console.error('CRASH:', e));
