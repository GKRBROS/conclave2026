const axios = require('axios');

async function test() {
  // Test 1: Unregistered Email
  try {
    console.log('Testing Unregistered Email (should fail with 404 + redirect)...');
    const res1 = await axios.post('http://localhost:3000/api/otp/generate', {
        email: 'unregistered-test-123@example.com'
    });
    console.log('Unexpected Success:', res1.status, res1.data);
  } catch (e) {
    if (e.response) {
        console.log('✅ Correctly Failed:', e.response.status);
        console.log('   Data:', e.response.data);
    } else {
        console.log('❌ Error:', e.message);
    }
  }

  // Test 2: Registered Email (mainteamproject7@gmail.com)
  try {
    console.log('\nTesting Registered Email (mainteamproject7@gmail.com)...');
    const res2 = await axios.post('http://localhost:3000/api/otp/generate', {
        email: 'mainteamproject7@gmail.com'
    });
    console.log('✅ Generate Success:', res2.status);
    
    const otp = res2.data.otp;
    console.log('   Got OTP:', otp);

    // Test 3: Verify OTP
    console.log('\nTesting Verify OTP...');
    const res3 = await axios.post('http://localhost:3000/api/otp/verify', {
        email: 'mainteamproject7@gmail.com',
        otp: otp
    });
    console.log('✅ Verify Success:', res3.data.success);
    console.log('   RedirectTo:', res3.data.redirectTo); // Should be null or undefined if image exists
    console.log('   Has Image URL:', !!res3.data.user.generated_image_url);
    
  } catch (e) {
     console.log('❌ Error in Flow:', e.response ? e.response.data : e.message);
  }
}

test();
