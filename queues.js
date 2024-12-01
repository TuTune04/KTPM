const Queue = require('bull');
const config = require('./config');

const redisConfig = {
  host: config.redis.host,
  port: config.redis.port
};

const ocrQueue = new Queue('ocr', { redis: redisConfig });
const translateQueue = new Queue('translate', { redis: redisConfig });
const pdfQueue = new Queue('pdf', { redis: redisConfig });

module.exports = {
  ocrQueue,
  translateQueue,
  pdfQueue,
};