// utils/pdf.js
const PDFDocument = require('pdfkit');
const fs = require('fs');

function createPDF(text, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    doc.font('font/Roboto-Regular.ttf')
      .fontSize(14)
      .text(text, 100, 100);
    doc.end();
    stream.on('finish', () => {
      resolve(outputPath);
    });
    stream.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = {
  createPDF,
};
