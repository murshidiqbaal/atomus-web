const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

async function run() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseServiceKey}`);
    const schema = await res.json();
    console.log('--- KEYS ---', Object.keys(schema));
    if (schema.paths) {
      console.log('RPCs:', Object.keys(schema.paths).filter(p => p.startsWith('/rpc/')));
      console.log('Tables:', Object.keys(schema.paths).filter(p => !p.startsWith('/rpc/')));
    } else {
      console.log(schema);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
