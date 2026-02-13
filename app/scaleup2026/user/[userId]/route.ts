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
    const searchParams = request.nextUrl.searchParams;
    const dialCode = searchParams.get('dial_code') || '+91';

    const supabase = supabaseAdmin;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    
    // Determine if the provided userId is a phone number or a UUID
    // We prioritize phone number lookup as it is more reliable for user-specific sessions
    let query = supabase.from('generations').select('generated_image_url');
    let normalizedId = userId;

    if (!isUuid) {
      // Normalize phone number for lookup
      const cleaned = userId.replace(/\D/g, '');
      if (userId.startsWith('+')) {
        normalizedId = '+' + cleaned;
      } else {
        const cleanDialCode = dialCode.replace(/\D/g, '');
        if (cleaned.startsWith(cleanDialCode)) {
          normalizedId = '+' + cleaned;
        } else if (cleaned.length === 10 && cleanDialCode === '91') {
          normalizedId = '+91' + cleaned;
        } else if (cleaned.length > 10) {
          normalizedId = '+' + cleaned;
        } else {
          normalizedId = '+' + cleanDialCode + cleaned;
        }
      }
      console.log(`📱 Phone lookup: ${userId} -> ${normalizedId}`);
      query = query.eq('phone_no', normalizedId);
    } else {
      console.log(`🆔 UUID lookup: ${userId}`);
      query = query.eq('id', userId);
    }

    // Sort by created_at descending to always get the LATEST generation for this phone/UUID
    query = query.order('created_at', { ascending: false }).limit(1);

    const { data, error } = await query.maybeSingle();

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

    if (!data.generated_image_url) {
      return NextResponse.json(
        {
          error: 'Backend processing',
          details: 'Image is being generated. Please wait and try retrieving the result.',
          status: 504
        },
        { status: 202, headers: {
          ...corsHeaders(origin),
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        } }
      );
    }

    let finalImageUrl = data.generated_image_url;
    try {
      const finalKey = new URL(finalImageUrl).pathname.replace(/^\//, '');
      finalImageUrl = await S3Service.getPresignedUrl(finalKey, 3600);
    } catch (presignError) {
      console.warn('Failed to presign final image URL:', presignError);
    }

    // Return only the final image URL
    return NextResponse.json({
      success: true,
      user_id: normalizedId,
      final_image_url: finalImageUrl,
    }, {
      headers: {
        ...corsHeaders(origin),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const origin = request.headers.get('origin') || undefined;
  try {
    const { userId } = await params;
    const body = await request.json();
    const { name, organization, dial_code } = body;
    const dialCode = dial_code || '+91';

    const supabase = supabaseAdmin;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    let normalizedId = userId;

    if (!isUuid) {
      // Normalize phone number for lookup
      const cleaned = userId.replace(/\D/g, '');
      if (userId.startsWith('+')) {
        normalizedId = '+' + cleaned;
      } else {
        const cleanDialCode = dialCode.replace(/\D/g, '');
        if (cleaned.startsWith(cleanDialCode)) {
          normalizedId = '+' + cleaned;
        } else if (cleaned.length === 10 && cleanDialCode === '91') {
          normalizedId = '+91' + cleaned;
        } else if (cleaned.length > 10) {
          normalizedId = '+' + cleaned;
        } else {
          normalizedId = '+' + cleanDialCode + cleaned;
        }
      }
      console.log(`📱 Normalized lookup ID: ${userId} (dial: ${dialCode}) -> ${normalizedId}`);
    }

    const isPhone = /^\+?[0-9]{10,15}$/.test(normalizedId);

    if (!isUuid && !isPhone) {
      return NextResponse.json(
        { error: 'Invalid ID or phone number format' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name) updateData.name = name.trim();
    if (organization) updateData.organization = organization.trim();

    let query = supabase.from('generations').update(updateData);
    
    if (isUuid) {
      query = query.eq('id', normalizedId);
    } else {
      query = query.eq('phone_no', normalizedId);
    }

    const { data, error } = await query.select().maybeSingle();

    if (error) {
      console.error('Failed to update user:', error);
      return NextResponse.json(
        { error: 'Failed to update user details', details: error.message },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User details updated successfully',
      user: data
    }, { headers: corsHeaders(origin) });

  } catch (error: any) {
    console.error('❌ Error updating user:', error);
    return NextResponse.json(
      {
        error: 'Failed to update user details',
        details: error?.message || 'Unknown error',
      },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
