import { createClient } from './wimrux_app/node_modules/@insforge/sdk/dist/index.mjs';
const client = createClient({ baseUrl: 'https://gfe4bd9y.eu-central.insforge.app', anonKey: 'test' });
const bucket = client.storage.from('test');

// Voir la totalite de uploadWithPresignedUrl
const src = bucket.uploadWithPresignedUrl.toString();
console.log('uploadWithPresignedUrl:\n', src);
