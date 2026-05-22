import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

async function fetchPathDetails() {
  const url = `${supabaseUrl}/rest/v1/`;
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });
    const doc = await res.json();
    console.log("Details for /rpc/get_teacher_id:");
    console.log(JSON.stringify(doc.paths['/rpc/get_teacher_id'], null, 2));

    console.log("\nDetails for /rpc/calculate_student_academic_performance:");
    console.log(JSON.stringify(doc.paths['/rpc/calculate_student_academic_performance'], null, 2));
  } catch (err: any) {
    console.error("Failed:", err);
  }
}
fetchPathDetails();
