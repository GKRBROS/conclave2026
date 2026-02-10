
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function uploadRealImage() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'layer.png');
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ Source file not found:', filePath);
      return;
    }

    const fileContent = fs.readFileSync(filePath);

    const command = new PutObjectCommand({
      Bucket: 'frameforge',
      Key: 'generated/generated-test.png',
      Body: fileContent,
      ContentType: 'image/png',
    });

    await s3.send(command);
    console.log('✅ Uploaded public/layer.png to generated/generated-test.png');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

uploadRealImage();
