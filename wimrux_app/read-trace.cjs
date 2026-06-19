const fs = require('fs');
const net = fs.readFileSync('C:\\Users\\lenovo\\AppData\\Local\\Temp\\kilo\\trace01b\\0-trace.network', 'utf8');
const lines = net.split('\n').filter(l => l.includes('collections/clients/documents') && l.includes('POST'));
console.log('POST count:', lines.length);
lines.slice(0, 1).forEach(l => {
  const m = l.match(/_sha1\":\"([^\"]+)\.json/);
  if (m) {
    const body = fs.readFileSync('C:\\Users\\lenovo\\AppData\\Local\\Temp\\kilo\\trace01b\\resources\\' + m[1] + '.json', 'utf8');
    console.log(body);
  }
});
