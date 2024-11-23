// loadtest.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Đếm số lần upload thành công và thất bại
export let uploadSuccess = new Counter('upload_success');
export let uploadFailure = new Counter('upload_failure');

// Danh sách các tệp hình ảnh để upload (sử dụng đường dẫn tương đối)
const imageFiles = [
  './data/example1.png',
  './data/example2.png',
  './data/example3.png',
];

// Mở các tệp hình ảnh trong init stage
const images = imageFiles.map((file) => {
  return {
    content: open(file, 'b'), // Mở tệp ảnh dưới dạng binary
    filename: file.split('/').pop(), // Lấy tên tệp từ đường dẫn
  };
});

// Cấu hình URL endpoint
const BASE_URL = 'http://localhost:3000/upload';

export const options = {
  stages: [
    { duration: '10s', target: 20 }, // Tăng dần lên 20 VUs trong 10 giây
    { duration: '10s', target: 50 }, // Tăng dần lên 50 VUs trong 10 giây
    { duration: '5s', target: 0 },   // Giảm dần xuống 0 VUs trong 5 giây
  ],
  thresholds: {
    'upload_success': ['count>100'], // Yêu cầu ít nhất 100 upload thành công
    'upload_failure': ['count<10'],  // Yêu cầu ít hơn 10 upload thất bại
  },
  http: {
    timeout: '120s', // Tăng thời gian chờ lên 120 giây
  },
};

export default function () {
  // Chọn ngẫu nhiên số lượng ảnh để upload (1-3 ảnh)
  const numImages = Math.floor(Math.random() * images.length) + 1; // 1-3
  const selectedImages = [];

  for (let i = 0; i < numImages; i++) {
    const idx = Math.floor(Math.random() * images.length);
    selectedImages.push(images[idx]);
  }

  // Tạo formData với nhiều ảnh
  let formData = [];

  selectedImages.forEach((image) => {
    formData.push(['images', http.file(image.content, image.filename)]);
  });

  // Gửi yêu cầu POST đến endpoint /upload
  let res = http.post(BASE_URL, formData, {
    // Không cần đặt 'Content-Type': 'multipart/form-data' vì k6 sẽ tự động thêm boundary
  });

  // In ra mã trạng thái và nội dung phản hồi (chỉ nếu có)
  if (res.status !== 0) {
    console.log(`Status: ${res.status}`);
    if (res.body) {
      try {
        console.log(`Response Body: ${res.body.substring(0, 100)}`); // Hiển thị 100 ký tự đầu tiên
      } catch (e) {
        console.log('Unable to process response body.');
      }
    } else {
      console.log('Response Body is empty.');
    }
  } else {
    console.log('No response received.');
  }

  // Kiểm tra phản hồi từ server
  let success = check(res, {
    'status is 200': (r) => r.status === 200,
  });

  if (success) {
    uploadSuccess.add(1);
  } else {
    uploadFailure.add(1);
  }

  // Nghỉ 1 giây giữa các request
  sleep(1);
}