const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTeachers() {
  const { data: teachers, error } = await supabase
    .from('teachers')
    .select(`
      id,
      full_name,
      teacher_subjects(subjects(id, name)),
      teacher_batches(batches(id, name))
    `);
  if (error) {
    console.error(error);
    return;
  }
  
  teachers.forEach(t => {
    const subjects = t.teacher_subjects.map(ts => ts.subjects?.name).filter(Boolean);
    const batches = t.teacher_batches.map(tb => tb.batches?.name).filter(Boolean);
    console.log(`Teacher: ${t.full_name}`);
    console.log("  Subjects:", subjects);
    console.log("  Batches:", batches);
  });
}
checkTeachers();
