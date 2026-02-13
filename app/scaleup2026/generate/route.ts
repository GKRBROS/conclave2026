import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import nodemailer from 'nodemailer';
import { mergeImages } from '@/lib/imageProcessor';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { S3Service } from '@/lib/s3Service';
import { corsHeaders, handleCorsOptions } from '@/lib/cors';
import OpenAI from 'openai';
import sharp from 'sharp';
import { WhatsappService } from '@/lib/whatsappService';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 600; // Increase timeout for long AI generation

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// Validation constants
// ============================================
// FILE UPLOAD CONSTRAINTS
// ============================================
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB maximum file size
const ALLOWED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png']; // Supported: JPEG, PNG

// ============================================
// FIELD VALIDATION PATTERNS
// ============================================

// Prompt templates
const PROMPTS = {
  prompt1: 'Reimagine the uploaded person as a cinematic, high-end superhero portrait inspired by modern DC-style realism, presented as an upper-body portrait cropped from just below the waist to just above the head in a consistent 4:5 aspect ratio, with the subject placed slightly off-center and facing diagonally upward, the head subtly tilted up and to the side, eyes looking toward a bright light source above, conveying a strong yet calm posture with the chest slightly forward and shoulders relaxed, and an expression that feels hopeful, confident, and aspirational with a soft, determined smile and a composed heroic presence, never aggressive. Identity preservation is critical: maintain the person’s exact facial structure, proportions, and likeness with absolute accuracy, preserving all personal features exactly as they appear in the source image, including glasses (same style, shape, and placement), nose rings, earrings, piercings, tattoos (same design, placement, and visibility), scars, moles, freckles, birthmarks, and facial hair, without adding, removing, stylizing, idealizing, beautifying, or altering any personal features beyond realistic cinematic lighting, and without changing age, gender, ethnicity, or body proportions. If the uploaded image includes culturally, religiously, or personally significant garments or coverings such as a hijab, turban, dupatta, headscarf, veil, cap, or modest or symbolic clothing, the final image must retain equivalent coverage over the same areas of the body, with the superhero suit intelligently adapted to integrate these elements or provide appropriate coverage without removing, reducing, reinterpreting, or altering their meaning or purpose. The character wears a sleek, form-fitting deep blue superhero suit with premium textured fabric, realistic tension, and visible stitching, with the overall style randomly resembling either a heroic cloth-based design, a darker and heavier power-driven suit, or a tactical armored build, and featuring a bold red and yellow geometric emblem on the chest using an upward-pointing arrow as the symbol itself, seamlessly integrated into the suit. Lighting is dramatic and cinematic with a strong rim light from above and behind, warm golden highlights wrapping naturally around the face and upper torso, subtle light streaks and glow interacting realistically with the subject, smooth color gradients, and natural, accurate skin tones, rendered in a hyper-realistic, movie-poster quality style with ultra-sharp facial detail, visible skin texture, shallow depth of field, and the subject perfectly in focus. The background must be completely removed and delivered as a transparent PNG with a clean alpha channel showing only the character, ensuring clean edges with no halos, fringing, or artifacts, maintaining strict consistency across generations with the same pose, angle, framing, and lighting, and outputting in true 4K resolution with ultra-detailed clarity.',
  prompt2: 'Reimagine the uploaded person as a cinematic, high-end professional portrait with a heroic yet grounded presence, inspired by modern DC-style realism translated into a refined corporate aesthetic, presented as an upper-body portrait cropped from just below the waist to just above the head in a consistent 4:5 aspect ratio, with the subject placed slightly off-center make his arms-crossed positioning, natural arm overlap, upright stance, torso angle, shoulder alignment, and overall body orientation, while the head remains facing the camera to convey confidence, clarity, and calm authority; the posture is professional and composed with relaxed yet firm shoulders and the chest slightly forward, expressing quiet confidence, leadership, and optimism, and the facial expression remains hopeful, confident, and aspirational with a subtle, controlled smile and a calm, assured presence—never aggressive, exaggerated, or theatrical; identity preservation is critical, maintaining the person’s exact facial structure, proportions, and likeness with absolute accuracy, preserving all personal features exactly as they appear in the source image including glasses (same style, shape, and placement), nose rings, earrings, piercings, tattoos (same design, placement, and visibility), scars, moles, freckles, birthmarks, and facial hair, without adding, removing, stylizing, idealizing, beautifying, or altering any features beyond realistic cinematic lighting, and without changing age, gender, ethnicity, or body proportions; if the uploaded image includes culturally, religiously, or personally significant garments or coverings such as a hijab, turban, dupatta, headscarf, veil, cap, or modest or symbolic clothing, the final image must retain equivalent coverage and meaning, with the professional attire intelligently adapted to respect and integrate these elements without removal, reduction, or reinterpretation; the character wears a tailored, high-end professional suit that is sharp, modern, minimal, and executive in tone—such as a premium blazer with trousers or skirt—featuring realistic fabric texture, natural folds, subtle stitching, and precise fit in neutral or deep tones like charcoal, navy, black, or muted earth hues, free of flashy patterns or logos; lighting is dramatic yet refined with a strong cinematic rim light from above and behind, warm golden highlights softly wrapping around the face and shoulders, smooth gradients, and natural, accurate skin tones, rendered in a hyper-realistic, movie-poster-quality style with ultra-sharp facial detail, visible skin texture, shallow depth of field, and the subject perfectly in focus; the background must be completely removed and delivered as a transparent PNG with a clean alpha channel showing only the character, with crisp edges and no halos, fringing, or artifacts, maintaining strict consistency across generations in pose, angle, framing, and lighting, and output in true 4K resolution with ultra-detailed clarity.',
  prompt3: 'Reimagine the uploaded person as a cinematic, high-end medieval warrior portrait with a heroic yet grounded presence, inspired by epic historical realism and dramatic film aesthetics, presented as an upper-body portrait cropped from just below the waist to just above the head in a consistent 4:5 aspect ratio, with the subject placed slightly off-center and facing diagonally upward, the head subtly tilted up and to the side, eyes looking toward a soft but powerful elevated light source to convey strength, resolve, and calm authority; the pose is strong yet composed with relaxed shoulders, upright posture, and chest slightly forward, expressing quiet confidence, honor, and readiness without aggression, while the facial expression remains resolute, hopeful, and aspirational with a subtle, controlled expression and composed heroic presence—never savage or exaggerated; identity preservation is critical, maintaining the person’s exact facial structure, proportions, and likeness with absolute accuracy, preserving all personal features exactly as they appear in the source image including glasses (same style, shape, and placement), nose rings, earrings, piercings, tattoos (same design, placement, and visibility), scars, moles, freckles, birthmarks, and facial hair, without adding, removing, stylizing, idealizing, beautifying, or altering any features beyond realistic cinematic lighting, and without changing age, gender, ethnicity, or body proportions; if the uploaded image includes culturally, religiously, or personally significant garments or coverings such as a hijab, turban, dupatta, headscarf, veil, cap, or modest or symbolic clothing, the final image must retain equivalent coverage and meaning, with the medieval armor or garments intelligently adapted to integrate and respect these elements without removal, reduction, or reinterpretation; the character wears historically inspired medieval warrior attire such as layered leather, chainmail, or plate elements with realistic wear, engraved details, natural fabric tension, weathered textures, and functional construction, styled to feel authentic, grounded, and noble rather than fantasy-exaggerated or ornamental; lighting is dramatic and cinematic with a strong rim light from above and behind, warm torch-like highlights softly wrapping around the face and armor, subtle atmospheric glow, smooth gradients, and natural, accurate skin tones, rendered in a hyper-realistic, movie-poster-quality style with ultra-sharp facial detail, visible skin texture, shallow depth of field, and the subject perfectly in focus; the background must be completely removed and delivered as a transparent PNG with a clean alpha channel showing only the character, with crisp edges and no halos, fringing, or artifacts, maintaining strict consistency across generations in pose, angle, framing, and lighting, and output in true 4K resolution with ultra-detailed clarity.'
};

export async function POST(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  let dbData: any = null;
  let dbError: any = null;
  try {
    // Use admin client for database operations
    const supabase = supabaseAdmin;

    // Step 1: Parse and Validate Form Data
    console.log('--- GENERATION START ---');
    const formData = await request.formData();
    console.log('✓ Form data parsed');
    
    const image = formData.get('photo') as File;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string | null;
    const phone = formData.get('phone') as string | null;
    const phone_no_val = formData.get('phone_no') as string | null;
    const dial_code = formData.get('dial_code') as string | null;
    const userIdFromForm = formData.get('userId') as string | null;

    let finalPhoneBase = phone || phone_no_val;
    const finalDialCode = dial_code || '+91';
    let finalPhone = finalPhoneBase;
    
    // Normalize phone number for matching: remove non-numeric
    if (finalPhoneBase) {
      const originalPhone = finalPhoneBase;
      const cleaned = finalPhoneBase.replace(/\D/g, '');
      
      if (originalPhone.startsWith('+')) {
        finalPhone = '+' + cleaned;
      } else {
        const cleanDialCode = finalDialCode.replace(/\D/g, '');
        if (cleaned.startsWith(cleanDialCode)) {
          finalPhone = '+' + cleaned;
        } else {
          finalPhone = '+' + cleanDialCode + cleaned;
        }
      }
      console.log(`📱 Normalized phone: ${originalPhone} (dial: ${finalDialCode}) -> ${finalPhone}`);
    }
    
    // Determine the primary identifier (Phone number priority)
    // We prioritize phone_no/email over userId to prevent mix-ups if a stale userId is passed from the frontend
    const finalLookupPhone = finalPhone;
    const finalLookupEmail = email;
    
    let lookupId: string | null = null;
    let lookupField: string = 'id';
    const isUuid = userIdFromForm && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdFromForm);

    if (finalLookupPhone) {
      lookupId = finalLookupPhone;
      lookupField = 'phone_no';
    } else if (finalLookupEmail) {
      lookupId = finalLookupEmail;
      lookupField = 'email';
    } else if (isUuid) {
      lookupId = userIdFromForm;
      lookupField = 'id';
    }

    const district = formData.get('district') as string | null;
    const category = formData.get('category') as string | null;
    const organization = formData.get('organization') as string;
    let prompt_type = formData.get('prompt_type') as string;

    const finalDistrict = district?.trim() || 'General';
    const finalCategory = category?.trim() || 'Startups';

    console.log('Input data:', { 
      name, 
      email, 
      finalPhone, 
      finalDistrict,
      finalCategory,
      organization, 
      prompt_type,
      imageName: image?.name,
      imageSize: image?.size,
      imageType: image?.type
    });

    // Fix: If prompt_type is missing or invalid, default to 'prompt1'
    // Also explicitly block "testing" or any other non-standard values
    if (!prompt_type || !['prompt1', 'prompt2', 'prompt3'].includes(prompt_type)) {
      console.log(`⚠️ Invalid prompt_type received: "${prompt_type}". Defaulting to "prompt1".`);
      prompt_type = 'prompt1';
    }

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

    if (!organization || organization.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization is required' },
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

    // Log the category being used
    console.log(`🏷️ Using category: ${finalCategory}`);

    // ============================================
    // STEP 1.5: IMMEDIATELY CLEAR STALE IMAGE DATA
    // ============================================
    // We clear these fields BEFORE S3 upload to prevent polling from returning the previous image
    if (lookupId) {
      console.log(`Step 1.5: Clearing stale image data for ${lookupField}: ${lookupId}`);
      try {
        const { error: clearError } = await supabaseAdmin
          .from('generations')
          .update({
            generated_image_url: null,
            aws_key: null,
            updated_at: new Date().toISOString()
          })
          .eq(lookupField, lookupId);
        
        if (clearError) {
          console.warn('⚠️ Initial clear failed:', clearError.message);
        } else {
          console.log('✓ Stale image data cleared');
        }
      } catch (err) {
        console.warn('⚠️ Initial clear exception:', err);
      }
    }

    console.log('--- PROCESSING START ---');
    console.time('Full_Generation_Process');
    console.log('Step 2: Preparing image buffer');
    // Proceed with processing
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log(`✓ Image buffer prepared: ${buffer.length} bytes`);

    const uniqueId = uuidv4();
    const timestamp = Date.now();
    
    const fileExtension = image.name.split('.').pop() || 'jpg';
    const filename = `upload-${uniqueId}.${fileExtension}`;

    const tmpUploadsPath = join('/tmp', 'uploads');
    const publicUploadsPath = join(process.cwd(), 'public', 'uploads');

    // Save to /tmp for intermediate processing (always works on Vercel)
    console.log('Step 3: Saving to temporary storage');
    await mkdir(tmpUploadsPath, { recursive: true }).catch(() => { });
    const tempUploadFile = join(tmpUploadsPath, filename);
    await writeFile(tempUploadFile, buffer);
    console.log(`✓ Saved to /tmp: ${tempUploadFile}`);

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
    console.log('Step 4: Uploading input to AWS S3...');
    try {
      uploadedKey = await S3Service.uploadBuffer(buffer, 'uploads', filename, image.type);
      uploadedImageUrl = S3Service.getPublicUrl(uploadedKey);
      console.log('✅ Uploaded to S3:', uploadedImageUrl);

      // PRE-SAVE: Save the initial upload and basic info to the DB immediately
    // This ensures we have a record even if AI generation fails later
    if (lookupId) {
      console.log(`Step 5: Pre-saving initial upload for ${lookupField}: ${lookupId}`);
      
      let updateQuery = supabase.from('generations').update({
        name: name.trim(),
        organization: organization.trim(),
        photo_url: uploadedImageUrl,
        // generated_image_url and aws_key are already cleared in Step 1.5
        prompt_type: prompt_type,
        updated_at: new Date().toISOString(),
      });

      updateQuery = updateQuery.eq(lookupField, lookupId);

      const { error: preSaveError } = await updateQuery;
      if (preSaveError) {
        console.warn('⚠️ Pre-save failed:', preSaveError.message);
      } else {
        console.log('✓ Pre-save successful');
      }
    }
    } catch (s3Error) {
      console.error('❌ S3 upload error:', s3Error);
      return NextResponse.json(
        { error: 'Failed to upload image to S3' },
        { status: 500 }
      );
    }

    // Resize image for OpenRouter
    console.log('Step 6: Resizing input image for OpenRouter...');
    const resizedBuffer = await sharp(buffer)
      .resize(1024, 1024, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer();
    console.log(`✓ Image resized: ${resizedBuffer.length} bytes`);

    const base64Image = resizedBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Call OpenRouter
    const prompt = PROMPTS[prompt_type as keyof typeof PROMPTS];

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('❌ OPENROUTER_API_KEY is not configured');
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    // Call OpenRouter
    console.log('Step 7: Sending request to OpenRouter...');
    console.log('  Model:', 'sourceful/riverflow-v2-fast-preview');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout for AI call

    console.time('OpenRouter_AI_Call');
    const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/GKRBROS/conclave2026',
          'X-Title': 'ScaleUp Conclave 2026',
        },
        signal: controller.signal,
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

      clearTimeout(timeoutId);

      if (!apiResponse.ok) {
      console.timeEnd('OpenRouter_AI_Call');
      const status = apiResponse.status;
      const statusText = apiResponse.statusText;
      console.error(`❌ OpenRouter API failed with status ${status}: ${statusText}`);
      
      let errorDetail = '';
      try {
        const errorData = await apiResponse.json();
        errorDetail = JSON.stringify(errorData);
        console.error('OpenRouter Error Body:', errorDetail);
      } catch (e) {
        errorDetail = 'Could not parse error response';
      }
      throw new Error(`AI Generation failed (${status}): ${errorDetail}`);
    }

    const result = await apiResponse.json();
    console.timeEnd('OpenRouter_AI_Call');
    console.log('✓ OpenRouter response received');
    
    if (!result.choices || result.choices.length === 0) {
       console.error('❌ OpenRouter Error: No choices returned', JSON.stringify(result));
       throw new Error('AI service returned an empty response');
    }

    const responseMessage = result.choices[0].message;
    let generatedImageUrl: string | undefined = responseMessage.images?.[0]?.image_url?.url;

    // Fallback: Check if image URL is in content (Markdown or plain URL)
    if (!generatedImageUrl && responseMessage.content) {
      console.log('Checking content for image URL...');
      const urlRegex = /(https?:\/\/[^\s]+)/;
      const urlMatch = responseMessage.content.match(urlRegex);
      if (urlMatch && urlMatch[1]) {
        generatedImageUrl = urlMatch[1];
        console.log('✓ Found image URL in content');
      }
    }

    if (!generatedImageUrl) {
      console.error('❌ No image URL found in response');
      throw new Error('No image returned from AI');
    }

    // Process AI Image
    console.log('Step 8: Fetching and saving AI generated image');
    let imageBuffer: Buffer;
    if (generatedImageUrl.startsWith('data:')) {
      imageBuffer = Buffer.from(generatedImageUrl.split(',')[1], 'base64');
    } else {
      const imageResponse = await fetch(generatedImageUrl);
      imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    }
    console.log(`✓ AI image fetched: ${imageBuffer.length} bytes`);

    // Save intermediate image
    const generatedFilename = `generated-${uniqueId}.png`;
    let finalGeneratedUrl = `/generated/${generatedFilename}`;
    let generatedKey: string | null = null;
    
    // Save to /tmp
    const tmpGeneratedPath = join('/tmp', 'generated');
    await mkdir(tmpGeneratedPath, { recursive: true }).catch(() => { });
    const tempGeneratedFile = join(tmpGeneratedPath, generatedFilename);
    await writeFile(tempGeneratedFile, imageBuffer);
    console.log(`✓ AI image saved to /tmp: ${tempGeneratedFile}`);
    
    console.log('Step 9: Uploading generated image to S3...');
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
      console.error('❌ S3 generated upload error:', s3GenError);
    }
    
    // STEP 10: Merging with background template
    console.log('Step 10: Merging with background template...');
    let finalImagePath: string;
    try {
      finalImagePath = await mergeImages(tempGeneratedFile, uniqueId, name, organization);
      console.log(`✅ Merge complete. Result URL: ${finalImagePath}`);
    } catch (mergeError) {
      console.error('❌ Merge error:', mergeError);
      // Fallback to the generated image if merge fails
      finalImagePath = finalGeneratedUrl;
      console.log(`⚠️ Falling back to raw generated image: ${finalImagePath}`);
    }
    
    let finalImagePresignedUrl = finalImagePath;
    let finalImageDownloadUrl = finalImagePath;
    let finalKey = '';
    try {
      // The finalImagePath is a full URL (public URL) returned by mergeImages or finalGeneratedUrl
      // S3Service.getPublicUrl format: https://BUCKET.s3.REGION.amazonaws.com/KEY
      
      if (finalImagePath.includes('amazonaws.com')) {
        try {
          const url = new URL(finalImagePath);
          // Remove leading slash from pathname to get the key
          finalKey = url.pathname.replace(/^\//, '');
          console.log(`🔑 Extracted S3 Key for final image: ${finalKey}`);
        } catch (urlError) {
          console.warn('Failed to parse finalImagePath as URL, using as key:', finalImagePath);
          finalKey = finalImagePath;
        }
      } else {
        // Fallback if it is already a key
        finalKey = finalImagePath;
        console.log(`🔑 Using finalImagePath as S3 Key: ${finalKey}`);
      }
      
      console.log(`🚀 Generating presigned URLs for finalKey: ${finalKey}`);
      finalImagePresignedUrl = await S3Service.getPresignedUrl(finalKey, 604800, 'image/png'); // 7 days expiry
      finalImageDownloadUrl = await S3Service.getDownloadPresignedUrl(finalKey, `scaleup-avatar-${uniqueId}.png`, 604800, 'image/png');
      console.log('✅ Presigned URLs generated:');
      console.log(`   - Preview: ${finalImagePresignedUrl.substring(0, 50)}...`);
      console.log(`   - Download: ${finalImageDownloadUrl.substring(0, 50)}...`);
    } catch (presignError) {
      console.warn('Failed to presign final image URL:', presignError);
    }

    let uploadedImagePresignedUrl = uploadedImageUrl;
    if (uploadedKey) {
      try {
        uploadedImagePresignedUrl = await S3Service.getPresignedUrl(uploadedKey, 3600, image.type);
      } catch (presignError) {
        console.warn('Failed to presign upload image URL:', presignError);
      }
    }

    // Save metadata to Supabase database
    console.log(`💾 Saving record to database with prompt_type: ${prompt_type}`);
    console.log(`   Final Key to store: ${finalKey}`);

    // Search for existing user by prioritized ID (UUID > Phone > Email)
    let existingUser = null;
    
    if (isUuid && lookupId) {
      console.log(`🆔 Searching for existing user with UUID: ${lookupId}`);
      const { data } = await supabase
        .from('generations')
        .select('*')
        .eq('id', lookupId)
        .maybeSingle();
      existingUser = data;
    }

    if (!existingUser && finalPhone && finalPhone.trim().length > 0) {
      console.log(`📱 Searching for existing user with phone: ${finalPhone}`);
      const { data } = await supabase
        .from('generations')
        .select('*')
        .eq('phone_no', finalPhone.trim())
        .maybeSingle();
      existingUser = data;
    }

    if (!existingUser && email && email.trim().length > 0) {
      console.log(`📧 Searching for existing user with email: ${email}`);
      const { data } = await supabase
        .from('generations')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      existingUser = data;
    }

    if (existingUser) {
      // User exists, update their record
      console.log(`✓ Found existing user (ID: ${existingUser.id}), updating record...`);
      const { data: updateData, error: updateError } = await supabase
        .from('generations')
        .update({
          name: name.trim(),
          organization: organization.trim(),
          photo_url: uploadedImageUrl,
          generated_image_url: generatedKey || finalGeneratedUrl, // Store raw AI image key/URL
          aws_key: finalKey, // Use the final merged image key
          prompt_type: prompt_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
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
          email: email ? email.trim().toLowerCase() : null,
          phone_no: finalPhone ? finalPhone.trim() : null,
          district: finalDistrict,
          category: finalCategory,
          organization: organization.trim(),
          photo_url: uploadedImageUrl,
          generated_image_url: generatedKey || finalGeneratedUrl, // Store raw AI image key/URL
          aws_key: finalKey, // Use the final merged image key
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
        {
          status: 500
        }
      );
    }

    console.log('Saved to database:', dbData);

    // Step 8: Send WhatsApp message (Non-blocking)
    if (finalPhone) {
      console.log('📱 Triggering WhatsApp message...');
      
      // Use the presigned URL for WhatsApp to ensure it is viewable/downloadable
      // Presigned URLs are direct links that bypass S3 access restrictions (XML/Access Denied)
      const whatsappImageUrl = finalImagePresignedUrl;

      // Extract the numeric phone number for WhatsApp service
      const numericPhone = finalPhone!.replace(/\D/g, '');
      console.log(`📱 Sending to numeric phone: ${numericPhone}`);

      WhatsappService.sendImage(numericPhone, whatsappImageUrl).then(res => {
        if (res.success) {
          console.log('✅ WhatsApp notification sent successfully');
        } else {
          console.warn('⚠️ WhatsApp notification failed:', res.message);
        }
      }).catch(err => {
        console.error('❌ Error in WhatsApp notification promise:', err);
      });
    }

    // Update the dbData with the presigned URLs for the response
    if (dbData) {
      // Use the raw AI image for generated_image_url and download_url
      // but keep the final merged image for final_image_url (the ticket)
      try {
        const aiKey = dbData.generated_image_url;
        if (aiKey && !aiKey.startsWith('http')) {
           dbData.generated_image_url = await S3Service.getPresignedUrl(aiKey, 604800);
           dbData.download_url = await S3Service.getDownloadPresignedUrl(aiKey, `scaleup-ai-${uniqueId}.png`, 604800);
        } else {
           dbData.download_url = finalImageDownloadUrl;
        }
      } catch (e) {
        console.warn('Failed to presign AI image for response:', e);
        dbData.download_url = finalImageDownloadUrl;
      }
      
      dbData.final_image_url = finalImagePresignedUrl;
    }

    // Step 9: Send Email (Non-blocking)
    if (email && email.trim().length > 0) {
      console.log(`📧 Sending email to ${email}...`);
      
      // Use the presigned URL for the email to ensure it is viewable/downloadable
      // This solves the issue where public URLs might be blocked by bucket policies
      // We do NOT escape ampersands here anymore, as it breaks the signature in some contexts
      // and nodemailer/email clients usually handle URL encoding correctly.
      const emailImageUrl = finalImagePresignedUrl;
      const emailDownloadUrl = finalImageDownloadUrl;

      // We run this async without awaiting to not block the response
      (async () => {
        try {
          const templatePath = join(process.cwd(), 'app', 'api', 'send-mail', 'mail.html');
          let html = await readFile(templatePath, 'utf-8');
          
          html = html.replace(/{{IMAGE_URL}}/g, emailImageUrl);
          html = html.replace(/{{DOWNLOAD_URL}}/g, emailDownloadUrl);

          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST_NAME,
            port: Number(process.env.SMTP_PORT),
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });

          await transporter.sendMail({
            from: `"ScaleUp" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'ScaleUp Generated Avatar',
            html,
          });
          console.log('✅ Email sent successfully');
        } catch (emailError) {
          console.error('❌ Failed to send email:', emailError);
        }
      })();
    }

    // Final success response with CORS
    if (!dbData) {
      console.timeEnd('Full_Generation_Process');
      throw new Error('Database operation failed to return data');
    }

    console.log('✅ Generation process complete, sending response');
    console.timeEnd('Full_Generation_Process');

    return NextResponse.json(
      {
        success: true,
        user_id: dbData.id,
        name: dbData.name,
        organization: dbData.organization,
        aws_key: dbData.aws_key,
        photo_url: uploadedImagePresignedUrl,
        generated_image_url: finalImagePresignedUrl,
        final_image_url: finalImagePresignedUrl,
        download_url: finalImageDownloadUrl
      },
      {
        status: 200
      }
    );
  } catch (error: any) {
    console.timeEnd('Full_Generation_Process');
    console.error('CRITICAL ERROR during generation:', error);
    // Log stack trace for Vercel logs
    if (error.stack) console.error(error.stack);

    return NextResponse.json(
      {
        error: error?.message || 'Internal Server Error',
        details: isProduction ? undefined : error?.stack
      },
      {
        status: 500
      }
    );
  }
}

