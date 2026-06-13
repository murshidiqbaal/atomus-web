const fs = require('fs');
const html = fs.readFileSync('scratch/folder.html', 'utf8');

const queries = ['MAHIN', '7431', 'Aswin', '7413', '1kQDHE6X8Cq-hFbgD8kngUKJrwoIAazrw'];
queries.forEach(q => {
  let idx = -1;
  console.log(`\n=== SEARCHING FOR "${q}" ===`);
  while ((idx = html.indexOf(q, idx + 1)) !== -1) {
    console.log(`Found "${q}" at index ${idx}`);
    console.log("Surrounding text:", html.substring(Math.max(0, idx - 100), Math.min(html.length, idx + 100)));
  }
});
