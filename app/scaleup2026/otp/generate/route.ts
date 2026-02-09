import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { OtpService, generateOTP } from '@/lib/otpService';
import { corsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  try {
    const body = await request.json();
    const { email } = body;

    console.log('📧 Received OTP request for email:', { email, bodyType: typeof email });

    // Validate email
    if (!email || typeof email !== 'string') {
      console.error('❌ Email validation failed:', email);
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Email regex validation failed:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    console.log('🔍 Checking if email exists in generations table...');

    // Step 1: Check if email exists in generations table
    const { data: generationData, error: genError } = await supabaseAdmin
      .from('generations')
      .select('id, email, name')
      .eq('email', email)
      .single();

    if (genError || !generationData) {
      console.error('Email not found in generations:', genError);
      return NextResponse.json(
        { error: 'Email not registered. Please generate an avatar first.' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    console.log('✅ Email found:', generationData.email);

    // Step 2: Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    console.log('🔐 Generated OTP:', otp);
    console.log('⏰ Expires at:', expiresAt.toISOString());

    // Step 3: Check if OTP already exists for this email
    const { data: existingOTP } = await supabaseAdmin
      .from('verification')
      .select('id, email')
      .eq('email', email)
      .single();

    let verificationData;

    if (existingOTP) {
      // Update existing OTP
      console.log('📝 Updating existing OTP...');
      const { data, error: updateError } = await supabaseAdmin
        .from('verification')
        .update({
          otp: otp,
          expires_at: expiresAt.toISOString(),
          verified: false,
          verified_at: null,
          attempts: 0,
          created_at: new Date().toISOString(),
        })
        .eq('email', email)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update OTP:', updateError);
        return NextResponse.json(
          { error: 'Failed to update OTP', details: updateError.message },
          { status: 500, headers: corsHeaders(origin) }
        );
      }

      verificationData = data;
    } else {
      // Insert new OTP
      console.log('➕ Creating new OTP entry...');
      const { data, error: insertError } = await supabaseAdmin
        .from('verification')
        .insert({
          email: email,
          otp: otp,
          generation_id: generationData.id,
          expires_at: expiresAt.toISOString(),
          verified: false,
          attempts: 0,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to insert OTP:', insertError);
        return NextResponse.json(
          { error: 'Failed to generate OTP', details: insertError.message },
          { status: 500, headers: corsHeaders(origin) }
        );
      }

      verificationData = data;
    }

    console.log('✅ OTP generated successfully. Returning to frontend for SMTP sending.');

    return NextResponse.json({
      success: true,
      message: 'OTP generated successfully',
      email: email,
      otp: otp, // Return OTP so frontend can send via SMTP
      expires_in_minutes: 10,
    }, {
      headers: corsHeaders(origin),
    });

  } catch (error: any) {
    console.error('❌ Error generating OTP:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate OTP',
        details: error?.message || 'Unknown error',
      },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
