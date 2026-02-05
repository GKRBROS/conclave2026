import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { corsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const origin = request.headers.get('origin') || undefined;
  try {
    const { userId } = await params;
    const body = await request.json();
    const { name, organization } = body;

    // Validate inputs
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

    console.log(`📝 Updating user ${userId}:`, { name, organization });

    // Update name and organization in database
    const { data, error } = await supabaseAdmin
      .from('generations')
      .update({
        name: name.trim(),
        organization: organization.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
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

    console.log('✅ User updated successfully');

    return NextResponse.json({
      success: true,
      message: 'User details updated successfully',
      user: {
        id: data.id,
        name: data.name,
        organization: data.organization,
        updated_at: data.updated_at,
      },
    }, {
      headers: corsHeaders(origin),
    });

  } catch (error: any) {
    console.error('❌ Error updating user:', error);
    return NextResponse.json(
      {
        error: 'Failed to update user details',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
