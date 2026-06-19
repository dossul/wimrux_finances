const { Client, Databases, Query } = require('node-appwrite');
const client = new Client()
  .setEndpoint('https://appwrite.benga.live/v1')
  .setProject('6a29285200015cd421c7')
  .setKey('66b2a6d7e38697fe0e9b');
const db = new Databases(client);

const ids = [
  '77f57296-4088-4af7-b056-68b3ccd137bb',
  '352687082f15fb6cf232916444120694468e444a', // sha1 not id
  '072ed0c646cb35b26d5aaa4b0569cc30ea3b2555', // sha1 not id
  '974ab5d2ab92b6f85fa3e1f7cfc12efdcd4e5dc7', // sha1 not id
  'e3e23bef0fc093fe66405edf96cbec89160c81ab'  // sha1 not id
];

async function check() {
  for (const id of ids) {
    try {
      const doc = await db.getDocument('wimrux_finances', 'clients', id);
      console.log('FOUND', id, doc.name);
    } catch (e) {
      console.log('NOT FOUND', id);
    }
  }
}
check();
