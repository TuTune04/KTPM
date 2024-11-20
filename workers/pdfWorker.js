// workers/pdfWorker.js
const { pdfQueue } = require('../queues');
const { createPDF } = require('../utils/pdf');
const path = require('path');
const fs = require('fs').promises;

pdfQueue.process(10, async (job) => { 
  const { text, jobId } = job.data;

  try {
    // Tạo đường dẫn cho file PDF
    const outputDir = path.resolve(__dirname, '..', 'output');
    const pdfFilePath = path.join(outputDir, `${jobId}.pdf`);

    // Đảm bảo thư mục output tồn tại
    await fs.mkdir(outputDir, { recursive: true });

    // Tạo PDF
    await createPDF(text, pdfFilePath);

    console.log(`PDF generated at ${pdfFilePath}`);
  } catch (error) {
    console.error(`PDF Worker Error for JobId ${jobId}:`, error);
    throw error;
  }
});