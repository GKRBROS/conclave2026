import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { S3Service } from '@/lib/s3Service';
import { corsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const origin = request.headers.get('origin') || undefined;
    try {
        const { userId } = await params;

        // Validate phone number format
        const phoneRegex = /^\+?[0-9]{10,15}$/;
        if (!phoneRegex.test(userId)) {
            return NextResponse.json(
                { error: 'Invalid phone number format' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        const supabase = supabaseAdmin;

        // Fetch both the ticket (aws_key) and the raw AI image (generated_image_url)
        const { data, error } = await supabase
            .from('generations')
            .select('generated_image_url, aws_key, id')
            .eq('phone_no', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Database query error:', error);
            return NextResponse.json(
                { error: 'Database error', details: error.message },
                { status: 500, headers: corsHeaders(origin) }
            );
        }

        if (!data) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: corsHeaders(origin) }
            );
        }

        if (!data.aws_key && !data.generated_image_url) {
            return NextResponse.json(
                {
                    error: 'Backend processing',
                    details: 'Image is being generated. Please wait and try retrieving the result.',
                    status: 504
                },
                { status: 202, headers: corsHeaders(origin) }
            );
        }

        let finalImageUrl = '';
        let downloadUrl = '';
        let aiImageUrl = '';

        try {
            // 1. Get the ticket (merged image) from aws_key
            if (data.aws_key) {
                finalImageUrl = await S3Service.getPresignedUrl(data.aws_key, 604800);
            }

            // 2. Get the raw AI image from generated_image_url
            if (data.generated_image_url) {
                const aiKey = data.generated_image_url;
                if (aiKey && !aiKey.startsWith('http')) {
                    aiImageUrl = await S3Service.getPresignedUrl(aiKey, 604800);
                    downloadUrl = await S3Service.getDownloadPresignedUrl(aiKey, `scaleup-ai-${data.id}.png`, 604800);
                } else {
                    aiImageUrl = aiKey;
                    downloadUrl = aiKey;
                }
            }

            // Fallbacks
            if (!finalImageUrl) finalImageUrl = aiImageUrl;
            if (!downloadUrl) downloadUrl = finalImageUrl;
            if (!aiImageUrl) aiImageUrl = finalImageUrl;

        } catch (presignError) {
            console.warn('Failed to presign images:', presignError);
        }

        // Return all URLs to the frontend
        return NextResponse.json({
            success: true,
            user_id: userId,
            final_image_url: finalImageUrl,
            generated_image_url: aiImageUrl,
            download_url: downloadUrl,
        }, {
            headers: {
                ...corsHeaders(origin)
            }
        });
    } catch (error: any) {
        console.error('Error fetching user details:', error);
        return NextResponse.json(
            {
                error: error?.message || 'Internal Server Error',
                details: process.env.NODE_ENV === 'production' ? undefined : error?.stack
            },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}
