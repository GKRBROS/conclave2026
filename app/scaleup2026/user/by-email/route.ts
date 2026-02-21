import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { S3Service } from '@/lib/s3Service';
import { corsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;

  try {
    const searchParams = request.nextUrl.searchParams;
    const emailParam = searchParams.get('email');

    if (!emailParam) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const email = emailParam.trim().toLowerCase();

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const supabase = supabaseAdmin;

    const { data, error } = await supabase
      .from('generations')
      .select('id, email, name, phone_no, aws_key, generated_image_url, created_at')
      .ilike('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Database query error (by-email):', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'User not found for provided email' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    if (!data.aws_key && !data.generated_image_url) {
      return NextResponse.json(
        {
          error: 'Image not generated',
          details: 'No generated image is available for this user yet.',
        },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    let finalImageUrl = '';
    let downloadUrl = '';
    let aiImageUrl = '';

    try {
      if (data.aws_key) {
        finalImageUrl = await S3Service.getPresignedUrl(data.aws_key, 604800);
        downloadUrl = await S3Service.getDownloadPresignedUrl(
          data.aws_key,
          `scaleup-ticket-${data.id}.png`,
          604800
        );
      }

      if (data.generated_image_url) {
        const aiKey = data.generated_image_url;
        if (aiKey && !aiKey.startsWith('http')) {
          aiImageUrl = await S3Service.getPresignedUrl(aiKey, 604800);
        } else {
          aiImageUrl = aiKey;
        }
      }

      if (!finalImageUrl) finalImageUrl = aiImageUrl;
      if (!downloadUrl) downloadUrl = finalImageUrl;
    } catch (presignError: any) {
      console.warn('Failed to presign images (by-email):', presignError);
    }

    return NextResponse.json(
      {
        success: true,
        user_id: data.id,
        email: data.email,
        final_image_url: finalImageUrl,
        raw_ai_image_url: aiImageUrl,
        download_url: downloadUrl,
        user: {
          id: data.id,
          email: data.email,
          name: data.name,
          phone_no: data.phone_no,
        },
      },
      {
        headers: {
          ...corsHeaders(origin),
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
          'Surrogate-Control': 'no-store',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching final image by email:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch final image by email',
        details: error?.message || 'Unknown error',
      },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

