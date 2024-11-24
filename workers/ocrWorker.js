// workers/ocrWorker.js
const { ocrQueue, translateQueue } = require('../queues');
const ocr = require('../utils/ocr');
const fs = require('fs').promises;
const sharp = require('sharp');

ocrQueue.process(3, async (job) => {
  const { imagePath, jobId } = job.data;

  try {
    // Đọc và xử lý ảnh
    const processedImagePath = `${imagePath}-processed.png`;
    await sharp(imagePath)
      .resize(1024) // Thay đổi kích thước ảnh chiều rộng 1024px
      .rotate() // Định hướng lại ảnh dựa trên metadata
      // .composite([{ input: 'watermark.png', gravity: 'southeast' }])
      .toFile(processedImagePath);

    // Chuyển đổi ảnh đã xử lý thành text
    const text = await ocr.image2text(processedImagePath);

    // Xóa các tệp ảnh sau khi xử lý
    await fs.unlink(imagePath);
    await fs.unlink(processedImagePath);

    // Thêm công việc vào hàng đợi dịch
    await translateQueue.add({ text, jobId }, { jobId });
  } catch (error) {
    console.error('OCR Error:', error);
    // Thử lại công việc nếu có lỗi
    if (job.attemptsMade < 2) throw error;
  }
});
