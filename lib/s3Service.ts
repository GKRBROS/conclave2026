import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';

const AWS_S3_REGION = process.env.AWS_REGION || 'ap-south-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY!;
const BUCKET_NAME = 'frameforge';

const s3 = new S3Client({
  region: AWS_S3_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

export class S3Service {
  /**
   * Get pre-signed URL for downloading a file from S3
   */
  static async getPresignedUrl(key: string, expiresInSec = 3600, contentType?: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ResponseContentType: contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: expiresInSec });
    return url;
  }

  /**
   * Get pre-signed URL for downloading a file from S3 with attachment disposition
   */
  static async getDownloadPresignedUrl(key: string, filename: string, expiresInSec = 3600, contentType?: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
      ResponseContentType: contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: expiresInSec });
    return url;
  }

  /**
   * Upload buffer to S3
   */
  static async uploadBuffer(
    buffer: Buffer,
    folder: 'uploads' | 'generated' | 'final',
    filename: string,
    contentType: string
  ): Promise<string> {
    const fileKey = `${folder}/${Date.now()}-${filename}`;

    const parallelUpload = new Upload({
      client: s3,
      params: {
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: buffer,
        ContentType: contentType,
        // ACL: 'public-read', // Bucket does not allow ACLs
      },
    });

    await parallelUpload.done();
    console.log(`✅ Uploaded to S3: ${fileKey}`);
    
    return fileKey;
  }

  /**
   * Get public URL for S3 object
   */
  static getPublicUrl(key: string): string {
    return `https://${BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${key}`;
  }

  /**
   * Upload file with streaming
   */
  static async uploadFile(
    filePath: string,
    folder: 'uploads' | 'generated' | 'final',
    filename: string,
    contentType: string
  ): Promise<string> {
    const fs = require('fs');
    const fileStream = fs.createReadStream(filePath);
    const fileKey = `${folder}/${Date.now()}-${filename}`;

    const parallelUpload = new Upload({
      client: s3,
      params: {
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: fileStream,
        ContentType: contentType,
        // ACL: 'public-read', // Bucket does not allow ACLs
      },
    });

    await parallelUpload.done();
    console.log(`✅ Uploaded to S3: ${fileKey}`);

    // Cleanup local file
    fs.unlink(filePath, (err: any) => {
      if (err) {
        console.error('Failed to delete local file:', err);
      }
    });

    return fileKey;
  }
}
