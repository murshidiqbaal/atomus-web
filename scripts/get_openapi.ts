import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNTc3OTQsImV4cCI6MjA5MzYzMzc5NH0.7BJqpZTW64Vgz6VLbjSdOf8M2Oq8nrWrK8uDBTEHO3s';

async function fetchOpenApi() {
  const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseAnonKey}`;
  try {
    const res = await fetch(url);
    const doc = await res.json();
    console.log("Exposed Tables & Views:", Object.keys(doc.definitions || {}));
    console.log("\nExposed RPC Paths:");
    const paths = Object.keys(doc.paths || {});
    const rpcs = paths.filter(p => p.startsWith('/rpc/'));
    console.log(rpcs);
  } catch (err: any) {
    console.error("Failed to fetch OpenAPI doc:", err);
  }
}

fetchOpenApi();
