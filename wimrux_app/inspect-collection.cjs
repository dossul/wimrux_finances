const { Client, Databases } = require('node-appwrite');
const client = new Client()
  .setEndpoint('https://appwrite.benga.live/v1')
  .setProject('6a29285200015cd421c7')
  .setKey(process.env.APPWRITE_API_KEY || 'cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57');
const db = new Databases(client);

const collections = ['clients', 'invoices', 'invoice_items', 'treasury_accounts', 'treasury_movements', 'user_profiles', 'companies'];

async function main() {
  for (const collectionId of collections) {
    try {
      const r = await db.getCollection('wimrux_finances', collectionId);
      console.log(`\n=== ${collectionId} ===`);
      console.log(JSON.stringify({
        indexes: r.indexes?.map(i => ({ key: i.key, type: i.type, attributes: i.attributes }))
      }, null, 2));
    } catch (e) {
      console.error(`ERROR ${collectionId}:`, e.message);
    }
  }
}

main();
