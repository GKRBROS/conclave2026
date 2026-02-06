const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

require('dotenv').config({ path: '.env.local' });

const BUCKET = 'frameforge';
const REGION = process.env.AWS_REGION || 'ap-south-1';
const KEY = 'final/1770377168661-final-1770377168660.png';

(async () => {
  const s3 = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: KEY });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
  console.log(url);
})();
