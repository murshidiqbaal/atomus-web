const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const { data: campuses } = await supabaseAdmin.from('campuses').select('id').eq('is_active', true).limit(1);
    const { data: courses } = await supabaseAdmin.from('courses').select('id').eq('is_active', true).limit(1);
    const { data: batches } = await supabaseAdmin.from('batches').select('id').eq('is_active', true).limit(1);
    
    const campus = campuses?.[0];
    const course = courses?.[0];
    const batch = batches?.[0];

    if (campus && course && batch) {
      console.log('Found valid metadata IDs:', { campus_id: campus.id, course_id: course.id, batch_id: batch.id });
      
      const s1 = {
        full_name: 'Test Student A',
        admission_number: 'TEST-ADM-0001A',
        phone_number: '9999999999',
        campus_id: campus.id,
        course_id: course.id,
        batch_id: batch.id
      };
      const s2 = {
        full_name: 'Test Student B',
        admission_number: 'TEST-ADM-0001B',
        phone_number: '9999999999',
        campus_id: campus.id,
        course_id: course.id,
        batch_id: batch.id
      };
      
      await supabaseAdmin.from('students').delete().in('admission_number', [s1.admission_number, s2.admission_number]);
      
      console.log('Inserting first student...');
      const r1 = await supabaseAdmin.from('students').insert(s1);
      console.log('First insert result:', r1.error ? r1.error.message : 'Success');
      
      console.log('Inserting second student with same phone...');
      const r2 = await supabaseAdmin.from('students').insert(s2);
      console.log('Second insert result:', r2.error ? r2.error.message : 'Success');
      
      await supabaseAdmin.from('students').delete().in('admission_number', [s1.admission_number, s2.admission_number]);
    } else {
      console.log('Could not find active campus, course, or batch to run the test');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
