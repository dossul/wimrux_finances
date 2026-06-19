const { Client, Databases, Query } = require('node-appwrite');
const client = new Client()
  .setEndpoint('https://appwrite.benga.live/v1')
  .setProject('6a29285200015cd421c7')
  .setKey('66b2a6d7e38697fe0e9b');
const db = new Databases(client);

db.listDocuments('wimrux_finances', 'clients', [Query.search('name', 'TECHNO')])
  .then(r => {
    console.log('count:', r.documents.length);
    console.log(JSON.stringify(r.documents.map(x => ({ id: x['$id'], name: x.name, company: x.company_id })), null, 2));
  })
  .catch(e => console.error('ERROR:', e.message));
