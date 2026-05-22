import { createClient } from '@supabase/supabase-js';
import { academicPerformanceService } from '../src/features/students/services/academic_performance_service';

// Use service role key to bypass RLS and perform global calculations securely
const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAllStudents() {
  console.log("==================================================");
  console.log("ATOMUS.edu — Academic Performance System Bootstrapper");
  console.log("==================================================");

  console.log("Fetching all student records from database...");
  const { data: students, error } = await supabase.from("students").select("id, full_name");

  if (error || !students) {
    console.error("Failed to fetch student records:", error);
    return;
  }

  console.log(`Found ${students.length} students. Initiating recalculations...`);
  
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    console.log(`[${i + 1}/${students.length}] Recalculating score for: ${student.full_name} (${student.id})`);
    try {
      const res = await academicPerformanceService.recalculateForStudent(student.id);
      console.log(`  -> Score: ${res.academic_performance_score}%, Status: ${res.progress_status}, Periods: ${res.total_periods}`);
    } catch (err) {
      console.error(`  -> [ERROR] Failed to recalculate:`, err);
    }
  }

  console.log("\nRefreshing overall academic rankings...");
  try {
    await academicPerformanceService.recalculateAllRankings();
    console.log("Rankings refreshed successfully!");
  } catch (err) {
    console.error("Failed to refresh rankings:", err);
  }

  console.log("\n==================================================");
  console.log("SUCCESS: Academic Performance Database Sync Completed!");
  console.log("==================================================");
}

syncAllStudents();
