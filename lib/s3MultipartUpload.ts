import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { s3Client } from './s3Client';

interface MultipartUploadProps {
  file: File;
  fileName: string;
  bucketName: string;
  onProgress?: (progress: number) => void;
}

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks for faster upload
const MAX_CONCURRENT_UPLOADS = 3; // Upload 3 chunks simultaneously

export const multipartUploadToS3 = async ({
  file,
  fileName,
  bucketName,
  onProgress,
}: MultipartUploadProps): Promise<string> => {
  console.log('Starting multipart upload:', {
    fileName,
    bucketName,
    fileSize: `${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB`,
  });

  // For MOV/AVI files, recommend conversion
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  if (['mov', 'avi', 'mkv', 'wmv'].includes(fileExtension || '')) {
    console.warn(`Note: ${fileExtension?.toUpperCase()} files are much larger than MP4. Consider converting for faster uploads.`);
  }

  let uploadId: string | undefined;

  try {
    // Step 1: Initiate multipart upload
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: fileName,
      ContentType: file.type,
    });
    
    const { UploadId } = await s3Client.send(createCommand);
    uploadId = UploadId;
    
    if (!uploadId) {
      throw new Error('Failed to initiate multipart upload');
    }

    // Step 2: Upload parts in parallel
    const numParts = Math.ceil(file.size / CHUNK_SIZE);
    const uploadedParts: Array<{ ETag?: string; PartNumber: number }> = [];
    let uploadedBytes = 0;

    console.log(`Uploading ${numParts} parts in parallel (${MAX_CONCURRENT_UPLOADS} at a time)...`);

    // Create upload tasks
    const uploadTasks = [];
    for (let partNumber = 1; partNumber <= numParts; partNumber++) {
      const start = (partNumber - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      
      uploadTasks.push({
        partNumber,
        start,
        end,
        size: end - start
      });
    }

    // Upload parts in batches
    for (let i = 0; i < uploadTasks.length; i += MAX_CONCURRENT_UPLOADS) {
      const batch = uploadTasks.slice(i, i + MAX_CONCURRENT_UPLOADS);
      
      // Upload batch in parallel
      const batchPromises = batch.map(async (task) => {
        const chunk = file.slice(task.start, task.end);
        const arrayBuffer = await chunk.arrayBuffer();
        
        const uploadPartCommand = new UploadPartCommand({
          Bucket: bucketName,
          Key: fileName,
          UploadId: uploadId,
          PartNumber: task.partNumber,
          Body: new Uint8Array(arrayBuffer),
        });

        const { ETag } = await s3Client.send(uploadPartCommand);
        return { ETag, PartNumber: task.partNumber, size: task.size };
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Update progress
      for (const result of batchResults) {
        uploadedParts.push({ ETag: result.ETag, PartNumber: result.PartNumber });
        uploadedBytes += result.size;
        
        const progress = Math.round((uploadedBytes / file.size) * 100);
        console.log(`Part ${result.PartNumber}/${numParts} uploaded (${progress}%)`);
        
        if (onProgress) {
          onProgress(progress);
        }
      }
    }

    // Step 3: Complete multipart upload
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: fileName,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: uploadedParts,
      },
    });

    await s3Client.send(completeCommand);
    console.log('Multipart upload completed successfully');

    return `https://${bucketName}.s3.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error('Multipart upload error:', error);
    
    // Abort the multipart upload if it was initiated
    if (uploadId) {
      try {
        const abortCommand = new AbortMultipartUploadCommand({
          Bucket: bucketName,
          Key: fileName,
          UploadId: uploadId,
        });
        await s3Client.send(abortCommand);
        console.log('Aborted failed multipart upload');
      } catch (abortError) {
        console.error('Error aborting multipart upload:', abortError);
      }
    }
    
    throw error;
  }
};