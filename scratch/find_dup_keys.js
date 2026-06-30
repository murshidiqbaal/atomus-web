const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findDups() {
  const { data: subjects, error } = await supabase.from('subjects').select('*');
  if (error) {
    console.error(error);
    return;
  }
  
  console.log("Subjects with non-UUID ids:");
  subjects.forEach(s => {
    if (!s.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log(s);
    }
  });
  
  // Find duplicate IDs
  const idCounts = {};
  subjects.forEach(s => {
    idCounts[s.id] = (idCounts[s.id] || 0) + 1;
  });
  const dupIds = Object.keys(idCounts).filter(id => idCounts[id] > 1);
  console.log("Duplicate IDs in database:", dupIds);
  
  // Find duplicate names
  const nameCounts = {};
  subjects.forEach(s => {
    nameCounts[s.name] = (nameCounts[s.name] || 0) + 1;
  });
  const dupNames = Object.keys(nameCounts).filter(name => nameCounts[name] > 1);
  console.log("Duplicate subject names:", dupNames);
}
findDups();
