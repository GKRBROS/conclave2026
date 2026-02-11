const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const API_KEY = process.env.MAKEMYPASS_API_KEY;
const API_URL = 'https://api.makemypass.com/whatsapp/send';

// Phone from user input
const PHONE = '917736526607'; 
// Use a test image URL (presigned or public)
// Using a placeholder image that mimics a real image URL
const IMAGE_URL = 'https://picsum.photos/200/300.jpg'; 

async function send() {
  console.log(`Sending to ${PHONE} with Key: ${API_KEY ? 'Present' : 'Missing'}`);
  if (!API_KEY) {
    console.error('API Key is missing!');
    return;
  }

  try {
    const formattedPhone = PHONE.replace(/\+/g, '').replace(/\D/g, '');
    console.log(`Formatted Phone: ${formattedPhone}`);
    
    const res = await axios.post(API_URL, {
        phone_number: formattedPhone,
        image_url: IMAGE_URL
    }, {
        headers: { 'x-api-key': API_KEY }
    });
    console.log('✅ Success:', res.data);
  } catch (e) {
    console.error('❌ Error:', e.response ? e.response.data : e.message);
  }
}

send();
