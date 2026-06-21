import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

async function inspectNotifications() {
  const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseServiceKey}`;
  try {
    const res = await fetch(url);
    const doc = await res.json();
    const notifs = doc.definitions.notifications;
    console.log("=== NOTIFICATIONS SCHEMA ===");
    console.log("Properties:", Object.keys(notifs.properties));
    console.log("Details:", JSON.stringify(notifs.properties, null, 2));
  } catch (err: any) {
    console.error("Failed:", err.message || err);
  }
}

inspectNotifications();
