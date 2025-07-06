export const GEMINI_FILE_SIZE_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB in bytes

export function needsConversion(file: File): boolean {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  // Always convert these formats (they're usually huge)
  const alwaysConvert = ['mov', 'avi', 'mkv', 'wmv', 'flv', 'webm'];
  if (alwaysConvert.includes(fileExtension || '')) {
    return true;
  }
  
  // For MP4, only convert if over 2GB
  if (fileExtension === 'mp4' && file.size > GEMINI_FILE_SIZE_LIMIT) {
    return true;
  }
  
  // Any file over 2GB needs conversion
  return file.size > GEMINI_FILE_SIZE_LIMIT;
}

export function estimateConvertedSize(file: File): number {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  // Rough compression ratios based on format
  const compressionRatios: Record<string, number> = {
    'mov': 0.15,  // MOV to MP4 usually 85% smaller
    'avi': 0.20,  // AVI to MP4 usually 80% smaller
    'mkv': 0.25,  // MKV to MP4 usually 75% smaller
    'wmv': 0.30,  // WMV to MP4 usually 70% smaller
    'mp4': 0.70,  // MP4 re-encoding usually 30% smaller
  };
  
  const ratio = compressionRatios[fileExtension || ''] || 0.5;
  return file.size * ratio;
}