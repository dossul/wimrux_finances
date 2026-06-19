const { Client, Databases } = require('node-appwrite');
const client = new Client()
  .setEndpoint('https://appwrite.benga.live/v1')
  .setProject('6a29285200015cd421c7')
  .setKey('66b2a6d7e38697fe0e9b');
const db = new Databases(client);

const id = '77f57296-4088-4af7-b056-68b3ccd137bb';
db.getDocument('wimrux_finances', 'clients', id)
  .then(r => console.log('FOUND', r['$id'], r.name))
  .catch(e => console.error('NOT FOUND / ERROR:', e.message, e.code));
