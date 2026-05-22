import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNTc3OTQsImV4cCI6MjA5MzYzMzc5NH0.7BJqpZTW64Vgz6VLbjSdOf8M2Oq8nrWrK8uDBTEHO3s';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function reproduce() {
  console.log("Fetching a valid student record...");
  const { data: students, error: studentErr } = await adminClient.from('students').select('*').limit(1);
  if (studentErr || !students || students.length === 0) {
    console.error("Failed to fetch student:", studentErr);
    return;
  }
  const student = students[0];
  console.log(`Found student: ${student.full_name} (${student.id}), campus: ${student.campus_id}, course: ${student.course_id}, batch: ${student.batch_id}`);

  const mockRecord = {
    student_id: student.id,
    campus_id: student.campus_id,
    course_id: student.course_id,
    batch_id: student.batch_id,
    subject_id: null,
    attendance_date: new Date().toISOString().split('T')[0],
    status: 'Present'
  };

  console.log("\nAttempting insert with ADMIN (service role) client...");
  const adminRes = await adminClient.from('attendance').insert(mockRecord).select();
  if (adminRes.error) {
    console.error("ADMIN insert FAILED:", JSON.stringify(adminRes.error, null, 2));
  } else {
    console.log("ADMIN insert SUCCEEDED:", adminRes.data);
    // Cleanup
    await adminClient.from('attendance').delete().eq('id', adminRes.data[0].id);
  }

  console.log("\nAttempting insert with ANON client...");
  const anonRes = await anonClient.from('attendance').insert(mockRecord).select();
  if (anonRes.error) {
    console.error("ANON insert FAILED:", JSON.stringify(anonRes.error, null, 2));
  } else {
    console.log("ANON insert SUCCEEDED:", anonRes.data);
  }
}

reproduce();
