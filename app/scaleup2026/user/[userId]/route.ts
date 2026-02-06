import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Validate phone number format
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    // Fetch only the final generated image URL
    const { data, error } = await supabase
      .from('generations')
      .select('generated_image_url')
      .eq('phone_no', userId)
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

    if (!data?.generated_image_url) {
      return NextResponse.json(
        {
          error: 'Backend processing',
          details: 'Image is being generated. Please wait and try retrieving the result.',
          status: 504
        },
        { status: 202 }
      );
    }

    // Return only the final image URL
    return NextResponse.json({
      success: true,
      final_image_url: data.generated_image_url
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
