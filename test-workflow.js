const fs = require('fs');
const path = require('path');

async function testWorkflow() {
  console.log('=== TESTING COMPLETE WORKFLOW ===\n');
  
  // Use example.jpeg from public folder
  const testImagePath = path.join(__dirname, 'public', 'example.jpeg');
  
  if (!fs.existsSync(testImagePath)) {
    console.error('❌ Test image not found:', testImagePath);
    return;
  }

  console.log('✓ Test image found');
  console.log('📸 Image:', testImagePath);
  console.log('📊 Size:', Math.round(fs.statSync(testImagePath).size / 1024), 'KB\n');

  // Prepare form data
  const form = new FormData();
  form.append('name', 'Test User');
  form.append('email', 'test@example.com');
  form.append('phone_no', '+919876543210');
  form.append('district', 'Test District');
  form.append('category', 'Working Professionals');
  form.append('organization', 'Test Organization');
  form.append('prompt_type', 'prompt2');
  form.append('gender', 'male');
  const fileBuffer = fs.readFileSync(testImagePath);
  const fileBlob = new Blob([fileBuffer], { type: 'image/jpeg' });
  form.append('photo', fileBlob, 'example.jpeg');

  console.log('📤 Sending POST request to http://localhost:3000/scaleup2026/generate\n');
  console.log('Request Parameters:');
  console.log('  - name: Test User');
  console.log('  - email: test@example.com');
  console.log('  - category: Working Professionals');
  console.log('  - organization: Test Organization');
  console.log('  - prompt_type: prompt2');
  console.log('  - gender: male\n');

  try {
    const response = await fetch('http://localhost:3000/scaleup2026/generate', {
      method: 'POST',
      body: form,
    });

    console.log('Response Status:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('\n📥 Response Data:');
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ SUCCESS! Workflow completed');
      console.log('\n🔍 Key Results:');
      console.log('  - User ID:', data.user_id);
      console.log('  - Final Image URL:', data.final_image_url);
      console.log('  - Photo URL:', data.photo_url);
      console.log('  - Generated Image URL:', data.generated_image_url);
      
      // Test GET endpoint
      console.log('\n📤 Testing GET endpoint...');
      const getResponse = await fetch(`http://localhost:3000/scaleup2026/user/${data.user_id}`);
      const getData = await getResponse.json();
      console.log('\n📥 GET Response:');
      console.log(JSON.stringify(getData, null, 2));
      
      if (getData.final_image_url) {
        console.log('\n✅ GET endpoint working! Final image URL retrieved.');
      } else {
        console.log('\n❌ GET endpoint returned no final_image_url');
      }
    } else {
      console.log('\n❌ FAILED:', data.error);
      if (data.details) {
        console.log('Details:', data.details);
      }
    }
  } catch (error) {
    console.error('\n❌ ERROR during test:', error.message);
    console.error('Stack:', error.stack);
  }
}

testWorkflow();
