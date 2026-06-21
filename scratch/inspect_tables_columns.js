const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function inspect(table) {
  try {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('*')
      .limit(1);

    if (error) throw error;
    console.log(`${table} columns:`, Object.keys(data[0] || {}));
  } catch (error) {
    console.error(`Error in ${table}:`, error.message);
  }
}

async function run() {
  await inspect('marks');
  await inspect('exams');
  await inspect('attendance');
  await inspect('expenses');
  await inspect('student_fees');
  await inspect('payment_transactions');
}

run();
