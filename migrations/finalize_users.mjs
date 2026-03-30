const API = 'https://gfe4bd9y.eu-central.insforge.app/api/database/advance/rawsql';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';

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

const ILTIC_ID   = '4a104167-b2fd-475a-9d40-c0be906cde11';
const WESTAGO_ID = '445329bd-a896-477a-9c32-836d1d17f5de';
const WIMRUX_ID  = 'b05de79e-4326-40f5-81ed-643e3c8a1117';

async function run() {
  // 1. Get all auth users
  console.log('=== AUTH USERS ===');
  const users = await q("SELECT id, email, email_verified FROM auth.users ORDER BY created_at");
  console.log(JSON.stringify(users, null, 2));

  // 2. Verify email for admin@westago.bf
  console.log('\n1. Verifying admin@westago.bf email...');
  await q("UPDATE auth.users SET email_verified = true WHERE email = 'admin@westago.bf'");
  console.log('  ✅ OK');

  // 3. Get WESTAGO user id
  const westago = await q("SELECT id FROM auth.users WHERE email = 'admin@westago.bf'");
  const westagoUserId = westago[0].id;
  console.log('  WESTAGO auth user_id:', westagoUserId);

  // 4. Create user_profile for WESTAGO if not exists
  console.log('\n2. Creating user_profile for WESTAGO...');
  await q(`INSERT INTO user_profiles (user_id, company_id, role, full_name)
    VALUES ('${westagoUserId}', '${WESTAGO_ID}', 'admin', 'Admin WESTAGO')
    ON CONFLICT DO NOTHING`);
  console.log('  ✅ OK');

  // 5. Link ulrich@iltic.com if no profile
  const ulrichId = '59538be7-58f1-439a-b05b-9852e050a672';
  const ulrichCheck = await q(`SELECT id FROM user_profiles WHERE user_id = '${ulrichId}'`);
  if (ulrichCheck.length === 0) {
    console.log('\n3. Linking ulrich@iltic.com to ILTIC...');
    await q(`INSERT INTO user_profiles (user_id, company_id, role, full_name)
      VALUES ('${ulrichId}', '${ILTIC_ID}', 'admin', 'Ulrich ILTIC')
      ON CONFLICT DO NOTHING`);
    console.log('  ✅ OK');
  }

  // 6. Check passwords — get all existing info
  console.log('\n=== FINAL: ALL USER PROFILES + AUTH ===');
  const profiles = await q(`
    SELECT up.full_name, up.role, c.name as company_name, au.email, au.email_verified
    FROM user_profiles up
    JOIN companies c ON c.id = up.company_id
    JOIN auth.users au ON au.id::text = up.user_id
    ORDER BY c.name
  `);
  console.log(JSON.stringify(profiles, null, 2));
}

run().catch(console.error);
