import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txtvvlxaurqovghtngzm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dHZ2bHhhdXJxb3ZnaHRuZ3ptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA1Nzc5NCwiZXhwIjoyMDkzNjMzNzk0fQ.y02FVZ6Li9qB88hQSFvg_oEsqi1VKSikmmevrWkiDSk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const mahinId = '59a0e20d-039e-464d-982c-e5161bd96a64';
  const newDriveId = '16BM0dSeT6KGG2zA01Lsoh9D74HYKaQwN';
  const newUrl = `/api/media?id=${newDriveId}`;

  const { data, error } = await supabase
    .from('students')
    .update({
      profile_photo_url: newUrl,
      profile_photo_drive_id: newDriveId
    })
    .eq('id', mahinId)
    .select();

  if (error) {
    console.error('Error updating MAHIN photo:', error);
  } else {
    console.log('Successfully updated MAHIN photo:', data);
  }
}

run();
