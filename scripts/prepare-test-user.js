require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function prepareAndTest() {
  const testEmail = 'mainteamproject7@gmail.com';
  console.log(`Checking if ${testEmail} exists...`);

  // Check if exists
  const { data: existing, error: findError } = await supabase
    .from('generations')
    .select('*')
    .eq('email', testEmail)
    .maybeSingle();

  if (findError) {
    console.error('Error checking DB:', findError);
    return;
  }

  if (!existing) {
    console.log('Email not found. Inserting dummy record...');
    const { error: insertError } = await supabase
      .from('generations')
      .insert({
        email: testEmail,
        name: 'Test User',
        phone_no: '1234567890',
        organization: 'Test Org',
        prompt_type: 'prompt1',
        status: 'completed',
        image_url: 'https://example.com/dummy.jpg'
      });
    
    if (insertError) {
      console.error('Failed to insert dummy record:', insertError);
      return;
    }
    console.log('Dummy record inserted.');
  } else {
    console.log('Email already exists.');
  }

  console.log('Ready for API test.');
}

prepareAndTest();
