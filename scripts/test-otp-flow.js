const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'mainteamproject7@gmail.com';

async function testOtpFlow() {
  try {
    console.log(`1. Generating OTP for ${TEST_EMAIL}...`);
    const genRes = await axios.post(`${BASE_URL}/scaleup2026/otp/generate`, {
      email: TEST_EMAIL
    });

    console.log('Generate Response Status:', genRes.status);
    console.log('Generate Response Data:', genRes.data);

    if (!genRes.data.success) {
      console.error('OTP Generation failed');
      return;
    }

    const otp = genRes.data.otp;
    console.log(`\n-> Received OTP: ${otp}`);

    if (!otp) {
      console.error('No OTP returned in response (check backend logic if this is intended)');
      return;
    }

    console.log(`\n2. Verifying OTP ${otp} for ${TEST_EMAIL}...`);
    const verifyRes = await axios.post(`${BASE_URL}/scaleup2026/otp/verify`, {
      email: TEST_EMAIL,
      otp: otp
    });

    console.log('Verify Response Status:', verifyRes.status);
    console.log('Verify Response Data:', verifyRes.data);

    if (verifyRes.data.success) {
      console.log('\nSUCCESS: OTP Flow verified successfully!');
    } else {
      console.error('\nFAILURE: OTP Verification failed');
    }

  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Connection Error:', error.message);
    }
  }
}

testOtpFlow();
