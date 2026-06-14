import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDuplicates() {
  console.log("Fetching student_fees to look for duplicates...");
  const { data, error } = await supabase
    .from('student_fees')
    .select('student_id, fee_structure_id');

  if (error) {
    console.error("Error fetching student_fees:", error.message);
    return;
  }

  const seen = new Set<string>();
  const duplicates: Array<{ student_id: string; fee_structure_id: string | null }> = [];

  for (const row of data || []) {
    const key = `${row.student_id}_${row.fee_structure_id}`;
    if (seen.has(key)) {
      duplicates.push(row);
    } else {
      seen.add(key);
    }
  }

  console.log(`Total rows checked: ${data?.length}`);
  console.log(`Duplicate rows found: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log("Duplicate samples:", duplicates.slice(0, 10));
  }
}

checkDuplicates();
