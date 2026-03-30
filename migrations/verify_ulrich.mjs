const API = 'https://gfe4bd9y.eu-central.insforge.app/api/database/advance/rawsql';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';

async function q(sql) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({ query: sql }),
  });
  return (await r.json()).rows;
}

async function run() {
  await q("UPDATE auth.users SET email_verified = true WHERE email = 'ulrich@iltic.com'");
  console.log('ulrich@iltic.com verified');

  const res = await q("SELECT id, email, email_verified FROM auth.users ORDER BY created_at");
  console.log(JSON.stringify(res, null, 2));
}

run().catch(console.error);
