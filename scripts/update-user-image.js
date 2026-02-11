const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateUserImage() {
  const email = 'mainteamproject7@gmail.com';
  console.log(`Updating user: ${email}`);

  // URL provided by user
  const imageUrl = 'https://frameforge.s3.ap-south-1.amazonaws.com/final/1770716523543-final-1770716523543.png';
  const awsKey = 'final/1770716523543-final-1770716523543.png';

  const { data, error } = await supabase
    .from('generations')
    .update({ 
      generated_image_url: imageUrl,
      aws_key: awsKey
    })
    .eq('email', email)
    .select();

  if (error) {
    console.error('❌ Error updating user:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ User updated successfully:');
    console.log('   ID:', data[0].id);
    console.log('   Email:', data[0].email);
    console.log('   Image URL:', data[0].generated_image_url);
    console.log('   AWS Key:', data[0].aws_key);
  } else {
    console.error('❌ User NOT found or not updated.');
  }
}

updateUserImage();
