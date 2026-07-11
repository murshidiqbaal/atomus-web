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

const URL = env.NEXT_PUBLIC_SUPABASE_URL || "https://txtvvlxaurqovghtngzm.supabase.co";
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL:", URL);
console.log("Has SERVICE_ROLE:", !!SERVICE_ROLE);

const client = createClient(URL, SERVICE_ROLE || ANON, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function test() {
  try {
    const admin = client.auth.admin;
    console.log("Admin exists on client.auth.admin:", !!admin);
    
    const { data, error } = await client.auth.admin.listUsers();
    if (error) {
      console.error("Error listing users:", error);
    } else {
      console.log("Successfully listed users. Count:", data.users.length);
    }
  } catch (e) {
    console.error("Caught exception:", e);
  }
}

test();
