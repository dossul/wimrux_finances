import { createRequire } from 'module';
const require = createRequire(import.meta.url + '/../wimrux_app/');
const { createClient } = require('@insforge/sdk');

const BASE = 'https://gfe4bd9y.eu-central.insforge.app';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTAwNjN9.J71GoMBih3RietpuMmXLeLEU3664bu1jzI3KFZg3dPU';
const API_KEY = 'ik_1358be6dcbccff7c0d6636b011559406';
const WESTAGO_ID = '445329bd-a896-477a-9c32-836d1d17f5de';
const ILTIC_ID = '4a104167-b2fd-475a-9d40-c0be906cde11';

const client = createClient({ baseUrl: BASE, anonKey: ANON });

async function rawSql(sql) {
  const r = await fetch(`${BASE}/api/database/advance/rawsql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ query: sql }),
  });
  const data = await r.json();
  if (r.status >= 400) throw new Error(JSON.stringify(data));
  return data.rows;
}

async function run() {
  // Step 1: Register WESTAGO user via SDK
  console.log('1. Registering admin@westago.bf...');
  const { data: regData, error: regErr } = await client.auth.register({
    email: 'admin@westago.bf',
    password: 'WestagoAdmin2026!',
  });
  if (regErr) {
    console.log('  Register error (may already exist):', regErr.message);
  } else {
    console.log('  ✅ Registered, user id:', regData?.user?.id);
  }

  // Step 2: Get user ID from DB
  const westUsers = await rawSql("SELECT id FROM auth.users WHERE email = 'admin@westago.bf'");
  if (westUsers.length === 0) {
    console.error('❌ admin@westago.bf not found in auth.users!');
    return;
  }
  const westagoUserId = westUsers[0].id;
  console.log('  WESTAGO user_id:', westagoUserId);

  // Step 3: Create user_profile for WESTAGO
  console.log('2. Creating user_profile for WESTAGO...');
  await rawSql(`INSERT INTO user_profiles (user_id, company_id, role, full_name)
    VALUES ('${westagoUserId}', '${WESTAGO_ID}', 'admin', 'Admin WESTAGO')
    ON CONFLICT DO NOTHING`);
  console.log('  ✅ OK');

  // Step 4: Link ulrich@iltic.com if no profile
  const ulrichCheck = await rawSql("SELECT id FROM user_profiles WHERE user_id = '59538be7-58f1-439a-b05b-9852e050a672'");
  if (ulrichCheck.length === 0) {
    console.log('3. Linking ulrich@iltic.com to ILTIC...');
    await rawSql(`INSERT INTO user_profiles (user_id, company_id, role, full_name)
      VALUES ('59538be7-58f1-439a-b05b-9852e050a672', '${ILTIC_ID}', 'admin', 'Ulrich ILTIC')
      ON CONFLICT DO NOTHING`);
    console.log('  ✅ OK');
  }

  // Verify
  console.log('\n=== ALL USER PROFILES ===');
  const profiles = await rawSql(`
    SELECT up.full_name, up.role, c.name as company_name, au.email
    FROM user_profiles up
    JOIN companies c ON c.id = up.company_id
    JOIN auth.users au ON au.id::text = up.user_id
    ORDER BY c.name
  `);
  console.log(JSON.stringify(profiles, null, 2));
}

run().catch(console.error);
