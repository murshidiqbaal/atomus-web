const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log("Fetching a parent...");
  const { data: parents, error: parentErr } = await supabaseAdmin.from('parents').select('id, full_name').limit(1);
  if (parentErr || !parents || parents.length === 0) {
    console.error("Failed to fetch parent:", parentErr);
    return;
  }
  
  const parent = parents[0];
  console.log("Selected parent:", parent);

  console.log("Inserting a temporary activity log without session_duration...");
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('parent_app_activity_logs')
    .insert({
      parent_id: parent.id,
      parent_name: parent.full_name,
      device_platform: 'Android',
      app_version: '1.0.0',
      login_date: todayStr,
      opened_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    })
    .select();

  if (insertErr) {
    console.error("Insert failed:", insertErr);
  } else {
    console.log("Insert success! Row columns:", Object.keys(inserted[0]));
    console.log("Row details:", inserted[0]);
    
    console.log("Cleaning up temporary record...");
    const { error: delErr } = await supabaseAdmin
      .from('parent_app_activity_logs')
      .delete()
      .eq('id', inserted[0].id);
    console.log("Cleanup status:", delErr ? `Failed: ${delErr.message}` : "Success");
  }
}

check();
