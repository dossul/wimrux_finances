const { Client, Databases, ID } = require('node-appwrite');
const client = new Client()
  .setEndpoint('https://appwrite.benga.live/v1')
  .setProject('6a29285200015cd421c7')
  .setKey('66b2a6d7e38697fe0e9b');
const db = new Databases(client);

const id = ID.unique();
console.log('generated id:', id);

db.createDocument('wimrux_finances', 'clients', id, {
  type: 'PM',
  name: 'TECHNO SOLUTIONS SARL (E2E-TEST)',
  ifu: '12345678',
  address: 'Zone Industrielle, Ouagadougou',
  phone: '+22670000001',
  company_id: 'company-westago'
})
  .then(r => {
    console.log('CREATED', r['$id']);
  })
  .catch(e => console.error('ERROR:', e.message, e.code, e.type));
