const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://txtvvlxaurqovghtngzm.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk";

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching attendance table columns...");
  const { data: cols, error: colsErr } = await supabase.rpc("inspect_table_columns", { table_name: "attendance" });
  if (colsErr) {
    // If RPC inspect_table_columns does not exist, let's query via normal SQL if we have an RPC to run SQL.
    console.error("Columns RPC Error:", colsErr);
  } else {
    console.log("Columns:", cols);
  }

  // Let's execute a direct query via a generic RPC if one exists, e.g. "exec_sql" or similar.
  // Wait, let's look at available RPCs in the schema.
  console.log("\nFetching schema details...");
}

main();
