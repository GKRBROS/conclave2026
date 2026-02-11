import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

async function testGenerationFlow() {
  const API_URL = 'http://localhost:3001/scaleup2026/generate';
  const TEST_IMAGE_PATH = path.join(process.cwd(), 'public', 'background.png'); // Using background.png as a test file

  console.log('🚀 Starting Generation Flow Test...');

  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    console.error('❌ Test image not found at:', TEST_IMAGE_PATH);
    return;
  }

  const formData = new FormData();
  formData.append('photo', fs.createReadStream(TEST_IMAGE_PATH));
  formData.append('name', 'Test User');
  formData.append('organization', 'Test Org');
  formData.append('phone', '917736526607');
  formData.append('prompt_type', 'prompt1');

  try {
    console.log('📤 Sending POST request to:', API_URL);
    const response = await axios.post(API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 600000, // 10 minutes for AI generation
    });

    console.log('✅ Response Status:', response.status);
    console.log('📄 Response Body:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('✨ TEST PASSED: Image generated successfully!');
    } else {
      console.log('❌ TEST FAILED: Response was not success');
    }
  } catch (error) {
    console.error('❌ Error during generation test:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
  }
}

testGenerationFlow();
