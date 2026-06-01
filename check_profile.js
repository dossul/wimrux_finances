const BASE = 'https://gfe4bd9y.eu-central.insforge.app';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTAwNjN9.J71GoMBih3RietpuMmXLeLEU3664bu1jzI3KFZg3dPU';

async function main() {
  // 1. Login pour obtenir le token
  const loginRes = await fetch(`${BASE}/api/auth/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ email: 'admin@westago.bf', password: 'WestagoAdmin2026!' }),
  });
  const loginData = await loginRes.json();
  const userId = loginData.user?.id;
  const accessToken = loginData.accessToken;
  console.log('User ID:', userId);

  // 2. Chercher le profil dans user_profiles
  const profileRes = await fetch(`${BASE}/api/db/user_profiles?user_id=eq.${userId}&select=*`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'apikey': ANON_KEY },
  });
  console.log('Profile status:', profileRes.status);
  const profileBody = await profileRes.text();
  console.log('Profile body:', profileBody);

  // 3. Chercher les companies
  const companiesRes = await fetch(`${BASE}/api/db/companies?select=id,name,plan`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'apikey': ANON_KEY },
  });
  console.log('Companies status:', companiesRes.status);
  const companiesBody = await companiesRes.text();
  console.log('Companies:', companiesBody.substring(0, 500));
}

main().catch(e => console.error('CRASH:', e));
