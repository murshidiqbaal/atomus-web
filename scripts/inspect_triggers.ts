import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectTriggers() {
  console.log("Querying information_schema.triggers for attendance table...");
  
  // Note: PostgREST won't expose information_schema by default, but let's try just in case.
  const { data, error } = await supabase
    .from('information_schema.triggers' as any)
    .select('*' as any);
    
  if (error) {
    console.error("Direct information_schema query failed:", error);
    
    // Let's try calling pg_get_triggerdef or other pg functions if exposed,
    // or let's try querying standard user tables where triggers might run.
  } else {
    console.log("Triggers:", data);
  }
}

inspectTriggers();
