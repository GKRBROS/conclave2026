
import { supabaseAdmin } from './lib/supabase/admin';

async function checkColumns() {
  const { data, error } = await supabaseAdmin
    .from('generations')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in generations table:', Object.keys(data[0]));
  } else {
    console.log('No data found in generations table to check columns.');
  }
}

checkColumns();
