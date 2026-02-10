
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function checkFile() {
  try {
    const command = new HeadObjectCommand({
      Bucket: 'frameforge',
      Key: 'generated/generated-test.png',
    });
    const response = await s3.send(command);
    console.log('✅ File exists');
    console.log('Content-Type:', response.ContentType);
  } catch (error) {
    console.error('❌ File does not exist:', error.name);
  }
}

checkFile();
