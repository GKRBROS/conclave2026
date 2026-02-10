async function testApi() {
  const email = 'mainteamproject7@gmail.com';
  console.log(`Testing API for ${email}...`);

  try {
    const response = await fetch('http://localhost:3000/scaleup2026/otp/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testApi();
