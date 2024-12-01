// index.js
require('dotenv').config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require('fs');
const fsPromises = require('fs').promises;
const config = require('./config');
const { ocrQueue, pdfQueue } = require("./queues");
const cacheService = require('./services/cache');
const cdnService = require('./services/cdn');

const app = express();
const port = 3000;

// Hàm kiểm tra token đơn giản
function validateToken(token) {
  return true; // Tạm thời return true để test
}

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

app.get("/output/:jobId", async (req, res) => {
  const { jobId } = req.params;
  
  try {
    const cacheKey = `pdf:${jobId}`;
    const cachedResult = await cacheService.get(cacheKey);

    if (cachedResult && cachedResult.pdfUrl) {
      return res.redirect(cachedResult.pdfUrl);
    }

    // Kiểm tra file có tồn tại không
    const pdfPath = path.join(__dirname, 'output', `${jobId}.pdf`);
    try {
      await fsPromises.access(pdfPath);
      // Nếu file tồn tại, tạo URL CDN
      const cdnUrl = cdnService.getPublicUrl(`pdfs/${jobId}.pdf`);
      
      // Cache kết quả
      await cacheService.set(cacheKey, { pdfUrl: cdnUrl }, 24 * 3600);
      
      return res.redirect(cdnUrl);
    } catch (err) {
      return res.status(404).send('File không tồn tại');
    }
  } catch (error) {
    console.error('Output Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint để kiểm tra trạng thái của job
app.get("/status/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const cacheKey = `pdf:${jobId}`;

  try {
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const job = await pdfQueue.getJob(jobId);
    if (!job) {
      return res.json({ status: 'not_found' });
    }

    const state = await job.getState();
    const result = {
      status: state,
      ...(state === 'completed' && {
        downloadUrl: cdnService.getPublicUrl(`pdfs/${jobId}.pdf`)
      })
    };

    if (state === 'completed') {
      await cacheService.set(cacheKey, result, 24 * 3600);
    }

    res.json(result);
  } catch (error) {
    console.error('Status Check Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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

// Thêm vào đầu file sau các require
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}