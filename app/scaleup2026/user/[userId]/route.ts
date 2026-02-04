import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Fetch user details from database
    const { data, error } = await supabase
      .from('generations')
      .select('id, name, district, category, organization, aws_key, photo_url, generated_image_url, email, phone_no, edit_name, prompt_type, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      console.error('Database query error:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    // Return user details
    return NextResponse.json({
      success: true,
      user: {
        name: data.name,
        district: data.district,
        category: data.category,
        organization: data.organization,
        email: data.email,
        phone_no: data.phone_no,
        aws_key: data.aws_key,
        prompt_type: data.prompt_type,
        final_image_url: data.generated_image_url,
        created_at: data.created_at
      }
    });
  } catch (error: any) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Internal Server Error',
        details: process.env.NODE_ENV === 'production' ? undefined : error?.stack
      },
      { status: 500 }
    );
  }
}
