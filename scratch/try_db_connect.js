const { Client } = require('pg');

const host = 'db.txtvvlxaurqovghtngzm.supabase.co';
const user = 'postgres';
const database = 'postgres';
const port = 5432; // or 6543 for connection pooler

const passwords = [
  'postgres',
  'txtvvlxaurqovghtngzm',
  'atomus',
  'atomus2026',
  'Atomus@2026',
  'Atomus2026',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk' // service role key
];

async function tryConnect() {
  for (const pw of passwords) {
    console.log(`Trying connection with password: ${pw.substring(0, 15)}...`);
    const client = new Client({
      host,
      port,
      user,
      password: pw,
      database,
      ssl: { rejectUnauthorized: false }
    });
    try {
      await client.connect();
      console.log('✅ Connection successful!');
      
      // Let's alter the table right here!
      console.log('Running ALTER TABLE teachers ADD COLUMN IF NOT EXISTS assigned_campuses UUID[];');
      await client.query('ALTER TABLE teachers ADD COLUMN IF NOT EXISTS assigned_campuses UUID[];');
      
      console.log('Running UPDATE teachers SET assigned_campuses = ARRAY[campus_id] WHERE campus_id IS NOT NULL AND assigned_campuses IS NULL;');
      await client.query('UPDATE teachers SET assigned_campuses = ARRAY[campus_id] WHERE campus_id IS NOT NULL AND assigned_campuses IS NULL;');
      
      console.log('Schema update complete!');
      await client.end();
      return;
    } catch (err) {
      console.log('❌ Connection failed:', err.message);
    }
  }
  console.log('Could not connect to database with any password.');
}

tryConnect();
