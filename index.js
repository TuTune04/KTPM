// index.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { ocrQueue, pdfQueue } = require("./queues");

const app = express();
const port = 3000;

// Cấu hình multer để lưu tệp tải lên và kiểm tra định dạng
const upload = multer({
  dest: 'uploads/',
  limits: { 
    fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, 
    files: process.env.MAX_FILES || 5 
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Định dạng tệp không hợp lệ!'));
    }
  }
});
  

// Sử dụng middleware để phục vụ các file tĩnh trong thư mục "output"
app.use('/output', express.static(path.join(__dirname, 'output')));

// Phục vụ tệp HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Endpoint để upload ảnh và tạo job
app.post("/upload", upload.array("images"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("Không có file nào được tải lên.");
    }
    const jobIds = [];

    // Lặp qua các file đã upload
    for (const file of req.files) {
      const imagePath = file.path;
      const jobId = file.filename;

      // Kiểm tra lỗi thêm vào hàng đợi
      try {
        await ocrQueue.add({ imagePath, jobId }, { jobId });
        jobIds.push(jobId);
      } catch (queueError) {
        console.error("Queue Error:", queueError);
        return res.status(500).send("Đã xảy ra lỗi khi thêm công việc vào hàng đợi.");
      }
    }

    // Trả về danh sách job IDs cho người dùng
    res.json({ jobIds });
  } catch (e) {
    console.error("Upload Error:", e);
    res.status(500).send("Đã xảy ra lỗi khi tải lên file.");
  }
});

// Xử lý lỗi từ multer
app.use((err, req, res, next) => {
  if (err.message === 'Định dạng tệp không hợp lệ!') {
    return res.status(400).send(err.message);
  }
  next(err);
});

app.get("/output/:jobId", (req, res) => {
  const token = req.query.token; // Yêu cầu token để truy cập file
  if (!validateToken(token)) {
    return res.status(403).send("Không được phép.");
  }
  res.sendFile(path.join(__dirname, "output", `${req.params.jobId}.pdf`));
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