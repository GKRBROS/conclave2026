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

        // Fetch only the final generated image URL
        const { data, error } = await supabase
            .from('generations')
            .select('generated_image_url')
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
