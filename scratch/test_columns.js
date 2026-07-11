const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    env[key] = val;
  }
});

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function run() {
  const { data, error } = await client.rpc('get_table_columns', { table_name: 'students' });
  if (error) {
    // If RPC doesn't exist, query standard Postgres schema via a dynamic query if possible,
    // or just fetch a single row to inspect keys and types
    console.error("RPC Error:", error);
    const { data: row, error: rowErr } = await client.from('students').select('*').limit(1);
    if (rowErr) {
      console.error("Select Error:", rowErr);
    } else {
      console.log("Students row keys:", row && row[0]);
    }
  } else {
    console.log("Columns:", data);
  }
}
run();
