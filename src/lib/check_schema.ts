import { supabase } from "./supabase";

async function checkSchema() {
  const { data, error } = await supabase
    .from('parents')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error("Error checking parents table:", error);
  } else {
    console.log("Parents table columns:", Object.keys(data[0] || {}));
  }
}

checkSchema();
