import http from 'k6/http';
import { sleep, check } from 'k6';
import { file } from 'k6/http'; // Import hàm file từ k6/http

export let options = {
vus: 50, // Số lượng virtual users
duration: '10s', // Thời gian test
};

// Mở file trong giai đoạn khởi tạo (init stage)
const uploadedFile = open('example3.png', 'b'); // Đọc file ở giai đoạn init

export default function () {
// Test upload file
const url = 'http://localhost:3000/upload'; // Thay đổi URL nếu cần
const payload = {
images: file(uploadedFile, 'example0.png'), // Sử dụng file đã mở ở init stage
};

// Gửi request POST với dữ liệu file
const res = http.post(url, payload);

// Kiểm tra phản hồi từ server
check(res, {
    'Upload successful': (r) => r.status === 200, // Kiểm tra status code của phản hồi
});

// Nếu upload thành công, xử lý các kết quả khác
if (res.status === 200) {
    const jobIds = JSON.parse(res.body).jobIds; // Giả định server trả về jobIds

    // Kiểm tra trạng thái của từng jobId
    jobIds.forEach((jobId) => {
        let status = '';
        let retries = 0;
        const maxRetries = 5;  // Số lần thử lại

        while (status !== 'completed' && status !== 'failed' && retries < maxRetries) {
            // Gửi request để kiểm tra trạng thái của job
            const statusRes = http.get(`http://localhost:3000/status/${jobId}`);

            check(statusRes, {
                'Status check successful': (r) => r.status === 200, // Kiểm tra trạng thái trả về
            });

            if (statusRes.status === 200) {
                status = JSON.parse(statusRes.body).status;  // Giả định phản hồi có trường `status`
            }

            // Nếu trạng thái là "processing", đợi một lúc rồi thử lại
            if (status === 'processing') {
                sleep(1); // Đợi 1 giây trước khi thử lại
                retries++;
            }
        }

        // Xử lý khi job hoàn thành, thất bại hoặc hết số lần thử
        if (status === 'completed') {
            console.log(`Job ${jobId} completed`);
        } else if (status === 'failed') {
            console.error(`Job ${jobId} failed`);
        } else {
            console.warn(`Job ${jobId} timed out`);
        }
    });
}

// Đợi 1 giây trước khi gửi yêu cầu tiếp theo
sleep(1);
}