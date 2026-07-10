const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function generateParentPassword(studentName, phoneNumber) {
  const digits = (phoneNumber || '').replace(/\D/g, '');
  const last5 = digits.slice(-5).padStart(5, '0');
  const namePart = (studentName || '').trim().replace(/[^a-zA-Z]/g, '');
  const rawFirst3 = namePart.padEnd(3, 'x').slice(0, 3);
  const first3 = rawFirst3.charAt(0).toUpperCase() + rawFirst3.slice(1).toLowerCase();
  return `${first3}${last5}`;
}

async function run() {
  const dryRun = process.argv.includes('--apply') ? false : true;
  console.log(`Starting parent password update script (Dry Run: ${dryRun})`);
  if (dryRun) {
    console.log('To apply changes, run: node scripts/update_parent_passwords.js --apply');
  } else {
    console.log('Applying changes to Supabase Auth and database...');
  }

  try {
    const { data: parents, error: pErr } = await supabaseAdmin
      .from('parents')
      .select('id, full_name, email, phone_number, password_hash, students(full_name)');

    if (pErr) throw pErr;

    console.log(`Found ${parents.length} parents in database.`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const parent of parents) {
      // Find the first student name
      const studentName = parent.students && parent.students.length > 0 
        ? parent.students[0].full_name 
        : parent.full_name; // Fallback to parent's own name if no student is linked

      const newPassword = generateParentPassword(studentName, parent.phone_number);
      const oldPassword = parent.password_hash;

      if (oldPassword === newPassword) {
        console.log(`[-] Parent: ${parent.full_name} (${parent.email}) - Password already matches formula: ${newPassword}. Skipping.`);
        skipCount++;
        continue;
      }

      console.log(`[+] Parent: ${parent.full_name} (${parent.email})`);
      console.log(`    Old Password: ${oldPassword || '(None)'}`);
      console.log(`    New Password: ${newPassword} (From: "${studentName}", "${parent.phone_number}")`);

      if (!dryRun) {
        try {
          // 1. Update Supabase Auth user password
          const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(parent.id, {
            password: newPassword
          });
          if (authError) {
            console.error(`    [ERROR] Auth update failed: ${authError.message}`);
            errorCount++;
            continue;
          }

          // 2. Update parent database record password_hash
          const { error: dbError } = await supabaseAdmin
            .from('parents')
            .update({ password_hash: newPassword })
            .eq('id', parent.id);

          if (dbError) {
            console.error(`    [ERROR] DB update failed: ${dbError.message}`);
            errorCount++;
            continue;
          }

          console.log(`    [SUCCESS] Updated Auth and Database password to ${newPassword}`);
          successCount++;
        } catch (err) {
          console.error(`    [ERROR] Unexpected error:`, err);
          errorCount++;
        }
      } else {
        successCount++; // Count as success in dry-run simulation
      }
    }

    console.log('\n=========================================');
    console.log(`Execution complete.`);
    console.log(`Total checked:  ${parents.length}`);
    console.log(`To/Did update:  ${successCount}`);
    console.log(`Skipped:        ${skipCount}`);
    console.log(`Errors:         ${errorCount}`);
    console.log('=========================================');

  } catch (error) {
    console.error('Fatal Error:', error);
  }
}

run();
