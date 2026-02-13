const fetch = require('node-fetch');

async function testPhonePriority() {
  const baseUrl = 'http://localhost:3000/scaleup2026';
  const testPhone = '+911111111111';
  
  console.log('--- STARTING PHONE PRIORITY TEST ---');

  // Step 1: Register/Generate for a phone number
  console.log('\n1. Sending generation request for phone:', testPhone);
  const formData = new URLSearchParams();
  formData.append('name', 'Test User');
  formData.append('phone_no', testPhone);
  formData.append('organization', 'Test Org');
  formData.append('district', 'Test District');
  formData.append('category', 'Test Category');
  formData.append('prompt_type', 'prompt1');
  
  // Note: We can't easily send a real file here without more setup, 
  // but we can check the lookup logic in the route.
  
  // Step 2: Test the GET endpoint with the phone number
  console.log('\n2. Testing GET /user/[phone] for:', testPhone);
  try {
    const getResponse = await fetch(`${baseUrl}/user/${encodeURIComponent(testPhone)}`);
    const getData = await getResponse.json();
    
    if (getResponse.status === 200 || getResponse.status === 202) {
      console.log('✅ GET request successful');
      console.log('Response status:', getResponse.status);
      console.log('Data:', JSON.stringify(getData, null, 2));
      
      if (getData.final_image_url || getData.generated_image_url) {
        console.log('✅ Image URL found in response');
      } else if (getResponse.status === 202) {
        console.log('ℹ️ User found, image is processing (Expected for new/cleared generation)');
      }
    } else {
      console.error('❌ GET request failed with status:', getResponse.status);
      console.error('Error:', getData.error);
    }
  } catch (err) {
    console.error('❌ Network error during GET:', err.message);
  }

  console.log('\n--- TEST COMPLETE ---');
}

testPhonePriority();
