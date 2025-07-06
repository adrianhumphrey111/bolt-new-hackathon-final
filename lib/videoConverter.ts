import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export async function convertToMp4(file: File, onProgress?: (progress: number) => void): Promise<File> {
  // Skip if already MP4
  if (file.type === 'video/mp4') {
    return file;
  }

  // Initialize FFmpeg if not already done
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    await ffmpeg.load();
  }

  const inputName = 'input' + file.name;
  const outputName = 'output.mp4';

  // Write file to FFmpeg filesystem
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Set up progress monitoring
  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) {
      onProgress(Math.round(progress * 100));
    }
  });

  // Convert to MP4 with good compression
  // CRF 23 is visually lossless, 28 is good quality with smaller size
  await ffmpeg.exec([
    '-i', inputName,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    outputName
  ]);

  // Read the output file
  const data = await ffmpeg.readFile(outputName);
  
  // Create a new File object
  const mp4File = new File(
    [data],
    file.name.replace(/\.[^/.]+$/, '.mp4'),
    { type: 'video/mp4' }
  );

  // Clean up
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  return mp4File;
}