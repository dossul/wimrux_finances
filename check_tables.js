const BASE = 'https://gfe4bd9y.eu-central.insforge.app';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTAwNjN9.J71GoMBih3RietpuMmXLeLEU3664bu1jzI3KFZg3dPU';

const TABLES = [
  'user_profiles', 'companies', 'company_subscriptions',
  'company_role_permissions', 'user_role_assignments', 'company_custom_roles',
];

async function main() {
  const loginRes = await fetch(`${BASE}/api/auth/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ email: 'admin@westago.bf', password: 'WestagoAdmin2026!' }),
  });
  const { accessToken } = await loginRes.json();
  const headers = { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' };

  for (const table of TABLES) {
    const r = await fetch(`${BASE}/api/database/records/${table}?select=*&limit=1`, { headers });
    const body = await r.text();
    const ok = r.status === 200 ? '✅' : '❌';
    const msg = r.status !== 200 ? body.substring(0, 100) : `${JSON.parse(body).length} rows`;
    console.log(`${ok} ${table} [${r.status}]: ${msg}`);
  }
}

main().catch(e => console.error('CRASH:', e));
