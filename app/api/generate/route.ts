import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { mergeImages } from '@/lib/imageProcessor';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { S3Service } from '@/lib/s3Service';
import { corsHeaders, handleCorsOptions } from '@/lib/cors';
import OpenAI from 'openai';
import sharp from 'sharp';

export const maxDuration = 600; // Increase timeout for long AI generation

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// 3 AI prompts for image generation
const PROMPTS = {
  prompt1: "Reimagine the uploaded person as a cinematic, high-end superhero portrait inspired by modern DC-style realism, rendered as an upper-body shot (cropped from just below the waist to just above the head) in a strict 4:5 aspect ratio. The subject is placed slightly off-center, facing diagonally upward, with the head subtly tilted up and to the side and eyes looking toward a bright light source above. The pose conveys calm strength and aspiration: chest slightly forward, shoulders relaxed, expression hopeful, confident, and composed with a soft, determined smile—heroic but never aggressive. Identity preservation is absolute: maintain exact facial structure, proportions, and likeness with no beautification or alteration, preserving all personal features precisely as in the source image, including glasses (same style and placement), piercings, jewelry, tattoos (same design and visibility), scars, moles, freckles, birthmarks, facial hair, age, gender, ethnicity, and body proportions.the thickness and length of the neck, shoulder width, and overall body build must remain natural and identical to the reference. Do not make the person slimmer, bulkier, or more athletic than they are. By default, the physique should read as that of a regular everyday person. Any culturally, religiously, or personally significant garments or coverings (e.g., hijab, turban, dupatta, headscarf, veil, cap, or modest clothing) must retain equivalent coverage and meaning, with the superhero suit intelligently adapted to integrate or accommodate them without removal or reinterpretation. The character wears a sleek, form-fitting deep blue superhero suit with premium textured fabric, realistic tension, and visible stitching, randomly styled as either cloth-based heroic, heavier power-driven, or tactical armored, featuring a bold red-and-yellow geometric chest emblem shaped as an upward-pointing arrow, seamlessly integrated. Lighting is dramatic and cinematic with strong rim light from above/behind, warm golden highlights wrapping the face and upper torso, subtle realistic glow and light streaks, smooth gradients, and accurate natural skin tones. Render in hyper-realistic, movie-poster quality with ultra-sharp facial detail, visible skin texture, shallow depth of field, and perfect subject focus. The background must be fully removed and delivered as a transparent PNG with a clean alpha channel (no halos or fringing), maintaining strict consistency in pose, framing, angle, and lighting, and output in true 4K resolution.",
  prompt2: "Reimagine the uploaded person as a cinematic, high-end professional portrait with a heroic yet grounded presence, inspired by modern DC-style realism translated into a refined corporate aesthetic. Present as an upper-body portrait (cropped from just below the waist to just above the head) in a strict 4:5 aspect ratio. The subject is slightly off-center with arms crossed (natural overlap), upright stance, aligned shoulders, and clear torso orientation, while the head faces the camera to convey confidence, clarity, and calm authority. Posture is professional and composed with relaxed yet firm shoulders and chest slightly forward, expressing leadership, optimism, and quiet confidence—never aggressive, exaggerated, or theatrical. The facial expression is hopeful, confident, and aspirational with a subtle, controlled smile and an assured presence. Identity preservation is absolute: maintain exact facial structure, proportions, and likeness with no stylization or beautification, preserving all personal features precisely as in the source image, including glasses (same style and placement), piercings, jewelry, tattoos (same design and visibility), scars, moles, freckles, birthmarks, facial hair, age, gender, ethnicity, and body proportions. Any culturally, religiously, or personally significant garments or coverings (e.g., hijab, turban, dupatta, headscarf, veil, cap, modest or symbolic clothing) must retain equivalent coverage and meaning, with professional attire intelligently adapted to integrate them respectfully without removal or reinterpretation. The character wears a tailored, high-end professional suit—sharp, modern, minimal, and executive (e.g., premium blazer with trousers or skirt)—with realistic fabric texture, natural folds, subtle stitching, precise fit, and neutral or deep tones (charcoal, navy, black, muted earth hues), free of logos or flashy patterns. Lighting is dramatic yet refined with a strong cinematic rim light from above/behind, warm golden highlights wrapping the face and shoulders, smooth gradients, and accurate natural skin tones. Render in hyper-realistic, movie-poster quality with ultra-sharp facial detail, visible skin texture, shallow depth of field, and perfect focus. The background must be fully removed and delivered as a transparent PNG with a clean alpha channel (no halos or fringing), maintaining strict consistency in pose, framing, angle, and lighting, and output in true 4K resolution.",
  prompt3: "Reimagine the uploaded person as a cinematic, high-end medieval warrior portrait inspired by epic historical realism and dramatic film aesthetics. Present as an upper-body portrait (cropped from just below the waist to just above the head) in a strict 4:5 aspect ratio. The subject is slightly off-center, facing diagonally upward, with the head subtly tilted up and to the side, eyes directed toward a soft yet powerful elevated light source. The pose conveys calm authority and resolve: upright posture, relaxed shoulders, chest slightly forward, expressing quiet confidence, honor, and readiness—never aggressive, savage, or exaggerated. The facial expression is resolute, hopeful, and aspirational with a controlled, composed heroic presence. Identity preservation is absolute: maintain exact facial structure, proportions, and likeness with no stylization or beautification, preserving all personal features precisely as in the source image, including glasses (same style and placement), piercings, jewelry, tattoos (same design and visibility), scars, moles, freckles, birthmarks, facial hair, age, gender, ethnicity, and body proportions. Any culturally, religiously, or personally significant garments or coverings (e.g., hijab, turban, dupatta, headscarf, veil, cap, modest or symbolic clothing) must retain equivalent coverage and meaning, with medieval armor or garments intelligently adapted to integrate them respectfully without removal or reinterpretation. The character wears historically inspired medieval warrior attire—layered leather, chainmail, and/or plate elements—with realistic wear, engraved details, natural fabric tension, weathered textures, and functional construction, grounded and noble rather than fantasy-ornamental. Lighting is dramatic and cinematic with strong rim light from above/behind, warm torch-like highlights wrapping the face and armor, subtle atmospheric glow, smooth gradients, and accurate natural skin tones. Render in hyper-realistic, movie-poster quality with ultra-sharp facial detail, visible skin texture, shallow depth of field, and perfect focus. The background must be fully removed and delivered as a transparent PNG with a clean alpha channel (no halos or fringing), maintaining strict consistency in pose, framing, angle, and lighting, and output in true 4K resolution."
};

// Validation constants
// ============================================
// FILE UPLOAD CONSTRAINTS
// ============================================
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png'];

// ============================================
// FIELD VALIDATION PATTERNS
// ============================================

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  const isProduction = process.env.NODE_ENV === 'production';
  try {
    // Use admin client for database operations
    const supabase = supabaseAdmin;

    const formData = await request.formData();
    const image = formData.get('photo') as File;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string | null;
    const phone_no = formData.get('phone_no') as string | null;
    const district = formData.get('district') as string | null;
    const category = formData.get('category') as string | null;
    const organization = formData.get('organization') as string;
    const prompt_type = formData.get('prompt_type') as string;

    // Field validations
    if (!image) {
      return NextResponse.json(
        { error: 'Photo is required' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    if (!organization || organization.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization is required' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Prompt type validation
    if (!prompt_type || !['prompt1', 'prompt2', 'prompt3'].includes(prompt_type)) {
      return NextResponse.json(
        { error: 'Valid prompt_type is required (prompt1, prompt2, or prompt3)' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // ============================================
    // IMAGE FILE VALIDATION
    // ============================================
    const fileExt = image.name ? image.name.toLowerCase().split('.').pop() || '' : '';
    const isValidMime = ALLOWED_IMAGE_FORMATS.includes(image.type);
    const isValidExt = ['jpg', 'jpeg', 'png'].includes(fileExt);

    if (!isValidMime && !isValidExt) {
      return NextResponse.json(
        {
          error: 'Invalid image format',
          details: `Only JPEG/JPG and PNG formats are allowed. Received type: ${image.type || 'unknown'}, extension: ${fileExt || 'unknown'}`
        },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Constraint 2: Validate file size (max 2MB)
    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        {
          error: 'Image file too large',
          details: `Maximum file size is 2MB. Current size: ${(image.size / 1024 / 1024).toFixed(2)}MB`
        },
        { status: 400, headers: corsHeaders(origin) }
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
    let uploadedKey: string | null = null;
    if (!isProduction) {
      try {
        await mkdir(publicUploadsPath, { recursive: true }).catch(() => { });
        await writeFile(join(publicUploadsPath, filename), buffer);
      } catch (err) {
        console.warn('Could not save to public/uploads (read-only FS):', err);
      }
    }

    // Generate AWS S3 key
    const s3Key = `uploads/${timestamp}/${filename}`;

    // Upload to AWS S3
    console.log('📤 Uploading input to AWS S3...');
    try {
      uploadedKey = await S3Service.uploadBuffer(buffer, 'uploads', filename, image.type);
      uploadedImageUrl = S3Service.getPublicUrl(uploadedKey);
      console.log('✅ Uploaded to S3:', uploadedImageUrl);
    } catch (s3Error) {
      console.error('S3 upload error:', s3Error);
      return NextResponse.json(
        { error: 'Failed to upload image to S3' },
        { status: 500 }
      );
    }

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

    const result = await apiResponse.json();
    console.timeEnd('OpenRouter_AI_Call');
    
    // Detailed logging for debugging
    console.log('OpenRouter Response Structure:', JSON.stringify({
      id: result.id,
      model: result.model,
      choices_length: result.choices?.length,
      first_choice_message_keys: result.choices?.[0]?.message ? Object.keys(result.choices[0].message) : [],
    }));

    if (!result.choices || result.choices.length === 0) {
       console.error('OpenRouter Error: No choices returned', JSON.stringify(result));
       throw new Error('AI service returned an empty response');
    }

    const responseMessage = result.choices[0].message;
    let generatedImageUrl: string | undefined = responseMessage.images?.[0]?.image_url?.url;

    // Fallback: Check if image URL is in content (Markdown or plain URL)
    if (!generatedImageUrl && responseMessage.content) {
      console.log('Checking content for image URL...');
      // Regex to find markdown image or direct URL
      const markdownImageRegex = /!\[.*?\]\((.*?)\)/;
      const urlRegex = /(https?:\/\/[^\s]+)/;
      
      const markdownMatch = responseMessage.content.match(markdownImageRegex);
      if (markdownMatch && markdownMatch[1]) {
        generatedImageUrl = markdownMatch[1];
        console.log('Found image URL in markdown content');
      } else {
        const urlMatch = responseMessage.content.match(urlRegex);
        if (urlMatch && urlMatch[1]) {
          generatedImageUrl = urlMatch[1];
          console.log('Found image URL in plain text content');
        }
      }
    }

    if (!generatedImageUrl) {
      console.error('Full OpenRouter Response:', JSON.stringify(result, null, 2));
      throw new Error('No image returned from AI (checked images array and content)');
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
    let generatedKey: string | null = null;

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

    console.log('Uploading generated image to S3...');
    try {
      generatedKey = await S3Service.uploadBuffer(
        imageBuffer,
        'generated',
        generatedFilename,
        'image/png'
      );
      finalGeneratedUrl = S3Service.getPublicUrl(generatedKey);
      console.log('✅ Generated image uploaded to S3:', finalGeneratedUrl);
    } catch (s3GenError) {
      console.error('S3 generated upload error:', s3GenError);
    }

    // Merge with background
    // Pass the /tmp path for processing
    const finalImagePath = await mergeImages(tempGeneratedFile, timestamp.toString(), name, organization);

    let finalImagePresignedUrl = finalImagePath;
    let finalImageDownloadUrl = finalImagePath;
    let finalKey = '';
    try {
      finalKey = new URL(finalImagePath).pathname.replace(/^\//, '');
      finalImagePresignedUrl = await S3Service.getPresignedUrl(finalKey, 604800);
      finalImageDownloadUrl = await S3Service.getDownloadPresignedUrl(finalKey, `scaleup-ticket-${timestamp}.png`, 604800);
    } catch (presignError) {
      console.warn('Failed to presign final image URL:', presignError);
      // Fallback: if it's not a URL, it might be the key
      finalKey = finalImagePath.includes('http') ? '' : finalImagePath;
    }

    let uploadedImagePresignedUrl = uploadedImageUrl;
    if (uploadedKey) {
      try {
        uploadedImagePresignedUrl = await S3Service.getPresignedUrl(uploadedKey, 3600);
      } catch (presignError) {
        console.warn('Failed to presign upload image URL:', presignError);
      }
    }

    // Save metadata to Supabase database
    let dbData, dbError;
    
    // If phone_no is provided, try to update existing user
    if (phone_no && phone_no.trim().length > 0) {
      console.log(`📱 Searching for existing user with phone: ${phone_no}`);
      
      // Check if user exists
      const { data: existingUser, error: searchError } = await supabase
        .from('generations')
        .select('*')
        .eq('phone_no', phone_no.trim())
        .single();
      
      if (!searchError && existingUser) {
        // User exists, update their record
        console.log('✓ Found existing user, updating record...');
          const { data: updateData, error: updateError } = await supabase
            .from('generations')
            .update({
            name: name.trim(),
            organization: organization.trim(),
            photo_url: uploadedImageUrl,
            generated_image_url: generatedKey || finalGeneratedUrl, // Store raw AI image key/URL
            ai_image_key: generatedKey, // Also store in explicit AI image key column
            aws_key: finalKey, // Store the final ticket key
            prompt_type: prompt_type,
            updated_at: new Date().toISOString()
          })
          .eq('phone_no', phone_no.trim())
          .select()
          .single();
        
        dbData = updateData;
        dbError = updateError;
      } else {
        // User not found, create new record
        console.log('✓ No existing user found, creating new record...');
        const { data: insertData, error: insertError } = await supabase
          .from('generations')
          .insert({
            name: name.trim(),
            email: email ? email.trim() : null,
            phone_no: phone_no.trim(),
            district: district ? district.trim() : null,
            category: category ? category.trim() : null,
            organization: organization.trim(),
            photo_url: uploadedImageUrl,
            generated_image_url: generatedKey || finalGeneratedUrl, // Store raw AI image key/URL
            ai_image_key: generatedKey, // Also store in explicit AI image key column
            aws_key: finalKey, // Store the final ticket key
            prompt_type: prompt_type
          })
          .select()
          .single();
        
        dbData = insertData;
        dbError = insertError;
      }
    } else {
      // No phone_no provided, create new record
      console.log('✓ No phone number provided, creating new record...');
      const { data: insertData, error: insertError } = await supabase
        .from('generations')
        .insert({
          name: name.trim(),
          email: email ? email.trim() : null,
          phone_no: null,
          district: district ? district.trim() : null,
          category: category ? category.trim() : null,
          organization: organization.trim(),
          photo_url: uploadedImageUrl,
          generated_image_url: generatedKey || finalGeneratedUrl, // Store raw AI image key/URL
          ai_image_key: generatedKey, // Also store in explicit AI image key column
          aws_key: finalKey, // Store the final ticket key
          prompt_type: prompt_type
        })
        .select()
        .single();
      
      dbData = insertData;
      dbError = insertError;
    }

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save to database', details: dbError.message },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    console.log('Saved to database:', dbData);

    // Prepare AI Image Presigned URL for response
    let aiImagePresignedUrl = finalGeneratedUrl;
    
    if (generatedKey) {
      try {
        aiImagePresignedUrl = await S3Service.getPresignedUrl(generatedKey, 604800);
      } catch (e) {
        console.warn('Failed to presign AI image for response:', e);
      }
    }

    // Set preview and download URLs to the FINAL merged image (the ticket)
    // This ensures the user sees and downloads the branded ticket, not the raw AI output
    const previewUrl = finalImagePresignedUrl;
    const downloadUrl = finalImageDownloadUrl;

    return NextResponse.json({
      success: true,
      user_id: dbData.id,
      name: dbData.name,
      organization: dbData.organization,
      aws_key: finalKey,
      photo_url: uploadedImagePresignedUrl,
      generated_image_url: previewUrl, // Use ticket for preview modal
      raw_ai_image_url: aiImagePresignedUrl, // Keep raw AI image separately
      final_image_url: finalImagePresignedUrl,
      download_url: downloadUrl
    }, { headers: corsHeaders(origin) });
  } catch (error: any) {
    console.error('CRITICAL ERROR during generation:', error);
    // Log stack trace for Vercel logs
    if (error.stack) console.error(error.stack);

    return NextResponse.json(
      {
        error: error?.message || 'Internal Server Error',
        details: isProduction ? undefined : error?.stack
      },
      { status: 500, headers: corsHeaders(request.headers.get('origin') || undefined) }
    );
  }
}

