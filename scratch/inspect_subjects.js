const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectSubjects() {
  console.log("Fetching subjects...");
  const { data, error } = await supabase
    .from('subjects')
    .select('*');

  if (error) {
    console.error("Error fetching subjects:", error.message);
    return;
  }

  console.log(`Total subjects found: ${data.length}`);
  console.log("Subjects:");
  console.log(JSON.stringify(data, null, 2));
}

inspectSubjects();
