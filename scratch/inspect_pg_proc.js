const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log("Checking pg_proc...");
  // We can query pg_proc using from('pg_proc') if it's exposed, or try to see if there is an RPC we can use.
  // Wait, let's see if we can query pg_catalog.pg_namespace, pg_proc, etc.
  try {
    const { data, error } = await supabaseAdmin.from('pg_proc').select('proname');
    if (error) {
      console.log("pg_proc select failed:", error.message);
    } else {
      console.log("pg_proc function names:", data.map(d => d.proname));
    }
  } catch (e) {
    console.log("Error querying pg_proc:", e.message);
  }
}

check();
