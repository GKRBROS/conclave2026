import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone_no, name, organization } = body;

    if (!phone_no || typeof phone_no !== 'string' || !PHONE_REGEX.test(phone_no)) {
      return NextResponse.json(
        { error: 'Valid phone number is required (10-15 digits)' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Valid name is required' },
        { status: 400 }
      );
    }

    if (!organization || typeof organization !== 'string' || organization.trim().length === 0) {
      return NextResponse.json(
        { error: 'Valid organization is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('generations')
      .update({
        name: name.trim(),
        organization: organization.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('phone_no', phone_no.trim())
      .select()
      .single();

    if (error) {
      console.error('Failed to update user:', error);
      return NextResponse.json(
        { error: 'Failed to update user details', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User details updated successfully',
      user: {
        id: data.id,
        name: data.name,
        organization: data.organization,
        updated_at: data.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      {
        error: 'Failed to update user details',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
