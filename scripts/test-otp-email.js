const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function testOtpEmail() {
  const email = 'mainteamproject7@gmail.com';
  const otp = '473583';

  console.log(`📧 Sending test OTP email to ${email}...`);

  try {
    // Read from the frontend_test_latest directory as that's where we made changes
    const templatePath = path.join(process.cwd(), 'frontend_test_latest', 'app', 'api', 'send-otp', 'mail.html');
    let html = fs.readFileSync(templatePath, 'utf-8');
    
    html = html.replace("{{OTP}}", otp);

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
      subject: 'ScaleUp Login OTP',
      html,
    });

    console.log('✅ OTP Email sent successfully:', info.messageId);
  } catch (emailError) {
    console.error('❌ Failed to send OTP email:', emailError);
  }
}

testOtpEmail();
