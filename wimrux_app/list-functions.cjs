const { Client, Functions } = require('node-appwrite');
const client = new Client()
  .setEndpoint('https://appwrite.benga.live/v1')
  .setProject('6a29285200015cd421c7')
  .setKey('66b2a6d7e38697fe0e9b');
const fn = new Functions(client);
fn.list().then(r => console.log(JSON.stringify(r.functions.map(f => f.name), null, 2))).catch(e => console.error(e.message));
