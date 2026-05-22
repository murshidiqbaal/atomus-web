import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function testRpc() {
  const query = "SELECT tablename FROM pg_tables WHERE schemaname = 'public';";
  
  const possibleNames = ['exec_sql', 'run_sql', 'execute_sql', 'sql', 'query_sql', 'exec', 'query'];
  
  for (const name of possibleNames) {
    try {
      console.log(`Trying RPC: ${name}...`);
      const { data, error } = await adminClient.rpc(name, { query: query, sql: query, sql_query: query, query_text: query });
      if (!error) {
        console.log(`✅ Success with RPC ${name}! Result:`, data);
        return;
      }
      console.log(`❌ Failed with RPC ${name}:`, error.message);
    } catch (err: any) {
      console.log(`❌ Error calling RPC ${name}:`, err.message || err);
    }
  }
}

testRpc();
