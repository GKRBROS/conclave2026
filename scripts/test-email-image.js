const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config({ path: '.env.local' });

async function testEmail() {
  const email = 'mainteamproject7@gmail.com';
  
  // S3 Config
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

  const key = 'generated/generated-test.png';

  console.log('🔄 Uploading dummy image to ensure it exists...');
  try {
    // Create a 1x1 transparent GIF buffer or similar. 
    // Here is a base64 for a 1x1 red pixel png
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(base64Image, 'base64');

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
    }));
    console.log('✅ Upload successful.');
  } catch (err) {
    console.error('❌ Upload failed:', err);
    return;
  }

  console.log('🔄 Generating presigned URL for testing...');
  let imageUrl;
  
  try {
    // Generate Presigned URL
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    // 7 days expiry
    imageUrl = await getSignedUrl(s3, command, { expiresIn: 604800 });
    console.log(`✅ Generated Presigned URL: ${imageUrl}`);
    
    // Escape for HTML
    const escapedImageUrl = imageUrl.replace(/&/g, '&amp;');
    console.log(`✅ Escaped URL for HTML: ${escapedImageUrl}`);

    // Verify URL access
    console.log('🔄 Verifying URL access...');
    // We can't easily fetch it here without axios/fetch, assuming it works if upload worked.
    // But we can verify the structure.
    
    console.log(`📧 Sending test email to ${email}...`);
    const templatePath = path.join(process.cwd(), 'send-mail', 'mail.html');
    let html = fs.readFileSync(templatePath, 'utf-8');
    
    html = html.replace(/{{DOWNLOAD_URL}}/g, escapedImageUrl);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST_NAME,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"ScaleUp" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'ScaleUp Generated Avatar',
      html,
    });

    console.log('✅ Email sent successfully:', info.messageId);
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

testEmail();
