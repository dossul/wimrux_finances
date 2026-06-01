// Test direct du backend InsForge - pas de navigateur, pas de DOM
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTAwNjN9.J71GoMBih3RietpuMmXLeLEU3664bu1jzI3KFZg3dPU';
const BASE = 'https://gfe4bd9y.eu-central.insforge.app';

async function main() {
  console.log('=== TEST 1: Login admin@westago.bf ===');
  const r = await fetch(`${BASE}/api/auth/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({
      email: 'admin@westago.bf',
      password: 'WestagoAdmin2026!',
    }),
  });
  console.log('Status:', r.status);
  const body = await r.text();
  console.log('Body:', body.substring(0, 800));
}

main().catch(e => console.error('CRASH:', e));
