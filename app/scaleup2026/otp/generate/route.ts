import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { OtpService, generateOTP } from '@/lib/otpService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone_no } = body;

    // Validate phone number
    if (!phone_no || typeof phone_no !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phone_no)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Must be 10-15 digits.' },
        { status: 400 }
      );
    }

    console.log('🔍 Checking if phone number exists in generations table...');

    // Step 1: Check if phone number exists in generations table
    const { data: generationData, error: genError } = await supabaseAdmin
      .from('generations')
      .select('id, phone_no, name')
      .eq('phone_no', phone_no)
      .single();

    if (genError || !generationData) {
      console.error('Phone number not found in generations:', genError);
      return NextResponse.json(
        { error: 'Phone number not registered. Please generate an avatar first.' },
        { status: 404 }
      );
    }

    console.log('✅ Phone number found:', generationData.phone_no);

    // Step 2: Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    console.log('🔐 Generated OTP:', otp);
    console.log('⏰ Expires at:', expiresAt.toISOString());

    // Step 3: Check if OTP already exists for this phone number
    const { data: existingOTP } = await supabaseAdmin
      .from('verification')
      .select('id, phone_no')
      .eq('phone_no', phone_no)
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
        .eq('phone_no', phone_no)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update OTP:', updateError);
        return NextResponse.json(
          { error: 'Failed to update OTP', details: updateError.message },
          { status: 500 }
        );
      }

      verificationData = data;
    } else {
      // Insert new OTP
      console.log('➕ Creating new OTP entry...');
      const { data, error: insertError } = await supabaseAdmin
        .from('verification')
        .insert({
          phone_no: phone_no,
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
          { status: 500 }
        );
      }

      verificationData = data;
    }

    // Step 4: Send OTP via SMS
    console.log('📤 Sending OTP via SMS...');
    
    // Format phone number
    let formattedPhone = phone_no;
    if (!phone_no.startsWith('+')) {
      formattedPhone = `+91${phone_no}`;
    }

    const smsResult = await OtpService.sendOtp(formattedPhone, otp);

    if (!smsResult.success) {
      console.warn('⚠️ SMS sending failed:', smsResult.message);
      // Don't fail the request, OTP is still stored
    }

    console.log('✅ OTP generated and sent successfully');

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      phone_no: phone_no,
      expires_in_minutes: 10,
      // Only include OTP in response for development/testing
      ...(process.env.NODE_ENV !== 'production' && { otp: otp }),
    });

  } catch (error: any) {
    console.error('❌ Error generating OTP:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate OTP',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
