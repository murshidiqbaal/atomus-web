const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const { data: attendance, error: aErr } = await supabaseAdmin
      .from('teacher_attendance')
      .select('id, teacher_id, campus_id, attendance_date, attendance_status');
    if (aErr) throw aErr;
    console.log('Total attendance records found:', attendance.length);

    // Group by status
    const statusCounts = {};
    const campusCounts = {};
    const dateCounts = {};

    attendance.forEach(row => {
      statusCounts[row.attendance_status] = (statusCounts[row.attendance_status] || 0) + 1;
      campusCounts[row.campus_id] = (campusCounts[row.campus_id] || 0) + 1;
      dateCounts[row.attendance_date] = (dateCounts[row.attendance_date] || 0) + 1;
    });

    console.log('Status counts:', statusCounts);
    console.log('Campus counts:', campusCounts);
    console.log('Date counts (sorted):', Object.keys(dateCounts).sort());

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
