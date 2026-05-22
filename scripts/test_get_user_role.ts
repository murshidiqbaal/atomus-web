import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function testFunctions() {
  console.log("Calling get_user_role RPC...");
  const roleRes = await adminClient.rpc('get_user_role');
  console.log("get_user_role result:", roleRes.data, "error:", roleRes.error);

  console.log("\nCalling calculate_student_academic_performance RPC...");
  // Use MAHIN student_id: 59a0e20d-039e-464d-982c-e5161bd96a64
  const perfRes = await adminClient.rpc('calculate_student_academic_performance', { p_student_id: '59a0e20d-039e-464d-982c-e5161bd96a64' });
  console.log("calculate_student_academic_performance result:", perfRes.data, "error:", perfRes.error);
}

testFunctions();
