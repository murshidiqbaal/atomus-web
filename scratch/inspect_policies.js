const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const { data: policies, error } = await supabaseAdmin
      .from('pg_policies')
      .select('*');

    if (error) {
      console.log('PostgREST cannot query pg_policies directly. Let us try querying pg_policies in a different schema or check complete_schema.sql.');
      return;
    }

    console.log('Policies:', policies.filter(p => p.tablename === 'payment_transactions' || p.tablename === 'student_fees'));
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
