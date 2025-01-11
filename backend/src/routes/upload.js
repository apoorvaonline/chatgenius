import express from 'express';
import multer from 'multer';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client from '../config/s3.js';
import auth from './auth.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and documents
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
}).single('file');

router.post('/', auth, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const fileKey = `${Date.now()}-${req.file.originalname}`;
      
      // Upload file
      const uploadCommand = new PutObjectCommand({
        Bucket: 'fv-chatgenius-files',
        Key: fileKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      });

      await s3Client.send(uploadCommand);

      // Generate pre-signed URL (valid for 1 hour)
      const getObjectCommand = new GetObjectCommand({
        Bucket: 'fv-chatgenius-files',
        Key: fileKey,
      });
      
      const signedUrl = await getSignedUrl(s3Client, getObjectCommand, { 
        expiresIn: 3600 // URL expires in 1 hour
      });
      
      res.json({
        url: signedUrl,
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        size: req.file.size,
        key: fileKey // Store the key for future URL generation
      });
    } catch (error) {
      console.error('S3 upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });
});

// Endpoint to get a new signed URL for an existing file
router.get('/url/:key', auth, async (req, res) => {
  try {
    const command = new GetObjectCommand({
      Bucket: 'fv-chatgenius-files',
      Key: req.params.key,
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 3600 
    });
    
    res.json({ url: signedUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate URL' });
  }
});

export default router; 