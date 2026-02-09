import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { corsHeaders, handleCorsOptions } from '@/lib/cors';

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const ALLOWED_CATEGORIES = [
    'Startups',
    'Working Professionals',
    'Students',
    'Business Owners',
    'NRI / Gulf Retunees',
    'Government Officials',
];

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin') || undefined;
    try {
        const body = await request.json();
        const { name, email, phone, phone_no, district, category, organization, did_you_attend_the_previous_scaleup_conclave_ } = body;

        // Handle both 'phone' (MakeMuPass) and 'phone_no' (Internal)
        const finalPhone = phone || phone_no;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
            return NextResponse.json(
                { error: 'Valid email is required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        if (!finalPhone || typeof finalPhone !== 'string' || !PHONE_REGEX.test(finalPhone)) {
            return NextResponse.json(
                { error: 'Valid phone number is required (10-15 digits)' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        if (!district || typeof district !== 'string' || district.trim().length === 0) {
            return NextResponse.json(
                { error: 'District is required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        if (!category || typeof category !== 'string' || !ALLOWED_CATEGORIES.includes(category)) {
            return NextResponse.json(
                { error: 'Valid category is required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        if (!organization || typeof organization !== 'string' || organization.trim().length === 0) {
            return NextResponse.json(
                { error: 'Organization is required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        const trimmedPhone = finalPhone.trim();
        const trimmedEmail = email.trim();

        console.log(`🔍 Registering user with email: ${trimmedEmail} and phone: ${trimmedPhone}`);

        const { data: existingUser, error: existingError } = await supabaseAdmin
            .from('generations')
            .select('id, name, organization')
            .eq('phone_no', trimmedPhone)
            .maybeSingle();

        if (existingError) {
            console.error('Database lookup error:', existingError);
            return NextResponse.json(
                { error: 'Failed to lookup user', details: existingError.message },
                { status: 500, headers: corsHeaders(origin) }
            );
        }

        if (existingUser) {
            const { data: updatedUser, error: updateError } = await supabaseAdmin
                .from('generations')
                .update({
                    name: name.trim(),
                    email: trimmedEmail,
                    phone_no: trimmedPhone,
                    district: district.trim(),
                    category: category.trim(),
                    organization: organization.trim(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingUser.id)
                .select('id, name, organization')
                .single();

            if (updateError) {
                console.error('Database update error:', updateError);
                return NextResponse.json(
                    { error: 'Failed to update user', details: updateError.message },
                    { status: 500, headers: corsHeaders(origin) }
                );
            }

            return NextResponse.json(
                {
                    success: true,
                    user_id: updatedUser.id,
                    name: updatedUser.name,
                    organization: updatedUser.organization,
                },
                { headers: corsHeaders(origin) }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('generations')
            .insert({
                name: name.trim(),
                email: trimmedEmail,
                phone_no: trimmedPhone,
                district: district.trim(),
                category: category.trim(),
                organization: organization.trim(),
            })
            .select('id, name, organization')
            .single();

        if (error) {
            console.error('Database insert error:', error);
            return NextResponse.json(
                { error: 'Failed to save data', details: error.message },
                { status: 500, headers: corsHeaders(origin) }
            );
        }

        return NextResponse.json(
            {
                success: true,
                user_id: data.id,
                name: data.name,
                organization: data.organization,
            },
            { headers: corsHeaders(origin) }
        );
    } catch (error: any) {
        console.error('Error saving registration:', error);
        return NextResponse.json(
            { error: 'Failed to save data', details: error?.message || 'Unknown error' },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}
