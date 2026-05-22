import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findAuthIdReferences() {
  console.log("Searching database metadata for 'auth_id' references...");
  
  // We can query pg_policies since RLS policies are stored there, and one of them might be referencing auth_id incorrectly on a table where it doesn't exist!
  // E.g. a policy on a table like `attendance` that references `auth_id` instead of `teacher_id` or similar!
  // Wait, let's write a query to fetch all policies!
  // Since we don't have direct SQL client, let's look at the RPCs we might be able to call, or
  // let's try querying different tables to see which one throws the "auth_id does not exist" error.
  
  const tables = [
    'attendance',
    'students',
    'teachers',
    'parents',
    'courses',
    'batches',
    'subjects',
    'marks',
    'exams',
    'student_academic_performance'
  ];
  
  for (const table of tables) {
    console.log(`Checking table: ${table}...`);
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`  -> Table ${table} select error: [${error.code}] ${error.message}`);
    } else {
      console.log(`  -> Table ${table} select succeeded!`);
    }
  }
}

findAuthIdReferences();
