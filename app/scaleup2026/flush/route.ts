import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { corsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;

  try {
    const contentType = request.headers.get('content-type') || '';
    let email: unknown;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      email = formData.get('email');
    } else {
      const body = await request.json();
      email = (body as any)?.email;
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const supabase = supabaseAdmin;

    const { data: user, error: userError } = await supabase
      .from('generations')
      .select('id, email, aws_key, generated_image_url, ai_image_key, photo_url')
      .ilike('email', trimmedEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userError) {
      return NextResponse.json(
        { error: 'Failed to lookup user', details: userError.message },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found for provided email' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    const { error: updateError } = await supabase
      .from('generations')
      .update({
        photo_url: null,
        generated_image_url: null,
        ai_image_key: null,
        aws_key: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to flush user image data', details: updateError.message },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    const { error: verificationError } = await supabase
      .from('verification')
      .delete()
      .ilike('email', trimmedEmail);

    if (verificationError) {
      return NextResponse.json(
        { error: 'Failed to clear verification data', details: verificationError.message },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'User image generation data flushed successfully',
        user_id: user.id,
        email: user.email,
      },
      { headers: corsHeaders(origin) }
    );
  } catch (error: any) {
    const message = error?.message || '';

    if (message.toLowerCase().includes('json')) {
      return NextResponse.json(
        {
          error: 'Invalid JSON body',
          details: 'Send a valid JSON object like {"email":"user@example.com"}.',
        },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      {
        error: 'Unexpected error while flushing user image data',
        details: message || 'Unknown error',
      },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
