const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const { data: teachers, error } = await supabaseAdmin
      .from('teachers')
      .select('id, full_name, email, subject_specialization, password_hash, campuses(name)');
    if (error) throw error;

    console.log(`Total teachers: ${teachers.length}`);
    teachers.forEach(t => {
      console.log({
        name: t.full_name,
        email: t.email,
        specialization: t.subject_specialization,
        campus: t.campuses?.name,
        password: t.password_hash
      });
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
