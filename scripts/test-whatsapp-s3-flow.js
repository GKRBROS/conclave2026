const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Mock S3Service and WhatsappService if we can't import them directly due to TypeScript
// But we should try to use ts-node or just require them if they are compiled.
// Since this is a JS script, we can't directly import TS files unless we compile them or use ts-node.
// Given the environment, I'll rewrite the logic in JS using the same classes/functions structure 
// to avoid compilation issues, or I can try to use the project's setup.

// Actually, simpler approach: Re-implement the S3 and WhatsApp logic in this script 
// using the same environment variables. This ensures we verify the *logic* and *credentials*.

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require('@aws-sdk/lib-storage');

const AWS_S3_REGION = process.env.AWS_REGION || 'ap-south-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const BUCKET_NAME = 'frameforge'; // Hardcoded in original file, should be env var ideally but matching code
const MAKEMYPASS_API_KEY = process.env.MAKEMYPASS_API_KEY;

console.log('Config:', {
    region: AWS_S3_REGION,
    bucket: BUCKET_NAME,
    hasAwsKey: !!AWS_ACCESS_KEY_ID,
    hasWhatsappKey: !!MAKEMYPASS_API_KEY
});

const s3 = new S3Client({
  region: AWS_S3_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

async function uploadBuffer(buffer, folder, filename, contentType) {
    const fileKey = `${folder}/${Date.now()}-${filename}`;
    const parallelUpload = new Upload({
      client: s3,
      params: {
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: buffer,
        ContentType: contentType,
      },
    });
    await parallelUpload.done();
    console.log(`✅ Uploaded to S3: ${fileKey}`);
    return fileKey;
}

function getPublicUrl(key) {
    return `https://${BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${key}`;
}

async function getPresignedUrl(key, expiresInSec = 3600) {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: expiresInSec });
    return url;
}

async function sendWhatsapp(phoneNumber, imageUrl) {
    const API_URL = 'https://api.makemypass.com/whatsapp/send';
    const formattedPhone = phoneNumber.replace(/\+/g, '').replace(/\D/g, '');
    
    console.log(`📤 Sending WhatsApp to ${formattedPhone}`);
    console.log(`🔗 URL: ${imageUrl}`);

    try {
        const response = await axios.post(API_URL, {
            phone_number: formattedPhone,
            image_url: imageUrl,
        }, {
            headers: {
                'x-api-key': MAKEMYPASS_API_KEY,
                'Content-Type': 'application/json',
            },
        });
        console.log('✅ WhatsApp Sent:', response.data);
    } catch (error) {
        console.error('❌ WhatsApp Failed:', error.response ? error.response.data : error.message);
    }
}

async function runTest() {
    try {
        // 1. Get a random image
        console.log('📥 Fetching test image...');
        const imgRes = await axios.get('https://picsum.photos/200/300', { responseType: 'arraybuffer' });
        const buffer = Buffer.from(imgRes.data);

        // 2. Upload to S3 (simulating mergeImages internal upload)
        console.log('📤 Uploading to S3 (final folder)...');
        const key = await uploadBuffer(buffer, 'final', 'test-image.jpg', 'image/jpeg');

        // 3. Get Public URL (simulating mergeImages return value)
        const publicUrl = getPublicUrl(key);
        console.log('🔗 Public URL (from mergeImages):', publicUrl);

        // 4. Extract Key (simulating route logic)
        // Logic from route.ts: 
        // const finalKey = finalImagePath.includes('amazonaws.com') ? new URL(finalImagePath).pathname.replace(/^\//, '') : finalImagePath;
        const extractedKey = publicUrl.includes('amazonaws.com') 
            ? new URL(publicUrl).pathname.replace(/^\//, '') 
            : publicUrl;
        
        console.log('🔑 Extracted Key:', extractedKey);
        if (extractedKey !== key) {
            console.warn('⚠️ Key mismatch!', { original: key, extracted: extractedKey });
        }

        // 5. Get Presigned URL
        console.log('✍️ Generating Presigned URL...');
        const presignedUrl = await getPresignedUrl(extractedKey, 604800); // 7 days
        console.log('🔗 Presigned URL:', presignedUrl);

        // 6. Send to WhatsApp
        console.log('📱 Sending to WhatsApp...');
        await sendWhatsapp('917736526607', presignedUrl);

    } catch (err) {
        console.error('❌ Test Failed:', err);
    }
}

runTest();
