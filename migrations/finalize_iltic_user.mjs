const API = 'https://gfe4bd9y.eu-central.insforge.app/api/database/advance/rawsql';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';
const ILTIC_ID = '4a104167-b2fd-475a-9d40-c0be906cde11';

async function q(sql) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({ query: sql }),
  });
  const data = await r.json();
  if (r.status >= 400) throw new Error(JSON.stringify(data));
  return data.rows;
}

async function run() {
  // 1. Verify email
  await q("UPDATE auth.users SET email_verified = true WHERE email = 'admin@iltic.bf'");
  console.log('admin@iltic.bf email verified');

  // 2. Get user id
  const users = await q("SELECT id FROM auth.users WHERE email = 'admin@iltic.bf'");
  const userId = users[0].id;
  console.log('User ID:', userId);

  // 3. Create user_profile
  await q(`INSERT INTO user_profiles (user_id, company_id, role, full_name)
    VALUES ('${userId}', '${ILTIC_ID}', 'admin', 'Admin ILTIC')
    ON CONFLICT DO NOTHING`);
  console.log('user_profile created');

  // 4. Final check
  const profiles = await q(`
    SELECT up.full_name, up.role, c.name as company_name, au.email, au.email_verified
    FROM user_profiles up
    JOIN companies c ON c.id = up.company_id
    JOIN auth.users au ON au.id::text = up.user_id
    WHERE au.email_verified = true
    ORDER BY c.name
  `);
  console.log('\n=== COMPTES ACTIFS ===');
  console.log(JSON.stringify(profiles, null, 2));
}

run().catch(console.error);
