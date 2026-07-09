const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const { data: exams, error: examErr } = await supabaseAdmin
      .from('exams')
      .select('id, name, exam_date, total_marks');
    if (examErr) throw examErr;

    const { data: marks, error: marksErr } = await supabaseAdmin
      .from('marks')
      .select('exam_id, percentage, marks_obtained, total_marks');
    if (marksErr) throw marksErr;

    console.log(`Exams count: ${exams.length}`);
    console.log(`Marks count: ${marks.length}`);

    // Count marks per exam
    const counts = {};
    for (const m of marks) {
      counts[m.exam_id] = (counts[m.exam_id] || 0) + 1;
    }

    console.log('\nExams and their marks counts:');
    for (const e of exams) {
      console.log(`Exam: ${e.name} (${e.id}) - Date: ${e.exam_date} - Total Marks: ${e.total_marks} - Marks Rows: ${counts[e.id] || 0}`);
    }

    // Let's print the first 5 marks rows to see what values they have
    console.log('\nSample marks rows (first 5):');
    console.log(marks.slice(0, 5));

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
