const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const email = 'mainteamproject7@gmail.com';
  
  // 1. Setup Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 2. Query Database
  console.log(`🔍 Searching for generations for ${email}...`);
  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('❌ Database error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.error('❌ No record found for this email.');
    return;
  }
  
  console.log(`✅ Found ${data.length} records.`);
  
  // Find first record with image
   const recordWithImage = data.find(r => r.aws_key || r.generated_image_url);
   
   let key;
   if (!recordWithImage) {
       console.warn('⚠️ No record with image found for this email in the database.');
       // console.log('⚠️ Falling back to test image: generated/generated-test.png');
       // key = 'generated/generated-test.png';
       console.log('⚠️ Using user-provided test image: final/1770716523543-final-1770716523543.png');
       key = 'final/1770716523543-final-1770716523543.png';
   } else {
       console.log('✅ Found record with image:', recordWithImage.id);
       console.log('   AWS Key:', recordWithImage.aws_key);
       console.log('   Generated URL:', recordWithImage.generated_image_url);
       
       // 3. Determine S3 Key
       key = recordWithImage.aws_key;
       if (!key && recordWithImage.generated_image_url) {
         try {
             if (recordWithImage.generated_image_url.includes('amazonaws.com')) {
                  key = new URL(recordWithImage.generated_image_url).pathname.replace(/^\//, '');
             } else {
                  key = recordWithImage.generated_image_url;
             }
         } catch (e) {
             console.error("Error parsing URL", e);
         }
       }
   }
  
  if (!key) {
    console.error('❌ Could not determine S3 key.');
    return;
  }
  
  console.log(`🔑 Using S3 Key: ${key}`);
  
  // 4. Generate Presigned URLs
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
  
  try {
    const viewCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ResponseContentType: 'image/png',
    });
    
    const downloadCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: 'attachment; filename="scaleup-avatar.png"',
      ResponseContentType: 'image/png',
    });
    
    const imageUrl = await getSignedUrl(s3, viewCommand, { expiresIn: 86400 }); // 1 day
    const downloadUrl = await getSignedUrl(s3, downloadCommand, { expiresIn: 86400 });
    
    console.log(`✅ Generated View URL: ${imageUrl}`);
    
    // 5. Send Email
    // Do NOT escape ampersands manually - let nodemailer/email client handle it
    // const escapedImageUrl = imageUrl.replace(/&/g, '&amp;');
    // const escapedDownloadUrl = downloadUrl.replace(/&/g, '&amp;');
    
    console.log(`📧 Sending email to ${email}...`);
    const templatePath = path.join(process.cwd(), 'send-mail', 'mail.html');
    let html = fs.readFileSync(templatePath, 'utf-8');
    
    html = html.replace(/{{IMAGE_URL}}/g, imageUrl);
    html = html.replace(/{{DOWNLOAD_URL}}/g, downloadUrl);

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

main();
