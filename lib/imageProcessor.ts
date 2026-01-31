import sharp from 'sharp';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { getSupabaseClient } from '@/lib/supabase';

export async function mergeImages(
  generatedImagePath: string,
  timestamp: string,
  name?: string,
  designation?: string
): Promise<string> {
  try {
    console.log('--- MERGE IMAGES DEBUG START ---');
    console.log('generatedImagePath:', generatedImagePath);
    console.log('Text Overlay:', { name, designation });
    console.log('Node Env:', process.env.NODE_ENV);

    // Create output directory
    const isProduction = process.env.NODE_ENV === 'production';
    const publicOutputDir = join(process.cwd(), 'public', 'final');
    const tmpOutputDir = join('/tmp', 'final');
    const outputDir = isProduction ? tmpOutputDir : publicOutputDir;

    try {
      await mkdir(outputDir, { recursive: true });
    } catch (error) {
      // Directory might already exist or be read-only
    }

    // Load background image
    const backgroundPath = join(process.cwd(), 'public', 'background.png');
    const layerPath = join(process.cwd(), 'public', 'layer.png');
    console.log('Paths:', { backgroundPath, layerPath });

    // Load images and metadata
    const [bgMetadata, layerMetadata] = await Promise.all([
      sharp(backgroundPath).metadata(),
      sharp(layerPath).metadata(),
    ]);

    const bgWidth = bgMetadata.width || 1024;
    const bgHeight = bgMetadata.height || 1024;
    const layerWidth = layerMetadata.width || 1080;
    const layerHeight = layerMetadata.height || 1920;

    console.log(`Dimensions - BG: ${bgWidth}x${bgHeight}, Layer: ${layerWidth}x${layerHeight}`);

    // STEP 1: Composite generated image BEHIND layer.png
    // Auto-fit logic: Fill width 100% and constrain height to 60% for consistent poster look
    // regardless of input aspect ratio.
    const charWidth = layerWidth;
    const charHeight = Math.floor(layerHeight * 0.60); // Auto-fit height set to 60%
    const charTopOffset = 350; // Moved up slightly as requested
    const charLeftOffset = 0;

    const layerWithCharacter = await sharp(layerPath)
      .resize(layerWidth, layerHeight)
      .composite([
        {
          input: await sharp(generatedImagePath)
            .resize(charWidth, charHeight, {
              fit: 'cover',
              position: 'top'
            })
            .toBuffer(),
          blend: 'dest-over',
          top: charTopOffset,
          left: charLeftOffset
        }
      ])
      .toBuffer();

    // STEP 2: Create Text Overlay if name/designation provided
    let finalCompositeLayers: any[] = [
      {
        input: await sharp(layerWithCharacter)
          .resize(bgWidth, bgHeight, {
            fit: 'cover'
          })
          .toBuffer(),
        gravity: 'center',
        blend: 'over'
      }
    ];

    if (name || designation) {
      // Create SVG overlay for text
      // Positioning based on the white banner in the reference (approx bottom 1/4)
      const svgWidth = bgWidth;
      const svgHeight = bgHeight;

      // Cal Sans for name (approx 64px)
      // Geist for designation (approx 36px, -4% kerning)
      const nameText = name ? name.toUpperCase() : '';
      const desText = designation ? designation.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()) : '';

      // Auto-scaling logic: start with larger base size and scale down
      const maxWidth = 900; // Visible banner width
      const baseNameSize = 80;
      const baseDesSize = 42;

      // Estimate character widths (approximate for sans-serif)
      const nameEstimatedWidth = nameText.length * (baseNameSize * 0.6);
      const nameFontSize = nameEstimatedWidth > maxWidth
        ? Math.floor(baseNameSize * (maxWidth / nameEstimatedWidth))
        : baseNameSize;

      const desEstimatedWidth = desText.length * (baseDesSize * 0.5);
      const desFontSize = desEstimatedWidth > maxWidth
        ? Math.floor(baseDesSize * (maxWidth / desEstimatedWidth))
        : baseDesSize;

      // Precise coordinates for the center of the white banner area
      // Final Micro adjustment: 0.755 -> 0.752, 0.787 -> 0.784 (another 0.3% up)
      const nameY = Math.floor(svgHeight * 0.752);
      const desY = Math.floor(svgHeight * 0.784);

      // Use system fonts that are guaranteed to be available on Vercel
      // This is the most reliable approach for serverless environments
      console.log('Using system fonts for maximum Vercel compatibility');

      const svgOverlay = `
        <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
          <text 
            x="${svgWidth / 2}" 
            y="${nameY}" 
            fill="#000000" 
            font-family="Arial Black, Impact, DejaVu Sans, Arial, sans-serif" 
            font-size="${Math.max(nameFontSize, 24)}" 
            font-weight="900" 
            text-anchor="middle" 
            dominant-baseline="middle"
            ${nameEstimatedWidth > maxWidth ? `textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"` : ''}
          >${nameText}</text>
          <text 
            x="${svgWidth / 2}" 
            y="${desY}" 
            fill="#222222" 
            font-family="Arial, Helvetica, DejaVu Sans, sans-serif" 
            font-size="${Math.max(desFontSize, 18)}" 
            font-weight="600" 
            text-anchor="middle" 
            dominant-baseline="middle"
            letter-spacing="-0.02em"
            ${desEstimatedWidth > maxWidth ? `textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"` : ''}
          >${desText}</text>
        </svg>
      `;
      console.log('SVG Overlay Length:', svgOverlay.length);
      console.log('SVG Sample:', svgOverlay.substring(0, 300) + '...');

      finalCompositeLayers.push({
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
        blend: 'over'
      });
    }

    const finalBuffer = await sharp(backgroundPath)
      .resize(bgWidth, bgHeight)
      .composite(finalCompositeLayers)
      .png()
      .toBuffer();

    // Generate filename
    const timestamp_str = timestamp.toString();
    const outputFilename = `final-${timestamp_str}.png`;

    // Save final image locally only in development
    if (!isProduction) {
      try {
        const outputPath = join(outputDir, outputFilename);
        await writeFile(outputPath, finalBuffer);
        console.log('Final image saved locally:', outputPath);
      } catch (err) {
        console.warn('Could not save final image locally:', err);
      }
    }

    // Upload final image to Supabase in production so it can be previewed and downloaded
    if (isProduction) {
      const supabase = getSupabaseClient();
      const { error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(`final/${outputFilename}`, finalBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) {
        console.error('Supabase final upload error:', uploadError);
        throw new Error('Failed to upload final image');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('generated-images')
        .getPublicUrl(`final/${outputFilename}`);

      console.log('Final image uploaded:', publicUrl);
      console.log('--- MERGE IMAGES DEBUG END - SUCCESS ---');
      return publicUrl;
    }

    console.log('--- MERGE IMAGES DEBUG END - SUCCESS ---');
    return `/final/${outputFilename}`;
  } catch (error) {
    console.error('CRITICAL ERROR in mergeImages:', error);
    throw new Error(`Failed to merge images: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
