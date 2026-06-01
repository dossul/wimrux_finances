// Trouver le bon endpoint DB
const endpoints = [
  '/api/db/sql',
  '/api/admin/sql',
  '/api/admin/query',
  '/rest/v1/rpc/exec_sql',
];
const apiKey = 'ik_1358be6dcbccff7c0d6636b011559406';
const base = 'https://gfe4bd9y.eu-central.insforge.app';

for (const ep of endpoints) {
  const r = await fetch(base + ep, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ sql: 'SELECT 1' })
  });
  const txt = await r.text();
  console.log(ep, '->', r.status, txt.substring(0, 100));
}
