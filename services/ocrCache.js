const CacheService = require('./cache');

class OCRCacheService {
  constructor() {
    this.cache = CacheService;
    this.TTL = 600; // 10 minutes
  }

  generateKey(imagePath) {
    return `ocr:${imagePath}`;
  }

  async getOCRResult(imagePath) {
    const key = this.generateKey(imagePath);
    return await this.cache.get(key);
  }

  async setOCRResult(imagePath, text) {
    const key = this.generateKey(imagePath);
    return await this.cache.set(key, {
      text,
      processedAt: new Date().toISOString()
    }, this.TTL);
  }
}

module.exports = new OCRCacheService(); 