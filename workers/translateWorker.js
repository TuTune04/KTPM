// workers/translateWorker.js
const { translateQueue, pdfQueue } = require('../queues');
const { translate } = require('../utils/translate');

translateQueue.process(3, async (job) => {
  const { text, jobId } = job.data;

  try {
    // Dịch văn bản
    const translatedText = await translate(text);

    // Thêm công việc vào hàng đợi PDF
    await pdfQueue.add({ text: translatedText, jobId }, { jobId });
  } catch (error) {
    console.error('Translate Error:', error);
    throw error;
  }
});
