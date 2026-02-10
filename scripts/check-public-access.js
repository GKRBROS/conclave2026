const axios = require('axios');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

async function checkPublicAccess() {
  const AWS_S3_REGION = process.env.AWS_REGION || 'ap-south-1';
  const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
  const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
  const BUCKET_NAME = 'frameforge';

  const s3 = new S3Client({
    region: AWS_S3_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  const key = 'test-public-access.txt';
  const publicUrl = `https://${BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${key}`;

  console.log('1. Uploading test file with ACL public-read...');
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: 'Hello World',
      ContentType: 'text/plain',
      ACL: 'public-read'
    }));
    console.log('✅ Upload successful.');
  } catch (err) {
    console.error('❌ Upload failed:', err.message);
    if (err.message.includes('Access Denied')) {
        console.log('⚠️  It seems ACLs are blocked or you lack permission to set ACLs.');
    }
  }

  console.log(`2. Checking public URL: ${publicUrl}`);
  try {
    const response = await axios.get(publicUrl);
    console.log('✅ Public access WORKS! Status:', response.status);
    console.log('Content:', response.data);
  } catch (err) {
    console.error('❌ Public access FAILED.');
    console.error('Status:', err.response?.status);
    console.error('Data:', err.response?.data);
    if (err.response?.data && err.response.data.includes('AccessDenied')) {
        console.log('🔒 Access Denied confirmed. The bucket blocks public access.');
    }
  }
}

checkPublicAccess();
