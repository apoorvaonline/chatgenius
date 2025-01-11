import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'us-east-2',
  // AWS credentials are automatically loaded from aws configure
});

export default s3Client; 