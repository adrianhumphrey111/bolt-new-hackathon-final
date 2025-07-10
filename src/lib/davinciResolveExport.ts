import { TimelineState, TimelineItem } from '../../types/timeline';
import JSZip from 'jszip';

/**
 * Creates a complete ZIP export package for DaVinci Resolve
 * Contains XML file and all media files in proper folder structure
 * 
 * @param timelineState - The timeline state to export
 * @param projectName - Name for the project
 * @returns Promise that resolves when ZIP is downloaded
 */
export async function exportToDaVinciResolveZIP(timelineState: TimelineState, projectName: string = 'Timeline Export'): Promise<void> {
  try {
    // Create ZIP instance
    const zip = new JSZip();
    
    // Collect all unique media files
    const mediaFiles = collectMediaFiles(timelineState);
    
    // Create Media folder in ZIP
    const mediaFolder = zip.folder('Media');
    if (!mediaFolder) {
      throw new Error('Failed to create Media folder in ZIP');
    }
    
    // Download and add media files to ZIP
    const mediaDownloadPromises = mediaFiles.map(async (mediaFile) => {
      try {
        const response = await fetch(mediaFile.url);
        if (!response.ok) {
          throw new Error(`Failed to download ${mediaFile.filename}: ${response.statusText}`);
        }
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        mediaFolder.file(mediaFile.filename, arrayBuffer);
        return mediaFile;
      } catch (error) {
        console.error(`Error downloading ${mediaFile.filename}:`, error);
        // Continue with other files even if one fails
        return null;
      }
    });
    
    // Wait for all media downloads to complete
    const downloadedMedia = await Promise.all(mediaDownloadPromises);
    const successfulDownloads = downloadedMedia.filter(media => media !== null);
    
    // Generate XML with relative paths to Media folder
    const xmlContent = generateDaVinciResolveXML(timelineState, projectName, successfulDownloads);
    
    // Add XML file to ZIP root
    zip.file('timeline.xml', xmlContent);
    
    // Add README file with instructions
    const readme = generateReadmeContent(projectName);
    zip.file('README.txt', readme);
    
    // Generate and download ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadZipFile(zipBlob, `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_DaVinci_Export.zip`);
    
  } catch (error) {
    console.error('Error creating DaVinci Resolve export:', error);
    throw error;
  }
}

/**
 * Converts a timeline state to DaVinci Resolve compatible Final Cut Pro 7 XML format
 * 
 * @param timelineState - The timeline state to export
 * @param projectName - Name for the project
 * @returns XML string compatible with DaVinci Resolve import
 */
export function exportToDaVinciResolveXML(timelineState: TimelineState, projectName: string = 'Timeline Export'): string {
  const { tracks, fps, totalDuration } = timelineState;
  
  // Convert frames to timecode format for Final Cut Pro 7 XML
  const totalDurationFrames = Math.round(totalDuration);
  const totalDurationTimecode = framesToTimecode(totalDurationFrames, fps);
  
  // Generate unique IDs for clips
  let clipIdCounter = 1;
  
  // Collect all video clips from all tracks
  const allClips: Array<{ item: TimelineItem; id: string; trackIndex: number }> = [];
  
  tracks.forEach((track, trackIndex) => {
    track.items.forEach(item => {
      if (item.type === 'video' && item.src) {
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
  
  // Generate video tracks XML
  const videoTracksXML = generateVideoTracksXML(allClips, fps);
  
  // Generate audio tracks XML (placeholder for now)
  const audioTracksXML = generateAudioTracksXML(allClips, fps);
  
  // Build complete Final Cut Pro 7 XML
  const fcp7xml = `<?xml version="1.0" encoding="UTF-8"?>
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
  
  return fcp7xml;
}

/**
 * Generates video tracks XML for Final Cut Pro 7 format
 */
function generateVideoTracksXML(allClips: Array<{ item: TimelineItem; id: string; trackIndex: number }>, fps: number): string {
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
      
      // Handle cut segments with original timecode
      const sourceInFrame = item.properties?.originalStartTime 
        ? Math.round(item.properties.originalStartTime * fps)
        : 0;
      
      const sourceOutFrame = item.properties?.originalEndTime
        ? Math.round(item.properties.originalEndTime * fps)
        : durationFrames;
      
      // Convert file path for proper XML format
      const filePath = item.src?.startsWith('http') ? item.src : `file://${item.src}`;
      
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
            <name>${escapeXML(item.name)}</name>
            <pathurl>${escapeXML(filePath)}</pathurl>
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
 * Generates audio tracks XML for Final Cut Pro 7 format
 */
function generateAudioTracksXML(allClips: Array<{ item: TimelineItem; id: string; trackIndex: number }>, fps: number): string {
  if (allClips.length === 0) {
    return '<track></track>';
  }
  
  // For now, create a simple audio track that mirrors the video
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
    
    const filePath = item.src?.startsWith('http') ? item.src : `file://${item.src}`;
    
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
            <name>${escapeXML(item.name)}</name>
            <pathurl>${escapeXML(filePath)}</pathurl>
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
 * Converts frames to timecode format (HH:MM:SS:FF)
 */
function framesToTimecode(frames: number, fps: number): string {
  const totalSeconds = Math.floor(frames / fps);
  const remainingFrames = frames % fps;
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${remainingFrames.toString().padStart(2, '0')}`;
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
 * Downloads the XML as a file
 */
export function downloadXMLFile(xmlContent: string, filename: string = 'timeline_export_davinci.xml'): void {
  const blob = new Blob([xmlContent], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Helper functions for ZIP export
 */

interface MediaFile {
  url: string;
  filename: string;
  originalItem: TimelineItem;
}

/**
 * Collects all unique media files from the timeline
 */
function collectMediaFiles(timelineState: TimelineState): MediaFile[] {
  const { tracks } = timelineState;
  const mediaMap = new Map<string, MediaFile>();
  
  tracks.forEach(track => {
    track.items.forEach(item => {
      if (item.type === 'video' && item.src) {
        const url = item.src;
        if (!mediaMap.has(url)) {
          // Extract filename from URL or use item name
          const filename = extractFilenameFromUrl(url, item.name);
          mediaMap.set(url, {
            url,
            filename,
            originalItem: item
          });
        }
      }
    });
  });
  
  return Array.from(mediaMap.values());
}

/**
 * Extracts filename from URL or creates one from item name
 */
function extractFilenameFromUrl(url: string, itemName: string): string {
  try {
    // Try to extract filename from URL
    const urlPath = new URL(url).pathname;
    const segments = urlPath.split('/');
    const filename = segments[segments.length - 1];
    
    if (filename && filename.includes('.')) {
      return filename;
    }
  } catch (error) {
    // If URL parsing fails, create filename from item name
  }
  
  // Fallback: create filename from item name
  const cleanName = itemName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${cleanName}.mp4`; // Default to .mp4 extension
}

/**
 * Generates the XML content with relative paths to Media folder
 */
function generateDaVinciResolveXML(timelineState: TimelineState, projectName: string, downloadedMedia: MediaFile[]): string {
  const { tracks, fps, totalDuration } = timelineState;
  
  // Convert frames to timecode format for Final Cut Pro 7 XML
  const totalDurationFrames = Math.round(totalDuration);
  
  // Create filename mapping for downloaded media
  const filenameMap = new Map<string, string>();
  downloadedMedia.forEach(media => {
    if (media) {
      filenameMap.set(media.url, media.filename);
    }
  });
  
  // Generate unique IDs for clips
  let clipIdCounter = 1;
  
  // Collect all video clips from all tracks
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
  
  // Generate video tracks XML with relative paths
  const videoTracksXML = generateVideoTracksXMLWithRelativePaths(allClips, fps, filenameMap);
  
  // Generate audio tracks XML with relative paths
  const audioTracksXML = generateAudioTracksXMLWithRelativePaths(allClips, fps, filenameMap);
  
  // Build complete Final Cut Pro 7 XML
  const fcp7xml = `<?xml version="1.0" encoding="UTF-8"?>
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
  
  return fcp7xml;
}

/**
 * Generates video tracks XML with relative paths to Media folder
 */
function generateVideoTracksXMLWithRelativePaths(allClips: Array<{ item: TimelineItem; id: string; trackIndex: number }>, fps: number, filenameMap: Map<string, string>): string {
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
      
      // Handle cut segments with original timecode
      const sourceInFrame = item.properties?.originalStartTime 
        ? Math.round(item.properties.originalStartTime * fps)
        : 0;
      
      const sourceOutFrame = item.properties?.originalEndTime
        ? Math.round(item.properties.originalEndTime * fps)
        : durationFrames;
      
      // Use relative path to Media folder
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
function generateAudioTracksXMLWithRelativePaths(allClips: Array<{ item: TimelineItem; id: string; trackIndex: number }>, fps: number, filenameMap: Map<string, string>): string {
  if (allClips.length === 0) {
    return '<track></track>';
  }
  
  // For now, create a simple audio track that mirrors the video
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
    
    // Use relative path to Media folder
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

/**
 * Downloads the ZIP file
 */
function downloadZipFile(zipBlob: Blob, filename: string): void {
  const url = URL.createObjectURL(zipBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}