import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { mergeImages } from '@/lib/imageProcessor';
import { getSupabaseClient } from '@/lib/supabase';
import OpenAI from 'openai';
import sharp from 'sharp';

export const maxDuration = 60; // Increase timeout for long AI generation

// Validation constants
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

// Prompt templates
const PROMPTS = {
  prompt1: 'Transform into cinematic superhero with DC-style realism, deep blue suit with red-yellow emblem, dramatic lighting, transparent background',
  prompt2: 'Create elegant professional corporate portrait, modern business aesthetic, tailored suit, soft lighting, subtle gradient background',
  prompt3: 'Artistic creative portrait with vibrant colors, modern styling, contemporary casual attire, bold color splashes, neon lighting'
};

export async function POST(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  try {
    const formData = await request.formData();
    const image = formData.get('photo') as File;
    const name = formData.get('name') as string;
    const edit_name = formData.get('edit_name') as string;
    const email = formData.get('email') as string;
    const phone_no = formData.get('phone_no') as string;
    const designation = formData.get('designation') as string;
    const prompt_type = formData.get('prompt_type') as string;

    // Field validations
    if (!image) {
      return NextResponse.json(
        { error: 'Photo is required' },
        { status: 400 }
      );
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (!phone_no || !PHONE_REGEX.test(phone_no)) {
      return NextResponse.json(
        { error: 'Valid phone number is required (10-15 digits)' },
        { status: 400 }
      );
    }

    if (!designation || designation.trim().length === 0) {
      return NextResponse.json(
        { error: 'Designation is required' },
        { status: 400 }
      );
    }

    if (!prompt_type || !['prompt1', 'prompt2', 'prompt3'].includes(prompt_type)) {
      return NextResponse.json(
        { error: 'Valid prompt_type is required (prompt1, prompt2, or prompt3)' },
        { status: 400 }
      );
    }

    // Image format validation
    if (!ALLOWED_IMAGE_FORMATS.includes(image.type)) {
      return NextResponse.json(
        { error: `Invalid image format. Allowed: ${ALLOWED_IMAGE_FORMATS.join(', ')}` },
        { status: 400 }
      );
    }

    // Image size validation
    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `Image size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Save uploaded image temporarily for local processing
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const fileExtension = image.name.split('.').pop() || 'jpg';
    const filename = `upload-${timestamp}.${fileExtension}`;

    const tmpUploadsPath = join('/tmp', 'uploads');
    const publicUploadsPath = join(process.cwd(), 'public', 'uploads');

    // Save to /tmp for intermediate processing (always works on Vercel)
    await mkdir(tmpUploadsPath, { recursive: true }).catch(() => { });
    const tempUploadFile = join(tmpUploadsPath, filename);
    await writeFile(tempUploadFile, buffer);

    // Save locally for debug/local preview (optional and non-blocking in prod)
    let uploadedImageUrl = `/uploads/${filename}`;
    if (!isProduction) {
      try {
        await mkdir(publicUploadsPath, { recursive: true }).catch(() => { });
        await writeFile(join(publicUploadsPath, filename), buffer);
      } catch (err) {
        console.warn('Could not save to public/uploads (read-only FS):', err);
      }
    }

    const supabase = getSupabaseClient();

    // Generate AWS key (S3 compatible path)
    const awsKey = `uploads/${timestamp}/${filename}`;

    // Upload to Supabase Storage
    console.log('Uploading input to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated-images')
      .upload(awsKey, buffer, {
        contentType: image.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image to storage' },
        { status: 500 }
      );
    }

    const { data: { publicUrl } } = supabase.storage
      .from('generated-images')
      .getPublicUrl(awsKey);
    uploadedImageUrl = publicUrl;

    // Resize image for OpenRouter
    console.log('Resizing input image for OpenRouter...');
    const resizedBuffer = await sharp(buffer)
      .resize(1024, 1024, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    const base64Image = resizedBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Call OpenRouter
    const prompt = PROMPTS[prompt_type as keyof typeof PROMPTS];

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    // Call OpenRouter
    console.log('Sending prompt to OpenRouter:', prompt.substring(0, 100) + '...');
    console.time('OpenRouter_AI_Call');
    const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sourceful/riverflow-v2-fast-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } }
            ],
          },
        ],
        modalities: ['image']
      }),
    });

    if (!apiResponse.ok) {
      console.timeEnd('OpenRouter_AI_Call');
      let errorDetail = 'Unknown error';
      try {
        const errorData = await apiResponse.json();
        errorDetail = JSON.stringify(errorData);
        console.error('OpenRouter API Error Details:', errorDetail);
      } catch (e) { }
      throw new Error(`OpenRouter Error ${apiResponse.status}: ${errorDetail}`);
    }

    const result = await apiResponse.json();
    console.timeEnd('OpenRouter_AI_Call');
    const responseMessage = result.choices[0].message;
    let generatedImageUrl: string | undefined = responseMessage.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      throw new Error('No image returned from AI');
    }

    // Process AI Image
    let imageBuffer: Buffer;
    if (generatedImageUrl.startsWith('data:')) {
      imageBuffer = Buffer.from(generatedImageUrl.split(',')[1], 'base64');
    } else {
      const imageResponse = await fetch(generatedImageUrl);
      imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    }

    // Save intermediate image
    const generatedFilename = `generated-${timestamp}.png`;
    let finalGeneratedUrl = `/generated/${generatedFilename}`;

    // Save to /tmp
    const tmpGeneratedPath = join('/tmp', 'generated');
    await mkdir(tmpGeneratedPath, { recursive: true }).catch(() => { });
    const tempGeneratedFile = join(tmpGeneratedPath, generatedFilename);
    await writeFile(tempGeneratedFile, imageBuffer);

    // Optional local save
    if (!isProduction) {
      try {
        const publicGeneratedPath = join(process.cwd(), 'public', 'generated');
        await mkdir(publicGeneratedPath, { recursive: true }).catch(() => { });
        await writeFile(join(publicGeneratedPath, generatedFilename), imageBuffer);
      } catch (err) {
        console.warn('Could not save to public/generated (read-only FS):', err);
      }
    }

    // Upload to Supabase Storage
    console.log('Uploading generated image to Supabase Storage...');
    const { data: genData, error: genError } = await supabase.storage
      .from('generated-images')
      .upload(`generated/${generatedFilename}`, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (genError) {
      console.error('Supabase generated upload error:', genError);
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('generated-images')
        .getPublicUrl(`generated/${generatedFilename}`);
      finalGeneratedUrl = publicUrl;
    }

    // Merge with background
    // Pass the /tmp path for processing
    const finalImagePath = await mergeImages(tempGeneratedFile, timestamp.toString(), name, designation);

    // Save metadata to Supabase database
    const { data: dbData, error: dbError } = await supabase
      .from('generations')
      .insert({
        name: name.trim(),
        edit_name: edit_name?.trim() || null,
        email: email.trim(),
        phone_no: phone_no.trim(),
        designation: designation.trim(),
        photo_url: uploadedImageUrl,
        generated_image_url: finalGeneratedUrl,
        aws_key: awsKey,
        prompt_type: prompt_type
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save to database', details: dbError.message },
        { status: 500 }
      );
    }

    console.log('Saved to database:', dbData);

    return NextResponse.json({
      success: true,
      user_id: dbData.id,
      name: dbData.name,
      designation: dbData.designation,
      aws_key: dbData.aws_key,
      final_image_url: finalImagePath
    });
  } catch (error: any) {
    console.error('CRITICAL ERROR during generation:', error);
    // Log stack trace for Vercel logs
    if (error.stack) console.error(error.stack);

    return NextResponse.json(
      {
        error: error?.message || 'Internal Server Error',
        details: isProduction ? undefined : error?.stack
      },
      { status: 500 }
    );
  }
}

