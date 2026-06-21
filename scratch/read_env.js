const fs = require('fs');
const path = require('path');
let dir = __dirname;
for (let i = 0; i < 5; i++) {
  const envPath = path.join(dir, '.env');
  const envLocalPath = path.join(dir, '.env.local');
  console.log(`Checking in ${dir}...`);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    console.log(`  Found .env! Keys:`, content.split('\n').map(l => l.split('=')[0].trim()).filter(Boolean));
  }
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf8');
    console.log(`  Found .env.local! Keys:`, content.split('\n').map(l => l.split('=')[0].trim()).filter(Boolean));
  }
  dir = path.dirname(dir);
}
