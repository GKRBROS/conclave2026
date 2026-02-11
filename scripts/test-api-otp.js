const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'mainteamproject7@gmail.com';

async function testApiOtpFlow() {
  console.log(`\n🚀 Testing /api/otp endpoints for ${TEST_EMAIL}...\n`);

  try {
    // Step 1: Generate OTP
    console.log(`1️⃣  Calling POST /api/otp/generate...`);
    const genRes = await axios.post(`${BASE_URL}/api/otp/generate`, {
      email: TEST_EMAIL
    });

    console.log('   ✅ Status:', genRes.status);
    console.log('   ✅ Response:', JSON.stringify(genRes.data, null, 2));

    if (!genRes.data.success) {
      console.error('   ❌ OTP Generation failed');
      return;
    }

    const otp = genRes.data.otp;
    if (!otp) {
        console.warn('   ⚠️ No OTP returned in response (Production mode?). Checking console logs for OTP is recommended if dev mode.');
        // In production, we might not get the OTP back. 
        // Since we are running locally and I added logic to return OTP, it should be there.
        // If not, we can't proceed with verification unless we have access to DB or logs.
        // For this test, let's assume we need it.
        return;
    }
    console.log(`   🔑 Received OTP: ${otp}`);

    // Step 2: Verify OTP
    console.log(`\n2️⃣  Calling POST /api/otp/verify...`);
    const verifyRes = await axios.post(`${BASE_URL}/api/otp/verify`, {
      email: TEST_EMAIL,
      otp: otp
    });

    console.log('   ✅ Status:', verifyRes.status);
    console.log('   ✅ Response:', JSON.stringify(verifyRes.data, null, 2));

    if (verifyRes.data.success) {
      console.log('\n🎉 SUCCESS: OTP Flow verified via /api/otp endpoints!');
      
      if (verifyRes.data.user) {
          console.log('   👤 User data received:', verifyRes.data.user.email);
          if (verifyRes.data.user.generated_image_url) {
              console.log('   🖼️  Image URL:', verifyRes.data.user.generated_image_url);
          } else {
              console.warn('   ⚠️  No generated_image_url in user data');
          }
      }
    } else {
      console.error('\n❌ FAILURE: OTP Verification failed');
    }

  } catch (error) {
    if (error.response) {
      console.error('   ❌ API Error:', error.response.status);
      console.error('   ❌ Data:', error.response.data);
    } else {
      console.error('   ❌ Connection Error:', error.message);
    }
  }
}

testApiOtpFlow();
