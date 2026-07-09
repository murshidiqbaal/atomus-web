const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const r1 = await supabaseAdmin.rpc('exec_sql', { sql_query: 'SELECT 1 as val;' });
    console.log('exec_sql (sql_query):', r1);
    
    const r2 = await supabaseAdmin.rpc('exec_sql', { sql: 'SELECT 1 as val;' });
    console.log('exec_sql (sql):', r2);

    const r3 = await supabaseAdmin.rpc('run_sql', { sql: 'SELECT 1 as val;' });
    console.log('run_sql (sql):', r3);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
