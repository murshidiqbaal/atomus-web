async function fetchRaw() {
  const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';
  const url = `${supabaseUrl}/rest/v1/`;
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });
    const text = await res.text();
    console.log("Raw Response length:", text.length);
    const doc = JSON.parse(text);
    console.log("\nDoc keys:", Object.keys(doc));
    if (doc.paths) {
      console.log("\nPaths count:", Object.keys(doc.paths).length);
      const rpcs = Object.keys(doc.paths).filter(p => p.startsWith('/rpc/'));
      console.log("\nExposed RPCs:", rpcs);
    }
  } catch (err: any) {
    console.error("Failed:", err);
  }
}
fetchRaw();
