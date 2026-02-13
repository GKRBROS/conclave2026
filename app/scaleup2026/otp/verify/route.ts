import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { corsHeaders, handleCorsOptions } from '@/lib/cors';
import { S3Service } from '@/lib/s3Service';

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

    const trimmedEmail = email.trim().toLowerCase();
    console.log('🔍 Verifying OTP for email:', trimmedEmail);

    // Step 1: Get verification record
    // Use ilike for email lookup to ensure case-insensitivity
    const { data: verificationData, error: fetchError } = await supabaseAdmin
      .from('verification')
      .select('*')
      .ilike('email', trimmedEmail)
      .maybeSingle();

    if (fetchError) {
       console.error('Database error fetching verification:', fetchError);
       return NextResponse.json(
        { error: 'Database error. Please try again.' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    if (!verificationData) {
      console.warn(`Verification record not found for: "${trimmedEmail}"`);
      return NextResponse.json(
        { error: 'No OTP found for this email address. Please request a new OTP.' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }
    
    // Use the actual email from the record for updates
    const targetEmail = verificationData.email;

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
        .eq('email', targetEmail);
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
        .eq('email', targetEmail);
      return NextResponse.json(
        {
          error: 'Email already verified. Please request a new OTP to verify again.',
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
      console.warn('❌ Invalid OTP provided');
      
      // Increment attempts
      const newAttempts = verificationData.attempts + 1;
      await supabaseAdmin
        .from('verification')
        .update({ attempts: newAttempts })
        .eq('email', targetEmail);

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
        attempts: 0
      })
      .eq('email', targetEmail)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update verification status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update verification status' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    // Step 7: Get user details from generations table (fetch latest generation)
    // Use ilike for email lookup to ensure case-insensitivity
    const { data: userData, error: userError } = await supabaseAdmin
      .from('generations')
      .select('*')
      .ilike('email', targetEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userError) {
      console.warn('Could not fetch user data:', userError);
    }

    // Step 8: Generate signed URLs for the image if it exists
    let user = userData;
    let redirectTo = null;

    if (user && user.aws_key) {
        console.log(`🔄 Generating fresh signed URLs for user: ${user.email}, S3 Key: ${user.aws_key}`);
        try {
            // Always generate fresh presigned URLs to ensure they haven't expired
            // user.generated_image_url is the primary preview URL
            const signedUrl = await S3Service.getPresignedUrl(user.aws_key, 604800, 'image/png'); // 7 days
            
            // Generate a separate download URL with attachment disposition
            const downloadUrl = await S3Service.getDownloadPresignedUrl(
                user.aws_key, 
                `scaleup-avatar-${user.id}.png`, 
                604800, 
                'image/png'
            );

            if (signedUrl) {
                user.generated_image_url = signedUrl;
                // Add explicit download and preview fields for the frontend
                user.final_image_url = signedUrl;
                user.download_url = downloadUrl;
            }
            console.log(`✅ Signed URLs generated. Preview starts with: ${signedUrl.substring(0, 50)}...`);
        } catch (s3Error) {
            console.error('❌ Failed to generate signed URLs:', s3Error);
        }
    } else {
        // User is registered but has no image
        console.log('⚠️ User has no generated image, redirecting to generator');
        redirectTo = 'generator';
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      verified_at: updatedData.verified_at,
      user: user,
      redirectTo: redirectTo,
      image_url: user?.generated_image_url || null, // Top-level for convenience
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
