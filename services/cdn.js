require('dotenv').config();
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const config = require('../config/cdn');
const fs = require('fs').promises;

class CDNService {
  constructor() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not configured in .env file');
    }
    
    this.s3Client = new S3Client({
      region: process.env.CDN_REGION || 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }

  async uploadFile(filePath, key) {
    try {
      const fileContent = await fs.readFile(filePath);
      const params = {
        Bucket: config.cdn.bucket,
        Key: key,
        Body: fileContent,
        ContentType: 'application/pdf'
      };

      const command = new PutObjectCommand(params);
      await this.s3Client.send(command);
      
      // Tạo signed URL
      return this.getSignedUrl(key);
    } catch (error) {
      console.error('CDN Upload Error:', error);
      throw error;
    }
  }

  async getSignedUrl(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: config.cdn.bucket,
        Key: key,
      });
      
      // URL có hiệu lực trong 1 giờ (3600 giây)
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      return signedUrl;
    } catch (error) {
      console.error('Signed URL Error:', error);
      throw error;
    }
  }

  async getPublicUrl(key) {
    return this.getSignedUrl(key);
  }
}

module.exports = new CDNService(); 