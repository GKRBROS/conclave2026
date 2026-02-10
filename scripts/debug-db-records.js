
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkRecords() {
  const email = 'mainteamproject7@gmail.com';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('email', email);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Records found:', data.length);
  console.log(JSON.stringify(data, null, 2));
}

checkRecords();
