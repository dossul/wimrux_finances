import { createClient } from './wimrux_app/node_modules/@insforge/sdk/dist/index.mjs';
const client = createClient({ baseUrl: 'https://gfe4bd9y.eu-central.insforge.app', anonKey: 'test' });
const bucket = client.storage.from('invoices-scans');
// Test getPublicUrl
const result = bucket.getPublicUrl('test/file.pdf');
console.log('getPublicUrl result type:', typeof result);
console.log('getPublicUrl result:', JSON.stringify(result));

// Test uploadAuto source
const src = bucket.uploadAuto.toString();
console.log('\nuploadAuto full:\n', src);
