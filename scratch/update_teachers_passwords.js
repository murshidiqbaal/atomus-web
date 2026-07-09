const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const { data: teachers, error } = await supabaseAdmin
      .from('teachers')
      .select('id, full_name, subject_specialization, password_hash, campuses(name)');
    if (error) throw error;

    console.log(`Loaded ${teachers.length} teachers. Processing bcrypt hashes...`);

    for (const t of teachers) {
      if (t.password_hash && t.password_hash.startsWith('$2')) {
        // Derive Initials
        const cleanName = t.full_name.trim().replace(/[^a-zA-Z\s]/g, '');
        const nameParts = cleanName.split(/\s+/).filter(Boolean);
        let initials = 'TR';
        
        if (nameParts.length >= 2) {
          initials = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
        } else if (nameParts.length === 1) {
          initials = nameParts[0].substring(0, 2).toUpperCase();
        }

        // Handle specific edge case names
        const lowerName = t.full_name.toLowerCase();
        if (lowerName.includes('arya v.k') || lowerName.includes('arya vk')) {
          initials = 'AV';
        }

        // Derive Subject abbreviation
        let subPrefix = 'Te';
        const spec = (t.subject_specialization || '').toLowerCase();
        if (spec.includes('chem')) subPrefix = 'Ch';
        else if (spec.includes('math')) subPrefix = 'Ma';
        else if (spec.includes('phys')) subPrefix = 'Ph';
        else if (spec.includes('biol')) subPrefix = 'Bi';
        else if (spec.includes('social')) subPrefix = 'Ss';

        // Derive Campus abbreviation
        let campusSuffix = 'ARR26';
        const campus = (t.campuses?.name || '').toLowerCase();
        if (campus.includes('piravom')) {
          campusSuffix = 'PVM26';
        }

        const derivedPassword = `${initials}${subPrefix}@${campusSuffix}`;
        console.log(`Updating ${t.full_name}: "${t.password_hash}" -> "${derivedPassword}"`);

        const { error: updateErr } = await supabaseAdmin
          .from('teachers')
          .update({ password_hash: derivedPassword })
          .eq('id', t.id);

        if (updateErr) {
          console.error(`Failed to update ${t.full_name}:`, updateErr);
        }
      }
    }
    console.log('Update complete!');
  } catch (err) {
    console.error('Error during run:', err);
  }
}

run();
