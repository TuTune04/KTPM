module.exports = {
  cdn: {
    baseUrl: process.env.CDN_BASE_URL || 'https://ktpm.s3-ap-southeast-1.amazonaws.com',
    region: process.env.CDN_REGION || 'ap-southeast-1',
    bucket: process.env.CDN_BUCKET || 'ktpm',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  }
}; 