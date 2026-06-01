// Inspecter les methodes uploadAuto du SDK
import { createClient } from './wimrux_app/node_modules/@insforge/sdk/dist/index.mjs';
const client = createClient({ baseUrl: 'https://gfe4bd9y.eu-central.insforge.app', anonKey: 'test' });
const bucket = client.storage.from('test');

// Recuperer le code source de uploadAuto
const proto = Object.getPrototypeOf(bucket);
console.log('Methods:', Object.getOwnPropertyNames(proto).join(', '));

// Inspecter uploadAuto
const src = bucket.uploadAuto.toString().substring(0, 500);
console.log('uploadAuto source:', src);

// Inspecter upload
const src2 = bucket.upload.toString().substring(0, 500);
console.log('upload source:', src2);
