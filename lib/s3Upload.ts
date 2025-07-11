import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from './s3Client';
import { multipartUploadToS3 } from './s3MultipartUpload';

interface UploadToS3Props {
  file: File;
  fileName: string;
  bucketName: string;
  onProgress?: (progress: number) => void;
}

// Use multipart upload for files larger than 100MB
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB

export const uploadToS3 = async ({ file, fileName, bucketName, onProgress }: UploadToS3Props): Promise<string> => {
  console.log('Starting S3 upload:', { 
    fileName, 
    bucketName,
    fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    method: file.size > MULTIPART_THRESHOLD ? 'multipart' : 'single'
  });

  // Use multipart upload for large files
  if (file.size > MULTIPART_THRESHOLD) {
    return multipartUploadToS3({ file, fileName, bucketName, onProgress });
  }

  // Use regular upload for smaller files
  try {
    const arrayBuffer = await file.arrayBuffer();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type,
    });

    await s3Client.send(command);
    console.log('S3 upload complete:', fileName);
    if (onProgress) onProgress(100);
    return `https://${bucketName}.s3.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
};

export const deleteFromS3 = async (fileName: string, bucketName: string): Promise<void> => {
  console.log('Starting S3 delete:', { fileName, bucketName });

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: fileName,
  });

  try {
    await s3Client.send(command);
    console.log('S3 delete complete:', fileName);
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw error;
  }
};
