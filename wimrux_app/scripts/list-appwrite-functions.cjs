const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || '6a29285200015cd421c7';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

(async () => {
  const res = await fetch(`${APPWRITE_ENDPOINT}/functions`, {
    headers: {
      'X-Appwrite-Project': APPWRITE_PROJECT,
      'X-Appwrite-Key': APPWRITE_API_KEY,
    },
  });
  const d = await res.json();
  console.log('Total functions:', d.total);
  for (const f of d.functions || []) {
    console.log(`- ${f.$id} | name=${f.name} | runtime=${f.runtime} | deployment=${f.deployment || '(none)'} | enabled=${f.enabled}`);
  }
})();
