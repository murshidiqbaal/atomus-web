const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectAll() {
  const tables = ['campuses', 'courses', 'batches', 'subjects'];
  for (const table of tables) {
    const { data } = await supabase.from(table).select('*');
    if (!data) continue;
    const matches = data.filter(row => {
      return Object.values(row).some(v => typeof v === 'string' && v.toLowerCase() === 'any');
    });
    if (matches.length > 0) {
      console.log(`Found "Any" in table ${table}:`, matches);
    }
  }
}
inspectAll();
