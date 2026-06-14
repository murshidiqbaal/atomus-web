const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function probe() {
  const query = "SELECT tablename FROM pg_tables WHERE schemaname = 'public';";
  
  const tests = [
    { name: 'exec_sql', payload: { query } },
    { name: 'exec_sql', payload: { sql: query } },
    { name: 'run_sql', payload: { query } },
    { name: 'run_sql', payload: { sql: query } },
    { name: 'execute_sql', payload: { query } },
    { name: 'execute_sql', payload: { sql: query } },
    { name: 'sql', payload: { query } },
    { name: 'sql', payload: { sql: query } },
    { name: 'query', payload: { query } },
    { name: 'query', payload: { sql: query } },
  ];

  for (const test of tests) {
    try {
      const { data, error } = await adminClient.rpc(test.name, test.payload);
      if (!error) {
        console.log(`✅ Success with RPC ${test.name}! Result:`, data);
        return;
      }
      if (!error.message.includes("Could not find the function")) {
        console.log(`⚠️ RPC ${test.name} exists but returned error: ${error.message}`);
      }
    } catch (err) {
      // Ignored
    }
  }
  console.log("No standard SQL execution RPC found.");
}

probe();
