// Inspecter la table storage objects via l'API admin
const res = await fetch('https://gfe4bd9y.eu-central.insforge.app/api/db/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': 'ik_1358be6dcbccff7c0d6636b011559406' },
  body: JSON.stringify({ sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'objects' ORDER BY ordinal_position" })
});
console.log('Status:', res.status);
const body = await res.json().catch(async () => ({ raw: await res.text() }));
console.log(JSON.stringify(body, null, 2));
