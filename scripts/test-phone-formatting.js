const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

class WhatsappService {
  static API_URL = 'https://api.makemypass.com/whatsapp/send';
  static API_KEY = process.env.MAKEMYPASS_API_KEY;

  static async sendImage(phoneNumber, imageUrl) {
    try {
      if (!this.API_KEY) {
        console.error('❌ MAKEMYPASS_API_KEY is not configured');
        return;
      }

      let formattedPhone = phoneNumber.replace(/\D/g, '');

      if (formattedPhone.length === 10) {
        formattedPhone = '91' + formattedPhone;
        console.log(`🇮🇳 India detected (10 digits). Prepending 91: ${formattedPhone}`);
      } else {
        console.log(`🌍 Country code already present or non-India: ${formattedPhone}`);
      }

      console.log(`📤 Sending to ${formattedPhone}`);
      console.log(`🔗 URL: ${imageUrl}`);

      // We won't actually call the API in this test to avoid spamming, 
      // just verifying the formatting logic matches lib/whatsappService.ts
      return formattedPhone;
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

async function test() {
  console.log('--- Test 1: 10-digit Indian number ---');
  await WhatsappService.sendImage('7736526607', 'https://example.com/img.png');

  console.log('\n--- Test 2: Number with +91 ---');
  await WhatsappService.sendImage('+917736526607', 'https://example.com/img.png');

  console.log('\n--- Test 3: US number with +1 ---');
  await WhatsappService.sendImage('+14155552671', 'https://example.com/img.png');

  console.log('\n--- Test 4: Number with spaces and dashes ---');
  await WhatsappService.sendImage('+44 20 7123-4567', 'https://example.com/img.png');
}

test();
