import * as fs from 'fs';
import * as path from 'path';

function search() {
  const filePath = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\8dbde49b-a37d-4a00-b9fb-81834f260298\\.system_generated\\logs\\transcript.jsonl';
  if (!fs.existsSync(filePath)) {
    console.error("File does not exist!");
    return;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let matchCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes('password') || line.toLowerCase().includes('db_') || line.toLowerCase().includes('postgres:')) {
      console.log(`[Line ${i + 1}] matched:`);
      // Print first 300 chars of matching line to prevent huge logs
      console.log(line.slice(0, 500));
      matchCount++;
      if (matchCount > 30) {
        console.log("Too many matches, truncating...");
        break;
      }
    }
  }
}

search();
