// workers/ocrWorker.js
const { ocrQueue, translateQueue } = require('../queues');
const ocr = require('../utils/ocr');
const fs = require('fs').promises;

ocrQueue.process(3, async (job) => {
  const { imagePath, jobId } = job.data;

  try {
    // Chuyển đổi ảnh thành text
    const text = await ocr.image2text(imagePath);

    // Xóa tệp ảnh sau khi xử lý
    await fs.unlink(imagePath);
    
    // Thêm công việc vào hàng đợi dịch
    await translateQueue.add({ text, jobId }, { jobId });
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  }
});
