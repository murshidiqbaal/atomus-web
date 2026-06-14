console.log("Environment variables:", Object.keys(process.env).filter(k => k.includes("SUPABASE") || k.includes("DATABASE") || k.includes("GOOGLE")));
