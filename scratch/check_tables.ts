import { supabase } from "../src/lib/supabase";
async function check() {
  const { data, error } = await supabase.from('device_tokens').select('*').limit(1);
  console.log("device_tokens table check:", { hasTable: !error, error: error?.message || null });
}
check();
