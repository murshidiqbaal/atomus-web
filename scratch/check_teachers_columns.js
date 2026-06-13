const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

async function fetchOpenApi() {
  const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseServiceKey}`;
  try {
    const res = await fetch(url);
    const doc = await res.json();
    console.log("Exposed Tables & Views:", Object.keys(doc.definitions || {}));
    console.log("\nExposed RPC Paths:");
    const paths = Object.keys(doc.paths || {});
    const rpcs = paths.filter(p => p.startsWith('/rpc/'));
    console.log(rpcs);
  } catch (err) {
    console.error("Failed to fetch OpenAPI doc:", err);
  }
}

fetchOpenApi();
