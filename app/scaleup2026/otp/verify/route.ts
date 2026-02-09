import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { corsHeaders, handleCorsOptions } from '@/lib/cors';

const MAX_ATTEMPTS = 5; // Maximum OTP verification attempts

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  try {
    const body = await request.json();
    const { email, otp } = body;

    // Validate inputs
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    if (!otp || typeof otp !== 'string') {
      return NextResponse.json(
        { error: 'OTP is required' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'Invalid OTP format. Must be 6 digits.' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    console.log('🔍 Verifying OTP for email:', email);

    // Step 1: Get verification record
    const { data: verificationData, error: fetchError } = await supabaseAdmin
      .from('verification')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError || !verificationData) {
      console.error('Verification record not found:', fetchError);
      return NextResponse.json(
        { error: 'No OTP found for this email address. Please request a new OTP.' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    // Step 2: Check if OTP expired
    const now = new Date();
    const expiresAt = new Date(verificationData.expires_at);

    if (now > expiresAt) {
      console.error('❌ OTP expired');
      await supabaseAdmin
        .from('verification')
        .update({
          verified: false,
          verified_at: null,
        })
        .eq('email', email);
      return NextResponse.json(
        {
          error: 'OTP has expired. Please request a new OTP.',
          expired_at: verificationData.expires_at,
        },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Step 3: Check if already verified
    if (verificationData.verified) {
      console.log('⚠️ Email address already verified - require new OTP');
      await supabaseAdmin
        .from('verification')
        .update({
          verified: false,
          verified_at: null,
        })
        .eq('email', email);
      return NextResponse.json(
        {
          error: 'Email address already verified. Please request a new OTP to verify again.',
          verified_at: verificationData.verified_at,
        },
        { status: 409, headers: corsHeaders(origin) }
      );
    }

    // Step 4: Check attempts
    if (verificationData.attempts >= MAX_ATTEMPTS) {
      console.error('❌ Too many failed attempts');
      return NextResponse.json(
        {
          error: 'Too many failed attempts. Please request a new OTP.',
          max_attempts: MAX_ATTEMPTS,
        },
        { status: 429, headers: corsHeaders(origin) }
      );
    }

    // Step 5: Verify OTP
    if (verificationData.otp !== otp) {
      // Increment attempts
      const newAttempts = verificationData.attempts + 1;
      await supabaseAdmin
        .from('verification')
        .update({ attempts: newAttempts })
        .eq('email', email);

      console.error(`❌ Invalid OTP (attempt ${newAttempts}/${MAX_ATTEMPTS})`);
      return NextResponse.json(
        {
          error: 'Invalid OTP',
          attempts_remaining: MAX_ATTEMPTS - newAttempts,
        },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Step 6: OTP is correct - mark as verified
    console.log('✅ OTP verified successfully');

    const { data: updatedData, error: updateError } = await supabaseAdmin
      .from('verification')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('email', email)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update verification status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update verification status' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    // Step 7: Get user details from generations table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('generations')
      .select('id, name, email, phone_no, generated_image_url')
      .eq('email', email)
      .single();

    if (userError) {
      console.warn('Could not fetch user data:', userError);
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      verified_at: updatedData.verified_at,
      user_id: userData?.id || null,
      user: userData || null,
    }, {
      headers: corsHeaders(origin),
    });

  } catch (error: any) {
    console.error('❌ Error verifying OTP:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify OTP',
        details: error?.message || 'Unknown error',
      },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
