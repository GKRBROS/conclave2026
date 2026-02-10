import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { handleCorsOptions } from '@/lib/cors';

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

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const imageUrl = searchParams.get('url');
        const isDownload = searchParams.get('download') === 'true';

        if (!imageUrl) {
            return new NextResponse('Missing URL parameter', { status: 400 });
        }

        console.log('🖼️ Proxying image request for:', imageUrl);

        // Parse the key from the S3 URL
        // Format: https://bucket.s3.region.amazonaws.com/key
        let key: string;
        try {
            const url = new URL(imageUrl);
            // Remove leading slash
            key = url.pathname.replace(/^\//, '');
        } catch (e) {
            // If it's not a full URL, assume it's a key
            key = imageUrl;
        }

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        const { Body, ContentType } = await s3.send(command);

        if (!Body) {
            return new NextResponse('Empty response from S3', { status: 404 });
        }

        // Convert stream to buffer
        const streamToBuffer = async (stream: any): Promise<Buffer> => {
            const chunks: any[] = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        };

        const buffer = await streamToBuffer(Body);

        const headers: Record<string, string> = {
            'Content-Type': ContentType || 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
        };

        if (isDownload) {
            headers['Content-Disposition'] = 'attachment; filename="conclave-poster.png"';
        }

        return new Response(new Uint8Array(buffer), {
            headers,
        });
    } catch (error: any) {
        console.error('❌ Proxy error:', error);
        return new NextResponse(`Proxy error: ${error.message}`, { status: 500 });
    }
}
