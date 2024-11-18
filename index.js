// index.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { ocrQueue, pdfQueue } = require("./queues");

const app = express();
const port = 3000;

// Cấu hình multer để lưu tệp tải lên
const upload = multer({ dest: 'uploads/' });

// Sử dụng middleware để phục vụ các file tĩnh trong thư mục "output"
app.use('/output', express.static(path.join(__dirname, 'output')));

// Phục vụ tệp HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Endpoint để upload ảnh và tạo job
app.post("/upload", upload.array("images"), async (req, res) => {
  try {
    const jobIds = [];

    // Lặp qua các file đã upload
    for (const file of req.files) {
      const imagePath = file.path;
      const jobId = file.filename;

      // Thêm công việc vào hàng đợi OCR
      await ocrQueue.add({ imagePath, jobId }, { jobId });
      jobIds.push(jobId);
    }

    // Trả về danh sách job IDs cho người dùng
    res.json({ jobIds });
  } catch (e) {
    console.error(e);
    res.status(500).send("Đã xảy ra lỗi trong quá trình xử lý.");
  }
});

// Endpoint để kiểm tra trạng thái của job
app.get("/status/:jobId", async (req, res) => {
  const { jobId } = req.params;

  // Kiểm tra trạng thái trong hàng đợi PDF
  const job = await pdfQueue.getJob(jobId);

  if (job) {
    const state = await job.getState();

    if (state === 'completed') {
      // File PDF đã sẵn sàng
      res.json({ status: 'completed', downloadUrl: `/output/${jobId}.pdf` });
    } else if (state === 'failed') {
      res.json({ status: 'failed' });
    } else {
      res.json({ status: 'processing' });
    }
  } else {
    res.json({ status: 'processing' });
  }
});

// Bắt đầu server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);

  // Khởi động các workers
  require('./workers/ocrWorker');
  require('./workers/translateWorker');
  require('./workers/pdfWorker');
});
