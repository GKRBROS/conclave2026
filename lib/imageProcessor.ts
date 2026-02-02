import sharp from 'sharp';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { getSupabaseClient } from '@/lib/supabase';
import { createCanvas } from 'canvas';

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
      // Create text overlay using Canvas (better than SVG for text rendering)
      const canvasWidth = bgWidth;
      const canvasHeight = bgHeight;

      const nameText = name ? name.toUpperCase() : '';
      const desText = designation ? designation.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()) : '';

      // Auto-scaling logic
      const maxWidth = 900;
      const baseNameSize = 80;
      const baseDesSize = 42;

      const nameEstimatedWidth = nameText.length * (baseNameSize * 0.6);
      const nameFontSize = nameEstimatedWidth > maxWidth
        ? Math.floor(baseNameSize * (maxWidth / nameEstimatedWidth))
        : baseNameSize;

      const desEstimatedWidth = desText.length * (baseDesSize * 0.5);
      const desFontSize = desEstimatedWidth > maxWidth
        ? Math.floor(baseDesSize * (maxWidth / desEstimatedWidth))
        : baseDesSize;

      const nameY = Math.floor(canvasHeight * 0.752);
      const desY = Math.floor(canvasHeight * 0.784);

      console.log('Text overlay:', { nameText, desText, nameFontSize, desFontSize, nameY, desY });

      // Create canvas with text using node-canvas
      try {
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');

        // Draw name text
        if (nameText) {
          ctx.font = `900 ${Math.max(nameFontSize, 24)}px Arial, sans-serif`;
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(nameText, Math.floor(canvasWidth / 2), nameY);
        }

        // Draw designation text
        if (desText) {
          ctx.font = `600 ${Math.max(desFontSize, 18)}px Arial, sans-serif`;
          ctx.fillStyle = '#222222';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(desText, Math.floor(canvasWidth / 2), desY);
        }

        const textBuffer = canvas.toBuffer('image/png');
        console.log('Canvas text overlay created, buffer size:', textBuffer.length);

        finalCompositeLayers.push({
          input: textBuffer,
          top: 0,
          left: 0,
          blend: 'over'
        });
      } catch (canvasErr) {
        console.warn('Canvas text rendering failed, falling back to SVG:', canvasErr);
        // Fallback to SVG if canvas fails
        const svgWidth = bgWidth;
        const svgHeight = bgHeight;
        let svgContent = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg"><defs><style>text { font-family: Arial, sans-serif; }</style></defs>`;
        
        if (nameText) {
          svgContent += `<text x="${Math.floor(svgWidth / 2)}" y="${nameY}" fill="#000000" font-size="${Math.max(nameFontSize, 24)}" font-weight="900" text-anchor="middle" dominant-baseline="middle">${nameText}</text>`;
        }
        
        if (desText) {
          svgContent += `<text x="${Math.floor(svgWidth / 2)}" y="${desY}" fill="#222222" font-size="${Math.max(desFontSize, 18)}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${desText}</text>`;
        }
        
        svgContent += `</svg>`;
        
        finalCompositeLayers.push({
          input: Buffer.from(svgContent),
          top: 0,
          left: 0,
          blend: 'over'
        });
      }
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
