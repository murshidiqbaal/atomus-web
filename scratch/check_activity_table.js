const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log("Checking for parent_app_activity_logs table...");
  const { data, error } = await supabaseAdmin.from('parent_app_activity_logs').select('*').limit(1);
  if (error) {
    console.log(`❌ Table check failed: ${error.message} (code: ${error.code})`);
  } else {
    console.log(`✅ Table parent_app_activity_logs exists!`);
  }
}

check();
