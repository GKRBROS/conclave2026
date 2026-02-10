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
    imageUrl = imageUrl.replace(/&/g, '&amp;');
    console.log(`✅ Escaped URL for HTML: ${imageUrl}`);
  } catch (err) {
    console.error('❌ Failed to generate presigned URL:', err);
    // Fallback to static URL if signing fails (should not happen if creds are good)
    imageUrl = `https://${BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${key}`;
  }

  console.log(`📧 Sending test email to ${email}...`);

  try {
    const templatePath = path.join(process.cwd(), 'send-mail', 'mail.html');
    let html = fs.readFileSync(templatePath, 'utf-8');
    
    html = html.replace(/{{DOWNLOAD_URL}}/g, imageUrl);

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
  } catch (emailError) {
    console.error('❌ Failed to send email:', emailError);
  }
}

testEmail();
