const Queue = require('bull');
const redisConfig = {
  host: '192.168.2.131',
  port: 6379,
};
const ocrQueue = new Queue('ocr', { redis: redisConfig });
const translateQueue = new Queue('translate', { redis: redisConfig });
const pdfQueue = new Queue('pdf', { redis: redisConfig });
module.exports = {
  ocrQueue,
  translateQueue,
  pdfQueue,
};