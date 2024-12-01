// workers/pdfWorker.js
const { pdfQueue } = require('../queues');
const { createPDF } = require('../utils/pdf');
const cacheService = require('../services/cache');
const cdnService = require('../services/cdn');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

pdfQueue.process(10, async (job) => { 
  const { text, jobId } = job.data;
  const cacheKey = `pdf:${jobId}`;
  const tempDir = os.tmpdir(); // Sử dụng thư mục tạm của hệ thống
  const tempPdfPath = path.join(tempDir, `${jobId}.pdf`);

  try {
    // Kiểm tra cache
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      console.log(`[PDF Worker] Sử dụng cache cho job ${jobId}`);
      return cachedResult;
    }


    // Tạo PDF trong thư mục tạm
    await createPDF(text, tempPdfPath);

    // Upload lên CDN
    const cdnKey = `pdfs/${jobId}.pdf`;
    const cdnUrl = await cdnService.uploadFile(tempPdfPath, cdnKey);

    // Xóa file tạm
    await fs.unlink(tempPdfPath);

    // Cache kết quả
    const result = {
      status: 'completed',
      pdfUrl: cdnUrl,
      message: 'PDF đã được tạo',
      generatedAt: new Date().toISOString()
    };
    
    await cacheService.set(cacheKey, result, 24 * 3600);
    
    return result;
  } catch (error) {
    // Đảm bảo xóa file tạm nếu có lỗi
    try {
      await fs.unlink(tempPdfPath);
    } catch (unlinkError) {
      console.error(`[PDF Worker] Không thể xóa file tạm: ${unlinkError.message}`);
    }
    console.error(`[PDF Worker Error] JobId ${jobId}:`, error);
    throw error;
  }
});