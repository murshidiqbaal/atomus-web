const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const { data: marks, error } = await supabaseAdmin
      .from('marks')
      .select('id, student_id, exam_id, subject_id');

    if (error) throw error;

    const groups = {};
    for (const m of marks) {
      const key = `${m.student_id}|${m.exam_id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }

    const idsToDelete = [];
    for (const [_, list] of Object.entries(groups)) {
      const hasNull = list.some(m => m.subject_id === null);
      const hasNonNull = list.some(m => m.subject_id !== null);
      if (hasNull && hasNonNull) {
        // Delete all null records for this combination
        const nulls = list.filter(m => m.subject_id === null);
        for (const n of nulls) {
          idsToDelete.push(n.id);
        }
      }
    }

    console.log('Found', idsToDelete.length, 'null records to clean up.');
    
    if (idsToDelete.length > 0) {
      const { data, error: delErr, count } = await supabaseAdmin
        .from('marks')
        .delete({ count: 'exact' })
        .in('id', idsToDelete);
      
      if (delErr) throw delErr;
      console.log('Successfully cleaned up duplicate overall records. Count:', count);
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

run();
