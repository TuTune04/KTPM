// index.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const { image2text } = require('./utils/ocr');
const { createPDF } = require('./utils/pdf');
const { translate } = require('./utils/translate');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
app.use('/output', express.static(path.join(__dirname, 'output')));

// Thiết lập giới hạn tốc độ cho mỗi IP (ví dụ: tối đa 5 yêu cầu mỗi 10 phút)
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 phút
  max: 5, // giới hạn mỗi IP tối đa 5 yêu cầu
  message: 'Bạn đã đạt đến giới hạn số lần yêu cầu. Vui lòng thử lại sau.',
});

// Thiết lập Multer với các ràng buộc về loại tệp và kích thước
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Đặt tên file duy nhất
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép định dạng JPEG, JPG và PNG.'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn kích thước file tối đa 5MB
  // fileFilter: fileFilter,
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Sử dụng middleware giới hạn tốc độ cho route /upload
// app.post('/upload', uploadLimiter, upload.array('images', 10), async (req, res) => {
app.post('/upload', upload.array('images', 10), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).send('Không có tệp nào được tải lên.');
    }

    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)){
      fs.mkdirSync(outputDir);
    }

    const pdfPaths = [];

    for (const file of files) {
      const imagePath = file.path;
      const recognizedText = await image2text(imagePath);
      const translatedText = await translate(recognizedText);
      const pdfFilename = `${Date.now()}_${file.originalname}.pdf`;
      const pdfOutputPath = `output/${pdfFilename}`;

      await createPDF(translatedText, pdfOutputPath);
      pdfPaths.push(pdfFilename);

      fs.unlinkSync(imagePath); // Xóa file ảnh sau khi xử lý
    }

    // Trả về danh sách các URL tải xuống PDF
    const downloadUrls = pdfPaths.map(filename => `/output/${filename}`);

    res.json({ downloadUrls });

  } catch (error) {
    console.error(error);
    if (error instanceof multer.MulterError) {
      // Xử lý lỗi Multer
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).send('Kích thước tệp quá lớn. Tối đa 5MB mỗi tệp.');
      } else {
        res.status(400).send(error.message);
      }
    } else {
      res.status(500).send('Có lỗi xảy ra trong quá trình xử lý.');
    }
  }
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
