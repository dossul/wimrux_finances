// Fix MCF simulator edge function to read _path from body instead of URL pathname
const API = 'https://gfe4bd9y.eu-central.insforge.app';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';

async function getFunction() {
  const res = await fetch(`${API}/api/functions/mcf-simulator`, {
    headers: { 'x-api-key': KEY }
  });
  return res.json();
}

async function run() {
  const fn = await getFunction();
  console.log('Current function status:', fn.status);
  console.log('Current code length:', fn.code?.length, 'chars');
}

run();
