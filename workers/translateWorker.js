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
    console.error(`Translate Error for JobId ${jobId}:`, error);
    // Thử lại công việc nếu có lỗi 
    if (job.attemptsMade < 2) {
      throw error;
    } else {
      job.moveToFailed({ message: 'Translate failed after 2 attempts' }, true);
    }
  }
});