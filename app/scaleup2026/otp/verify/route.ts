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
    const { phone_no, otp } = body;

    // Validate inputs
    if (!phone_no || typeof phone_no !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== 'string') {
      return NextResponse.json(
        { error: 'OTP is required' },
        { status: 400 }
      );
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'Invalid OTP format. Must be 6 digits.' },
        { status: 400 }
      );
    }

    console.log('🔍 Verifying OTP for phone:', phone_no);

    // Step 1: Get verification record
    const { data: verificationData, error: fetchError } = await supabaseAdmin
      .from('verification')
      .select('*')
      .eq('phone_no', phone_no)
      .single();

    if (fetchError || !verificationData) {
      console.error('Verification record not found:', fetchError);
      return NextResponse.json(
        { error: 'No OTP found for this phone number. Please request a new OTP.' },
        { status: 404 }
      );
    }

    // Step 2: Check if already verified
    if (verificationData.verified) {
      console.log('✅ Phone number already verified');
      return NextResponse.json({
        success: true,
        message: 'Phone number already verified',
        verified_at: verificationData.verified_at,
      });
    }

    // Step 3: Check if OTP expired
    const now = new Date();
    const expiresAt = new Date(verificationData.expires_at);

    if (now > expiresAt) {
      console.error('❌ OTP expired');
      return NextResponse.json(
        {
          error: 'OTP has expired. Please request a new OTP.',
          expired_at: verificationData.expires_at,
        },
        { status: 400 }
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
        { status: 429 }
      );
    }

    // Step 5: Verify OTP
    if (verificationData.otp !== otp) {
      // Increment attempts
      const newAttempts = verificationData.attempts + 1;
      await supabaseAdmin
        .from('verification')
        .update({ attempts: newAttempts })
        .eq('phone_no', phone_no);

      console.error(`❌ Invalid OTP (attempt ${newAttempts}/${MAX_ATTEMPTS})`);
      return NextResponse.json(
        {
          error: 'Invalid OTP',
          attempts_remaining: MAX_ATTEMPTS - newAttempts,
        },
        { status: 400 }
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
      .eq('phone_no', phone_no)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update verification status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update verification status' },
        { status: 500 }
      );
    }

    // Step 7: Get user details from generations table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('generations')
      .select('id, name, email, phone_no, generated_image_url')
      .eq('phone_no', phone_no)
      .single();

    if (userError) {
      console.warn('Could not fetch user data:', userError);
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully',
      verified_at: updatedData.verified_at,
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
      { status: 500 }
    );
  }
}
