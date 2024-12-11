// workers/ocrWorker.js
const { ocrQueue, translateQueue } = require('../queues');
const ocr = require('../utils/ocr');
const fs = require('fs').promises;
const sharp = require('sharp');
const ocrCache = require('../services/ocrCache');
const crypto = require('crypto');

async function generateImageHash(imagePath) {
  const imageBuffer = await fs.readFile(imagePath);
  return crypto.createHash('md5').update(imageBuffer).digest('hex');
}

ocrQueue.process(3, async (job) => {
  const { imagePath, jobId } = job.data;

  try {
    // Tạo hash của ảnh để làm key cache
    const imageHash = await generateImageHash(imagePath);
    
    // Kiểm tra cache
    const cachedResult = await ocrCache.getOCRResult(imageHash);
    if (cachedResult) {
      console.log(`[OCR Worker] Using cached result for job ${jobId}`);
      // Xóa file ảnh gốc vì không cần xử lý
      await fs.unlink(imagePath);
      // Thêm vào queue translate với kết quả từ cache
      await translateQueue.add({ 
        text: cachedResult.text, 
        jobId 
      }, { jobId });
      return cachedResult;
    }

    // Xử lý ảnh nếu không có trong cache
    const processedImagePath = `${imagePath}-processed.png`;
    await sharp(imagePath)
      .resize(1024) // Thay đổi kích thước ảnh chiều rộng 1024px
      .rotate() // Định hướng lại ảnh dựa trên metadata
      // .composite([{ input: 'watermark.png', gravity: 'southeast' }])
      .toFile(processedImagePath);

    // Chuyển đổi ảnh thành text
    const text = await ocr.image2text(processedImagePath);

    // Lưu kết quả vào cache
    await ocrCache.setOCRResult(imageHash, text);

    // Xóa các file tạm
    await fs.unlink(imagePath);
    await fs.unlink(processedImagePath);

    // Thêm vào queue translate
    await translateQueue.add({ text, jobId }, { jobId });

    return { text };
  } catch (error) {
    console.error('OCR Error:', error);
    if (job.attemptsMade < 2) throw error;
  }
});
