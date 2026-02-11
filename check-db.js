
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function searchAll() {
  console.log(`Searching for ALL records...`);
  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error searching:', error);
  } else {
    console.log(`Found ${data.length} records:`);
    data.forEach(row => {
      console.log(`ID: ${row.id} | Name: ${row.name} | Email: ${row.email} | Phone: ${row.phone_no} | PromptType: ${row.prompt_type} | CreatedAt: ${row.created_at}`);
    });
  }
}

searchAll();
