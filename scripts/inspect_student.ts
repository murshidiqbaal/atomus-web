import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectData() {
  const { data: attendance } = await supabase.from('attendance').select('*');
  console.log("Attendance records:");
  console.log(JSON.stringify(attendance, null, 2));

  const { data: subjectAtt } = await supabase.from('subject_attendance').select('*');
  console.log("\nSubject Attendance records:");
  console.log(JSON.stringify(subjectAtt, null, 2));

  const { data: marks } = await supabase.from('marks').select('*');
  console.log("\nMarks records:");
  console.log(JSON.stringify(marks, null, 2));

  const { data: exams } = await supabase.from('exams').select('*');
  console.log("\nExams records:");
  console.log(JSON.stringify(exams, null, 2));
}

inspectData();
