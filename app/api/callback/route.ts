import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { mergeImages } from '@/lib/imageProcessor';
import { jobStore } from '@/lib/jobStore';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    console.log(`POST /api/callback called with jobId: ${jobId}`);

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID not provided' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Update job status in store
    const job = jobStore.get(jobId);
    if (job) {
      job.status = body.status || 'completed';
      job.result = body;
    }

    console.log(`Callback received for job ${jobId}:`, body);

    // If generation is complete, process the result
    if (body.status === 'SUCCESS' && body.output) {
      const generatedImageUrl = body.output.image_url || body.output[0];

      if (generatedImageUrl) {
        try {
          // Download the generated image
          const imageResponse = await fetch(generatedImageUrl);
          if (!imageResponse.ok) {
            throw new Error('Failed to fetch generated image');
          }

          const generatedBuffer = Buffer.from(
            await imageResponse.arrayBuffer()
          );

          // Save generated image
          const timestamp = Date.now();
          const generatedFilename = `generated-${timestamp}.png`;
          const generatedDir = join(process.cwd(), 'public', 'generated');
          await mkdir(generatedDir, { recursive: true });

          const generatedFilepath = join(generatedDir, generatedFilename);
          await writeFile(generatedFilepath, generatedBuffer);

          // Merge with background
          const finalImagePath = await mergeImages(
            generatedFilepath,
            timestamp.toString()
          );

          // Update job with final results
          if (job) {
            job.generatedUrl = `/generated/${generatedFilename}`;
            job.finalImageUrl = finalImagePath;
            job.status = 'completed';
          }

          return NextResponse.json({
            success: true,
            message: 'Image processed successfully',
            jobId,
          });
        } catch (error) {
          console.error('Error processing generated image:', error);
          if (job) {
            job.status = 'error';
            job.error = error instanceof Error ? error.message : 'Processing failed';
          }
          return NextResponse.json(
            { error: 'Failed to process generated image' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Callback received',
      jobId,
    });
  } catch (error: any) {
    console.error('Error in callback:', error);
    return NextResponse.json(
      { error: error?.message || 'Callback processing failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    console.log(`GET /api/callback called with jobId: ${jobId}`);
    console.log(`Current jobs in store:`, Array.from(jobStore.keys()));

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID not provided' },
        { status: 400 }
      );
    }

    const job = jobStore.get(jobId);

    if (!job) {
      console.log(`Job ${jobId} not found in store`);
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: job.status,
      generatedUrl: job.generatedUrl || null,
      finalImageUrl: job.finalImageUrl || null,
      error: job.error || null,
    });
  } catch (error: any) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}
