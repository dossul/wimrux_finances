import { readFileSync } from 'fs';

const API = 'https://gfe4bd9y.eu-central.insforge.app/api/functions';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';

const code = readFileSync('wimrux_app/functions/mcf-simulator.js', 'utf-8');

async function deploy() {
  // Create new function
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({
      name: 'MCF Simulator',
      slug: 'mcf-simulator',
      code,
      description: 'API MCF/SECeF simulée pour certification DGI BF',
      status: 'active'
    })
  });
  const data = await res.text();
  console.log(`Create mcf-simulator: ${res.status} — ${data.substring(0, 300)}`);
}

deploy();
