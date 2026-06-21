import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log("=== CHECKING TABLES ===");

  try {
    const { data, error } = await supabase.from('notifications').select().limit(1);
    if (error) {
      console.log("notifications table check failed:", error.message);
    } else {
      console.log("notifications table exists! sample data:", data);
    }
  } catch (e: any) {
    console.log("notifications check throw error:", e.message || e);
  }

  try {
    const { data, error } = await supabase.from('parent_devices').select().limit(1);
    if (error) {
      console.log("parent_devices table check failed:", error.message);
    } else {
      console.log("parent_devices table exists! sample data:", data);
    }
  } catch (e: any) {
    console.log("parent_devices check throw error:", e.message || e);
  }

  try {
    const { data, error } = await supabase.from('notification_preferences').select().limit(1);
    if (error) {
      console.log("notification_preferences table check failed:", error.message);
    } else {
      console.log("notification_preferences table exists! sample data:", data);
    }
  } catch (e: any) {
    console.log("notification_preferences check throw error:", e.message || e);
  }
}

checkTables();
