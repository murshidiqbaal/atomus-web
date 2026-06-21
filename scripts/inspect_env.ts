console.log("=== ENVIRONMENT KEYS ===");
console.log(Object.keys(process.env).filter(key => 
  key.toLowerCase().includes("db") || 
  key.toLowerCase().includes("database") || 
  key.toLowerCase().includes("supabase") || 
  key.toLowerCase().includes("pass") ||
  key.toLowerCase().includes("url") ||
  key.toLowerCase().includes("key")
));
