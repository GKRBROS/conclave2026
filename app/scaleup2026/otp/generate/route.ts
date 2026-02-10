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

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      console.error('❌ Email regex validation failed:', trimmedEmail);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    console.log('🔍 Checking if email exists in generations table (using ilike)...');
    console.log(`   Searching for: "${trimmedEmail}"`);

    // Step 1: Check if email exists in generations table
    // Use ilike for case-insensitive match
    const { data: generationData, error: genError } = await supabaseAdmin
      .from('generations')
      .select('id, email, name')
      .ilike('email', trimmedEmail)
      .maybeSingle(); // Use maybeSingle to avoid error on no rows, but we want single row

    if (genError) {
       console.error('Database error checking email:', genError);
       return NextResponse.json(
        { error: 'Database error. Please try again.' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    if (!generationData) {
      console.warn(`⚠️ Email not found in generations table: "${trimmedEmail}"`);
      // Optional: Check if it exists with whitespace in DB?
      // For now, return 404
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
    // Use the exact email found in the database to be safe, or the trimmed input
    const targetEmail = generationData.email; 

    const { data: existingOTP } = await supabaseAdmin
      .from('verification')
      .select('id, email')
      .eq('email', targetEmail)
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
        .eq('email', targetEmail)
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
          email: targetEmail,
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
      email: targetEmail,
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
