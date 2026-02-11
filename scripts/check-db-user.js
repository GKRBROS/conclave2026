const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser() {
  const email = 'mainteamproject7@gmail.com';
  console.log(`Checking for user: ${email}`);

  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('email', email)
    .limit(1);

  if (error) {
    console.error('Error fetching user:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ User found in DB:', data[0].email, `(ID: ${data[0].id})`);
    console.log('   Phone:', data[0].phone_no);
    console.log('   Image URL:', data[0].generated_image_url);
    console.log('   AWS Key:', data[0].aws_key);
  } else {
    console.error('❌ User NOT found in DB. Please generate an avatar first.');
  }
}

checkUser();
