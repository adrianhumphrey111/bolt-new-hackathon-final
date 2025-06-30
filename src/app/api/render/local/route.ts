import { NextRequest, NextResponse } from 'next/server';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { 
      composition,
      timelineState,
      outputFormat = 'mp4',
      quality = 'medium',
      projectId,
    } = await request.json();

    console.log('🎬 Starting local render for composition:', composition);

    // Bundle the Remotion project
    const bundleLocation = await bundle({
      entryPoint: path.join(process.cwd(), 'src/remotion/index.ts'),
      // Use memory bundling for faster performance
      webpackOverride: (config) => config,
    });

    // Get composition details
    const comp = await selectComposition({
      serveUrl: bundleLocation,
      id: composition,
      inputProps: {
        timeline: timelineState,
      },
    });

    // Define output path
    const outputFileName = `timeline-${projectId}-${Date.now()}.${outputFormat}`;
    const outputPath = path.join(process.cwd(), 'public', 'renders', outputFileName);

    // Ensure renders directory exists
    const { mkdir } = await import('fs/promises');
    await mkdir(path.join(process.cwd(), 'public', 'renders'), { recursive: true });

    // Quality settings
    const crf = quality === 'high' ? 18 : quality === 'medium' ? 23 : 28;

    // Render the video
    await renderMedia({
      composition: comp,
      serveUrl: bundleLocation,
      codec: outputFormat === 'mp4' ? 'h264' : 'h265',
      outputLocation: outputPath,
      inputProps: {
        timeline: timelineState,
      },
      crf,
      imageFormat: 'jpeg',
      onProgress: (progress) => {
        console.log(`Rendering: ${Math.round(progress.progress * 100)}%`);
      },
    });

    console.log('✅ Local render complete:', outputPath);

    // Return the public URL for download
    const publicUrl = `/renders/${outputFileName}`;

    return NextResponse.json({
      success: true,
      outputFile: publicUrl,
      message: 'Render completed successfully',
    });

  } catch (error) {
    console.error('❌ Local render failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Local render failed',
      },
      { status: 500 }
    );
  }
}