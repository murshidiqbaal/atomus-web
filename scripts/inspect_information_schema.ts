import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  const schemas = ['information_schema.columns', 'pg_policies', 'pg_trigger', 'pg_proc'];
  
  for (const s of schemas) {
    console.log(`Checking ${s}...`);
    const { data, error } = await adminClient.from(s as any).select('*' as any).limit(1);
    if (error) {
      console.log(`❌ Failed:`, error.message);
    } else {
      console.log(`✅ Success! Data:`, data);
    }
  }
}

inspect();
