// workers/pdfWorker.js
const { pdfQueue } = require('../queues');
const { createPDF } = require('../utils/pdf');

pdfQueue.process(10, async (job) => {
  const { text, jobId } = job.data;

  try {
    // Tạo đường dẫn cho file PDF
    const pdfFilePath = `output/${jobId}.pdf`;

    // Tạo PDF
    await createPDF(text, pdfFilePath);

    // Công việc hoàn thành
    console.log(`PDF generated at ${pdfFilePath}`);
  } catch (error) {
    console.error('PDF Error:', error);
    throw error;
  }
});
