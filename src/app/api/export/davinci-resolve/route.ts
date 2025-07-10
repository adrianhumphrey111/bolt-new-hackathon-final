import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../../../../lib/s3Client';
import JSZip from 'jszip';
import { TimelineState, TimelineItem } from '../../../../../types/timeline';

// Configure route for large file handling
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes timeout

interface MediaFile {
  url: string;
  filename: string;
  originalItem: TimelineItem;
}

export async function POST(request: NextRequest) {
  try {
    const { timelineState, projectName } = await request.json();
    
    if (!timelineState || !projectName) {
      return NextResponse.json({ error: 'Timeline state and project name are required' }, { status: 400 });
    }

    console.log('Starting DaVinci Resolve export for project:', projectName);
    
    // Create ZIP instance
    const zip = new JSZip();
    
    // Collect all unique media files
    const mediaFiles = collectMediaFiles(timelineState);
    console.log('Found media files:', mediaFiles.length);
    
    // Create Media folder in ZIP
    const mediaFolder = zip.folder('Media');
    if (!mediaFolder) {
      throw new Error('Failed to create Media folder in ZIP');
    }
    
    // Download and add media files to ZIP using direct URL fetch
    const mediaDownloadPromises = mediaFiles.map(async (mediaFile) => {
      try {
        console.log('Downloading media file:', mediaFile.url);
        
        const response = await fetch(mediaFile.url);
        if (!response.ok) {
          throw new Error(`Failed to download ${mediaFile.filename}: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        mediaFolder.file(mediaFile.filename, arrayBuffer);
        
        console.log('Successfully added to ZIP:', mediaFile.filename, `(${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
        return mediaFile;
      } catch (error) {
        console.error(`Error downloading ${mediaFile.filename}:`, error);
        return null;
      }
    });
    
    // Wait for all media downloads to complete
    const downloadedMedia = await Promise.all(mediaDownloadPromises);
    const successfulDownloads = downloadedMedia.filter(media => media !== null);
    
    console.log('Successfully downloaded media files:', successfulDownloads.length);
    
    // Generate XML with relative paths to Media folder
    const xmlContent = generateDaVinciResolveXML(timelineState, projectName, successfulDownloads);
    
    // Add XML file to ZIP root
    zip.file('timeline.xml', xmlContent);
    
    // Add README file with instructions
    const readme = generateReadmeContent(projectName);
    zip.file('README.txt', readme);
    
    // Generate ZIP buffer with compression
    console.log('Generating ZIP file...');
    const zipBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6 // Balance between compression and speed
      }
    });
    
    console.log(`ZIP file generated successfully. Size: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Upload ZIP to S3
    const bucketName = process.env.NEXT_PUBLIC_AWS_S3_RAW_UPLOAD_PROCESSED_BUCKET;
    if (!bucketName) {
      throw new Error('S3 bucket name not configured');
    }
    
    const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_DaVinci_Export.zip`;
    const s3Key = `exports/${Date.now()}_${filename}`;
    
    console.log('Uploading ZIP to S3...');
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: zipBuffer,
      ContentType: 'application/zip',
      ContentDisposition: `attachment; filename="${filename}"`,
    });
    
    await s3Client.send(uploadCommand);
    
    // Generate download URL
    const downloadUrl = `https://${bucketName}.s3.amazonaws.com/${s3Key}`;
    
    console.log('ZIP uploaded successfully. Download URL:', downloadUrl);
    
    // Return download URL instead of the file
    return NextResponse.json({
      success: true,
      downloadUrl,
      filename,
      size: zipBuffer.length,
      message: 'DaVinci Resolve export package created successfully'
    });
    
  } catch (error) {
    console.error('Error creating DaVinci Resolve export:', error);
    return NextResponse.json({ 
      error: 'Failed to create DaVinci Resolve export',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Collects all unique media files from the timeline
 */
function collectMediaFiles(timelineState: TimelineState): MediaFile[] {
  const { tracks } = timelineState;
  const mediaMap = new Map<string, MediaFile>();
  
  console.log('Collecting media files from timeline...');
  
  tracks.forEach((track, trackIndex) => {
    track.items.forEach((item, itemIndex) => {
      if (item.type === 'video' && item.src) {
        const url = item.src;
        
        // Skip if we already have this URL
        if (!mediaMap.has(url)) {
          const filename = extractFilenameFromUrl(url, item.name);
          
          // Ensure unique filename in case of naming conflicts
          let uniqueFilename = filename;
          let counter = 1;
          const existingFilenames = new Set(Array.from(mediaMap.values()).map(m => m.filename));
          
          while (existingFilenames.has(uniqueFilename)) {
            const parts = filename.split('.');
            const ext = parts.pop();
            const baseName = parts.join('.');
            uniqueFilename = `${baseName}_${counter}.${ext}`;
            counter++;
          }
          
          mediaMap.set(url, {
            url,
            filename: uniqueFilename,
            originalItem: item
          });
          
          console.log(`Added media file: ${uniqueFilename} (from track ${trackIndex}, item ${itemIndex})`);
        } else {
          console.log(`Skipping duplicate URL: ${url}`);
        }
      }
    });
  });
  
  const mediaFiles = Array.from(mediaMap.values());
  console.log(`Total unique media files: ${mediaFiles.length}`);
  
  return mediaFiles;
}

/**
 * Extracts filename from URL or creates one from item name
 */
function extractFilenameFromUrl(url: string, itemName: string): string {
  try {
    const urlObj = new URL(url);
    const urlPath = urlObj.pathname;
    const segments = urlPath.split('/');
    const filename = segments[segments.length - 1];
    
    // If we have a filename with extension, use it
    if (filename && filename.includes('.') && filename.length > 0) {
      const cleanFilename = filename.split('?')[0];
      return cleanFilename;
    }
  } catch (error) {
    console.log('Error parsing URL for filename:', url, error);
  }
  
  // Fallback: create filename from item name
  const cleanName = itemName.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  if (cleanName.length === 0) {
    return `video_${Date.now()}.mp4`;
  }
  
  if (!cleanName.includes('.')) {
    return `${cleanName}.mp4`;
  }
  
  return cleanName;
}

/**
 * Generates the XML content with relative paths to Media folder
 */
function generateDaVinciResolveXML(timelineState: TimelineState, projectName: string, downloadedMedia: MediaFile[]): string {
  const { tracks, fps, totalDuration } = timelineState;
  const totalDurationFrames = Math.round(totalDuration);
  
  // Create filename mapping for downloaded media
  const filenameMap = new Map<string, string>();
  downloadedMedia.forEach(media => {
    if (media) {
      filenameMap.set(media.url, media.filename);
    }
  });
  
  // Collect all video clips from all tracks
  let clipIdCounter = 1;
  const allClips: Array<{ item: TimelineItem; id: string; trackIndex: number }> = [];
  
  tracks.forEach((track, trackIndex) => {
    track.items.forEach(item => {
      if (item.type === 'video' && item.src && filenameMap.has(item.src)) {
        allClips.push({
          item,
          id: `clipitem-${clipIdCounter++}`,
          trackIndex
        });
      }
    });
  });
  
  // Sort clips by start time
  allClips.sort((a, b) => a.item.startTime - b.item.startTime);
  
  // Generate video and audio tracks XML
  const videoTracksXML = generateVideoTracksXML(allClips, fps, filenameMap);
  const audioTracksXML = generateAudioTracksXML(allClips, fps, filenameMap);
  
  // Build Final Cut Pro 7 XML
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <project>
    <name>${escapeXML(projectName)}</name>
    <children>
      <sequence id="sequence-1">
        <name>${escapeXML(projectName)}</name>
        <duration>${totalDurationFrames}</duration>
        <rate>
          <timebase>${fps}</timebase>
          <ntsc>FALSE</ntsc>
        </rate>
        <timecode>
          <rate>
            <timebase>${fps}</timebase>
            <ntsc>FALSE</ntsc>
          </rate>
          <string>01:00:00:00</string>
          <frame>0</frame>
          <displayformat>NDF</displayformat>
        </timecode>
        <in>0</in>
        <out>${totalDurationFrames}</out>
        <media>
          <video>
            ${videoTracksXML}
          </video>
          <audio>
            ${audioTracksXML}
          </audio>
        </media>
      </sequence>
    </children>
  </project>
</xmeml>`;
}

/**
 * Generates video tracks XML with relative paths to Media folder
 */
function generateVideoTracksXML(allClips: Array<{ item: TimelineItem; id: string; trackIndex: number }>, fps: number, filenameMap: Map<string, string>): string {
  if (allClips.length === 0) {
    return '<track></track>';
  }
  
  // Group clips by track
  const trackMap = new Map<number, Array<{ item: TimelineItem; id: string }>>();
  
  allClips.forEach(({ item, id, trackIndex }) => {
    if (!trackMap.has(trackIndex)) {
      trackMap.set(trackIndex, []);
    }
    trackMap.get(trackIndex)!.push({ item, id });
  });
  
  const tracks: string[] = [];
  
  trackMap.forEach((clips, trackIndex) => {
    const clipItems = clips.map(({ item, id }) => {
      const startFrame = Math.round(item.startTime);
      const endFrame = Math.round(item.startTime + item.duration);
      const durationFrames = Math.round(item.duration);
      
      const sourceInFrame = item.properties?.originalStartTime 
        ? Math.round(item.properties.originalStartTime * fps)
        : 0;
      
      const sourceOutFrame = item.properties?.originalEndTime
        ? Math.round(item.properties.originalEndTime * fps)
        : durationFrames;
      
      const filename = filenameMap.get(item.src!);
      const relativePath = `Media/${filename}`;
      
      return `        <clipitem id="${id}">
          <name>${escapeXML(item.name)}</name>
          <duration>${durationFrames}</duration>
          <rate>
            <timebase>${fps}</timebase>
            <ntsc>FALSE</ntsc>
          </rate>
          <start>${startFrame}</start>
          <end>${endFrame}</end>
          <in>${sourceInFrame}</in>
          <out>${sourceOutFrame}</out>
          <file id="file-${id}">
            <name>${escapeXML(filename || item.name)}</name>
            <pathurl>${escapeXML(relativePath)}</pathurl>
            <rate>
              <timebase>${fps}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <duration>${durationFrames}</duration>
            <media>
              <video>
                <duration>${durationFrames}</duration>
                <samplecharacteristics>
                  <rate>
                    <timebase>${fps}</timebase>
                    <ntsc>FALSE</ntsc>
                  </rate>
                  <width>1920</width>
                  <height>1080</height>
                  <anamorphic>FALSE</anamorphic>
                  <pixelaspectratio>square</pixelaspectratio>
                  <fielddominance>none</fielddominance>
                </samplecharacteristics>
              </video>
              <audio>
                <samplecharacteristics>
                  <depth>16</depth>
                  <samplerate>48000</samplerate>
                </samplecharacteristics>
              </audio>
            </media>
          </file>
          <sourcetrack>
            <mediatype>video</mediatype>
            <trackindex>1</trackindex>
          </sourcetrack>
        </clipitem>`;
    }).join('\n');
    
    tracks.push(`      <track>
${clipItems}
      </track>`);
  });
  
  return tracks.join('\n');
}

/**
 * Generates audio tracks XML with relative paths to Media folder
 */
function generateAudioTracksXML(allClips: Array<{ item: TimelineItem; id: string; trackIndex: number }>, fps: number, filenameMap: Map<string, string>): string {
  if (allClips.length === 0) {
    return '<track></track>';
  }
  
  const audioClips = allClips.map(({ item, id }) => {
    const startFrame = Math.round(item.startTime);
    const endFrame = Math.round(item.startTime + item.duration);
    const durationFrames = Math.round(item.duration);
    
    const sourceInFrame = item.properties?.originalStartTime 
      ? Math.round(item.properties.originalStartTime * fps)
      : 0;
    
    const sourceOutFrame = item.properties?.originalEndTime
      ? Math.round(item.properties.originalEndTime * fps)
      : durationFrames;
    
    const filename = filenameMap.get(item.src!);
    const relativePath = `Media/${filename}`;
    
    return `        <clipitem id="${id}-audio">
          <name>${escapeXML(item.name)}</name>
          <duration>${durationFrames}</duration>
          <rate>
            <timebase>${fps}</timebase>
            <ntsc>FALSE</ntsc>
          </rate>
          <start>${startFrame}</start>
          <end>${endFrame}</end>
          <in>${sourceInFrame}</in>
          <out>${sourceOutFrame}</out>
          <file id="file-${id}">
            <name>${escapeXML(filename || item.name)}</name>
            <pathurl>${escapeXML(relativePath)}</pathurl>
            <rate>
              <timebase>${fps}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <duration>${durationFrames}</duration>
          </file>
          <sourcetrack>
            <mediatype>audio</mediatype>
            <trackindex>1</trackindex>
          </sourcetrack>
        </clipitem>`;
  }).join('\n');
  
  return `      <track>
${audioClips}
      </track>
      <track></track>`;
}

/**
 * Escapes XML special characters
 */
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates README content with instructions
 */
function generateReadmeContent(projectName: string): string {
  return `DaVinci Resolve Timeline Export - ${projectName}
==============================================

This package contains everything you need to import your timeline into DaVinci Resolve.

FOLDER STRUCTURE:
- timeline.xml: The timeline file compatible with DaVinci Resolve
- Media/: All video and audio files referenced in the timeline
- README.txt: This instruction file

IMPORT INSTRUCTIONS:
1. Unzip this entire folder to your desired location
2. Open DaVinci Resolve
3. Go to: File > Import Timeline > Import AAF, EDL, XML
4. Select the "timeline.xml" file from this folder
5. All media files should link automatically!

TROUBLESHOOTING:
- If media doesn't link: Make sure the entire folder structure is intact
- If you get errors: Check that all files in the Media folder are present
- For best results: Keep the unzipped folder structure exactly as provided

TECHNICAL DETAILS:
- Format: Final Cut Pro 7 XML (most compatible with DaVinci Resolve)
- Media paths: Relative to the Media subfolder
- Frame rate: As specified in your original timeline
- Resolution: 1920x1080 (adjust in DaVinci Resolve if needed)

Questions? Check the DaVinci Resolve documentation or support forums.

Generated by: Remotion Timeline Editor
Export Date: ${new Date().toISOString()}
`;
}