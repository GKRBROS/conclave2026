require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseServiceKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findEmail() {
  console.log('Searching for a valid email in generations table...');
  const { data, error } = await supabase
    .from('generations')
    .select('email, name')
    .not('email', 'is', null)
    .limit(5);

  if (error) {
    console.error('Error fetching generations:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Found emails:', data);
  } else {
    console.log('No emails found in generations table.');
  }
}

findEmail();
