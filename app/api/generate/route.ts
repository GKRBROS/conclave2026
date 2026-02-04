import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { mergeImages } from '@/lib/imageProcessor';
import { supabaseAdmin } from '@/lib/supabase/admin';
import OpenAI from 'openai';
import sharp from 'sharp';

export const maxDuration = 60; // Increase timeout for long AI generation

// 3 AI prompts for image generation
const PROMPTS = {
  prompt1: "Reimagine the uploaded person as a cinematic, high-end superhero portrait inspired by modern DC-style realism, presented as an upper-body portrait cropped from just below the waist to just above the head in a consistent 4:5 aspect ratio, with the subject placed slightly off-center and facing diagonally upward, the head subtly tilted up and to the side, eyes looking toward a bright light source above, conveying a strong yet calm posture with the chest slightly forward and shoulders relaxed, and an expression that feels hopeful, confident, and aspirational with a soft, determined smile and a composed heroic presence, never aggressive. Identity preservation is critical: maintain the person’s exact facial structure, proportions, and likeness with absolute accuracy, preserving all personal features exactly as they appear in the source image, including glasses (same style, shape, and placement), nose rings, earrings, piercings, tattoos (same design, placement, and visibility), scars, moles, freckles, birthmarks, and facial hair, without adding, removing, stylizing, idealizing, beautifying, or altering any personal features beyond realistic cinematic lighting, and without changing age, gender, ethnicity, or body proportions. If the uploaded image includes culturally, religiously, or personally significant garments or coverings such as a hijab, turban, dupatta, headscarf, veil, cap, or modest or symbolic clothing, the final image must retain equivalent coverage over the same areas of the body, with the superhero suit intelligently adapted to integrate these elements or provide appropriate coverage without removing, reducing, reinterpreting, or altering their meaning or purpose. The character wears a sleek, form-fitting deep blue superhero suit with premium textured fabric, realistic tension, and visible stitching, with the overall style randomly resembling either a heroic cloth-based design, a darker and heavier power-driven suit, or a tactical armored build, and featuring a bold red and yellow geometric emblem on the chest using an upward-pointing arrow as the symbol itself, seamlessly integrated into the suit. Lighting is dramatic and cinematic with a strong rim light from above and behind, warm golden highlights wrapping naturally around the face and upper torso, subtle light streaks and glow interacting realistically with the subject, smooth color gradients, and natural, accurate skin tones, rendered in a hyper-realistic, movie-poster quality style with ultra-sharp facial detail, visible skin texture, shallow depth of field, and the subject perfectly in focus. The background must be completely removed and delivered as a transparent PNG with a clean alpha channel showing only the character, ensuring clean edges with no halos, fringing, or artifacts, maintaining strict consistency across generations with the same pose, angle, framing, and lighting, and outputting in true 4K resolution with ultra-detailed clarity.",
  prompt2: "Reimagine the uploaded person as a cinematic, high-end professional portrait with a heroic yet grounded presence, inspired by modern DC-style realism translated into a refined corporate aesthetic, presented as an upper-body portrait cropped from just below the waist to just above the head in a consistent 4:5 aspect ratio, with the subject placed slightly off-center make his arms-crossed positioning, natural arm overlap, upright stance, torso angle, shoulder alignment, and overall body orientation, while the head remains facing the camera to convey confidence, clarity, and calm authority; the posture is professional and composed with relaxed yet firm shoulders and the chest slightly forward, expressing quiet confidence, leadership, and optimism, and the facial expression remains hopeful, confident, and aspirational with a subtle, controlled smile and a calm, assured presence—never aggressive, exaggerated, or theatrical; identity preservation is critical, maintaining the person’s exact facial structure, proportions, and likeness with absolute accuracy, preserving all personal features exactly as they appear in the source image including glasses (same style, shape, and placement), nose rings, earrings, piercings, tattoos (same design, placement, and visibility), scars, moles, freckles, birthmarks, and facial hair, without adding, removing, stylizing, idealizing, beautifying, or altering any features beyond realistic cinematic lighting, and without changing age, gender, ethnicity, or body proportions; if the uploaded image includes culturally, religiously, or personally significant garments or coverings such as a hijab, turban, dupatta, headscarf, veil, cap, or modest or symbolic clothing, the final image must retain equivalent coverage and meaning, with the professional attire intelligently adapted to respect and integrate these elements without removal, reduction, or reinterpretation; the character wears a tailored, high-end professional suit that is sharp, modern, minimal, and executive in tone—such as a premium blazer with trousers or skirt—featuring realistic fabric texture, natural folds, subtle stitching, and precise fit in neutral or deep tones like charcoal, navy, black, or muted earth hues, free of flashy patterns or logos; lighting is dramatic yet refined with a strong cinematic rim light from above and behind, warm golden highlights softly wrapping around the face and shoulders, smooth gradients, and natural, accurate skin tones, rendered in a hyper-realistic, movie-poster-quality style with ultra-sharp facial detail, visible skin texture, shallow depth of field, and the subject perfectly in focus; the background must be completely removed and delivered as a transparent PNG with a clean alpha channel showing only the character, with crisp edges and no halos, fringing, or artifacts, maintaining strict consistency across generations in pose, angle, framing, and lighting, and output in true 4K resolution with ultra-detailed clarity.",
  prompt3: "Reimagine the uploaded person as a cinematic, high-end medieval warrior portrait with a heroic yet grounded presence, inspired by epic historical realism and dramatic film aesthetics, presented as an upper-body portrait cropped from just below the waist to just above the head in a consistent 4:5 aspect ratio, with the subject placed slightly off-center and facing diagonally upward, the head subtly tilted up and to the side, eyes looking toward a soft but powerful elevated light source to convey strength, resolve, and calm authority; the pose is strong yet composed with relaxed shoulders, upright posture, and chest slightly forward, expressing quiet confidence, honor, and readiness without aggression, while the facial expression remains resolute, hopeful, and aspirational with a subtle, controlled expression and composed heroic presence—never savage or exaggerated; identity preservation is critical, maintaining the person’s exact facial structure, proportions, and likeness with absolute accuracy, preserving all personal features exactly as they appear in the source image including glasses (same style, shape, and placement), nose rings, earrings, piercings, tattoos (same design, placement, and visibility), scars, moles, freckles, birthmarks, and facial hair, without adding, removing, stylizing, idealizing, beautifying, or altering any features beyond realistic cinematic lighting, and without changing age, gender, ethnicity, or body proportions; if the uploaded image includes culturally, religiously, or personally significant garments or coverings such as a hijab, turban, dupatta, headscarf, veil, cap, or modest or symbolic clothing, the final image must retain equivalent coverage and meaning, with the medieval armor or garments intelligently adapted to integrate and respect these elements without removal, reduction, or reinterpretation; the character wears historically inspired medieval warrior attire such as layered leather, chainmail, or plate elements with realistic wear, engraved details, natural fabric tension, weathered textures, and functional construction, styled to feel authentic, grounded, and noble rather than fantasy-exaggerated or ornamental; lighting is dramatic and cinematic with a strong rim light from above and behind, warm torch-like highlights softly wrapping around the face and armor, subtle atmospheric glow, smooth gradients, and natural, accurate skin tones, rendered in a hyper-realistic, movie-poster-quality style with ultra-sharp facial detail, visible skin texture, shallow depth of field, and the subject perfectly in focus; the background must be completely removed and delivered as a transparent PNG with a clean alpha channel showing only the character, with crisp edges and no halos, fringing, or artifacts, maintaining strict consistency across generations in pose, angle, framing, and lighting, and output in true 4K resolution with ultra-detailed clarity."
};

// Validation constants
// ============================================
// FILE UPLOAD CONSTRAINTS
// ============================================
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB maximum file size
const ALLOWED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png']; // Supported: JPEG, PNG

// ============================================
// FIELD VALIDATION PATTERNS
// ============================================
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

export async function POST(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  try {
    console.log('📝 [1/7] Starting avatar generation...');
    
    // Use admin client for database operations
    const supabase = supabaseAdmin;

    const formData = await request.formData();
    const image = formData.get('photo') as File;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone_no = formData.get('phone_no') as string;
    const district = formData.get('district') as string;
    const category = formData.get('category') as string;
    const organization = formData.get('organization') as string;
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

    if (!district || district.trim().length === 0) {
      return NextResponse.json(
        { error: 'District is required' },
        { status: 400 }
      );
    }

    if (!category || !['Startups', 'Working Professionals', 'Students', 'Business Owners', 'NRI / Gulf Retunees', 'Government Officials'].includes(category)) {
      return NextResponse.json(
        { error: 'Valid category is required' },
        { status: 400 }
      );
    }

    if (!organization || organization.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization is required' },
        { status: 400 }
      );
    }

    // Prompt type validation
    if (!prompt_type || !['prompt1', 'prompt2', 'prompt3'].includes(prompt_type)) {
      return NextResponse.json(
        { error: 'Valid prompt_type is required (prompt1, prompt2, or prompt3)' },
        { status: 400 }
      );
    }

    // ============================================
    // IMAGE FILE VALIDATION
    // ============================================
    // Constraint 1: Validate file format (JPEG/JPG, PNG only)
    if (!ALLOWED_IMAGE_FORMATS.includes(image.type)) {
      return NextResponse.json(
        {
          error: 'Invalid image format',
          details: `Only JPEG/JPG and PNG formats are allowed. Received: ${image.type}`
        },
        { status: 400 }
      );
    }

    // Constraint 2: Validate file size (max 2MB)
    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        {
          error: 'Image file too large',
          details: `Maximum file size is 2MB. Current size: ${(image.size / 1024 / 1024).toFixed(2)}MB`
        },
        { status: 400 }
      );
    }

    // Proceed with processing
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

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('❌ OPENROUTER_API_KEY is not configured');
      console.error('   - Set OPENROUTER_API_KEY in .env.local');
      console.error('   - Get a key from: https://openrouter.ai/keys');
      throw new Error('OPENROUTER_API_KEY not configured. Get one from https://openrouter.ai/keys');
    }

    if (apiKey === 'your_valid_openrouter_key_here' || apiKey.length < 10) {
      console.error('❌ OPENROUTER_API_KEY is invalid or placeholder');
      console.error('   - Current value:', apiKey);
      console.error('   - Get a valid key from: https://openrouter.ai/keys');
      throw new Error('OPENROUTER_API_KEY is invalid. Get a valid key from https://openrouter.ai/keys');
    }

    // Call OpenRouter
    console.log('✓ OpenRouter API key found, sending request...');
    console.log('  Prompt preview:', prompt.substring(0, 80) + '...');
    console.time('OpenRouter_AI_Call');
    const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/GKRBROS/conclave2026',
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

    const responseText = await apiResponse.text();
    if (!responseText) {
      throw new Error('OpenRouter returned an empty response body');
    }

    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse OpenRouter JSON response:', responseText.slice(0, 500));
      throw new Error('OpenRouter returned invalid JSON');
    }
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
    const finalImagePath = await mergeImages(tempGeneratedFile, timestamp.toString(), name, organization);

    // Save metadata to Supabase database
    const { data: dbData, error: dbError } = await supabase
      .from('generations')
      .insert({
        name: name.trim(),
        email: email.trim(),
        phone_no: phone_no.trim(),
        district: district.trim(),
        category: category.trim(),
        organization: organization.trim(),
        photo_url: uploadedImageUrl,
        generated_image_url: finalImagePath,
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
      organization: dbData.organization,
      aws_key: dbData.aws_key,
      photo_url: uploadedImageUrl,
      generated_image_url: finalGeneratedUrl,
      final_image_url: finalImagePath
    });
  } catch (error: any) {
    console.error('❌ CRITICAL ERROR during generation:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error?.message);
    
    // Log stack trace for debugging
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }

    // More detailed error information
    if (error.response) {
      console.error('API Response status:', error.response.status);
      console.error('API Response data:', error.response.data);
    }

    return NextResponse.json(
      {
        error: 'Failed to generate avatar',
        message: error?.message || 'Internal Server Error',
        details: isProduction ? undefined : {
          stack: error?.stack,
          type: error.constructor.name
        }
      },
      { status: 500 }
    );
  }
}

