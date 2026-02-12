const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

// CONFIGURATION
const AWS_S3_REGION = process.env.AWS_REGION || 'ap-south-1';
const BUCKET_NAME = 'frameforge';

// ==========================================
// PASTE YOUR LOCKED URL HERE
// ==========================================
const LOCKED_URL = 'https://frameforge.s3.ap-south-1.amazonaws.com/final/1770874710761-final-5717e0f5-a2b1-4f10-8b59-1ac9b94e1cd9.png'
async function unlock() {
  if (LOCKED_URL === 'PASTE_YOUR_URL_HERE' || !LOCKED_URL) {
    console.error('❌ Please paste your S3 URL into the LOCKED_URL variable on line 13.');
    process.exit(1);
  }

  try {
    console.log('--- S3 URL UNLOCKER ---');
    console.log(`Input URL: ${LOCKED_URL}`);

    const url = new URL(LOCKED_URL);
    const key = url.pathname.replace(/^\//, '');
    
    console.log(`Extracting key: ${key}`);

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('❌ AWS Credentials missing in .env.local');
      process.exit(1);
    }

    const s3 = new S3Client({
      region: AWS_S3_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    // Generate signed URL with 7 days expiry
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 604800 });

    console.log('\n✅ UNLOCKED URL (Viewable & Downloadable):');
    console.log('--------------------------------------------------------------------------------');
    console.log(signedUrl);
    console.log('--------------------------------------------------------------------------------');
    console.log('\nInstructions: Copy the link above and open it in your browser.');
    console.log('This link will remain valid for 7 days.');

  } catch (error) {
    console.error('\n❌ Error unlocking URL:');
    if (error.code === 'ERR_INVALID_URL') {
      console.error('   The URL you provided is invalid. Please make sure it starts with http:// or https://');
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

unlock();
