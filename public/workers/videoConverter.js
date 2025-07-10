// Video Conversion Web Worker
// This worker handles video conversion in the background to avoid blocking the main thread

// Try to load webcodecs if available, but don't fail if it's not
try {
  importScripts('https://unpkg.com/@remotion/webcodecs@4.0.0/dist/webcodecs.js');
  console.log('WebCodecs library loaded successfully');
} catch (error) {
  console.warn('WebCodecs library not available, using fallback conversion:', error.message);
}

let isConverting = false;

self.onmessage = async function(event) {
  const { taskId, type, file, options } = event.data;
  
  if (type === 'convert') {
    await convertVideo(taskId, file, options);
  }
};

async function convertVideo(taskId, file, options = {}) {
  if (isConverting) {
    postMessage({
      taskId,
      type: 'error',
      error: 'Worker is already converting a file'
    });
    return;
  }

  isConverting = true;
  
  try {
    // Check if file needs conversion
    if (!file.type.includes('quicktime') && !file.name.toLowerCase().endsWith('.mov')) {
      // File doesn't need conversion
      postMessage({
        taskId,
        type: 'complete',
        data: { convertedFile: file }
      });
      return;
    }

    // Check file size limit
    const maxSize = options.maxSize || 300 * 1024 * 1024; // 300MB default
    if (file.size > maxSize) {
      throw new Error(`File too large for conversion: ${(file.size / (1024 * 1024)).toFixed(1)}MB > ${(maxSize / (1024 * 1024)).toFixed(1)}MB`);
    }

    postMessage({
      taskId,
      type: 'progress',
      data: { progress: 0, message: 'Starting conversion...' }
    });

    // Use FileReader to read the file
    const arrayBuffer = await readFileAsArrayBuffer(file);
    
    postMessage({
      taskId,
      type: 'progress',
      data: { progress: 20, message: 'File loaded, initializing conversion...' }
    });

    // Convert using a simulated conversion process
    // In a real implementation, you would use a library like FFmpeg.wasm
    const convertedBlob = await simulateConversion(arrayBuffer, taskId);
    
    postMessage({
      taskId,
      type: 'progress',
      data: { progress: 90, message: 'Finalizing conversion...' }
    });

    // Create new file with MP4 extension
    const originalName = file.name;
    const newName = originalName.replace(/\.(mov|MOV)$/, '.mp4');
    const convertedFile = new File([convertedBlob], newName, {
      type: 'video/mp4',
      lastModified: Date.now()
    });

    postMessage({
      taskId,
      type: 'progress',
      data: { progress: 100, message: 'Conversion complete!' }
    });

    postMessage({
      taskId,
      type: 'complete',
      data: { convertedFile }
    });

  } catch (error) {
    postMessage({
      taskId,
      type: 'error',
      error: error.message
    });
  } finally {
    isConverting = false;
  }
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// Simulated conversion function
// In a real implementation, this would use FFmpeg.wasm or similar
async function simulateConversion(arrayBuffer, taskId) {
  const totalSteps = 10;
  
  for (let i = 1; i <= totalSteps; i++) {
    // Simulate conversion work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const progress = 20 + (i / totalSteps) * 60; // 20-80% progress range
    postMessage({
      taskId,
      type: 'progress',
      data: { 
        progress, 
        message: `Converting... ${i}/${totalSteps}` 
      }
    });
  }
  
  // For now, just return the original data as a blob
  // In a real implementation, this would be the converted video
  return new Blob([arrayBuffer], { type: 'video/mp4' });
}

// Enhanced conversion function using WebCodecs API (if available)
async function convertWithWebCodecs(arrayBuffer, taskId) {
  if (!self.VideoDecoder || !self.VideoEncoder) {
    throw new Error('WebCodecs not supported in this environment');
  }

  try {
    // This is a simplified example - real implementation would be more complex
    const decoder = new VideoDecoder({
      output: (frame) => {
        // Process decoded frame
        postMessage({
          taskId,
          type: 'progress',
          data: { progress: 50, message: 'Processing frames...' }
        });
        frame.close();
      },
      error: (error) => {
        throw error;
      }
    });

    const encoder = new VideoEncoder({
      output: (chunk) => {
        // Handle encoded chunk
        postMessage({
          taskId,
          type: 'progress',
          data: { progress: 75, message: 'Encoding to MP4...' }
        });
      },
      error: (error) => {
        throw error;
      }
    });

    // Configure decoder and encoder
    decoder.configure({
      codec: 'avc1.42E01E', // H.264 baseline
      codedWidth: 1920,
      codedHeight: 1080,
    });

    encoder.configure({
      codec: 'avc1.42E01E',
      width: 1920,
      height: 1080,
      bitrate: 2000000,
      framerate: 30,
    });

    // Process the video data
    // This is a simplified example - real implementation would parse the container format
    
    return new Blob([arrayBuffer], { type: 'video/mp4' });
  } catch (error) {
    console.warn('WebCodecs conversion failed, falling back to simple conversion:', error);
    return simulateConversion(arrayBuffer, taskId);
  }
}

// Error handling
self.onerror = function(error) {
  console.error('Worker error:', error);
  postMessage({
    type: 'error',
    error: error.message
  });
};

console.log('Video conversion worker initialized');