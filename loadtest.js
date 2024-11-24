import { check } from 'k6';
import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
    stages: [
        // Giai đoạn khởi động (Warm-up)
        { duration: '20s', target: 50 },  
        // Giai đoạn chịu tải trung bình
        { duration: '30s', target: 100 }, 
        { duration: '1m', target: 150 },  
        // Giai đoạn chịu tải cao
        { duration: '30s', target: 200 }, 
        { duration: '1m', target: 300 },  
        // Giai đoạn stress test (kiểm tra giới hạn)
        { duration: '20s', target: 400 }, 
        { duration: '30s', target: 500 }, 
        // Giai đoạn giảm tải (Cool-down)
        { duration: '20s', target: 100 }, 
        { duration: '10s', target: 0 },   
    ],
};

// Danh sách tất cả các đường dẫn ảnh trong thư mục data
const allImagePaths = [
    'data/image1.png',
    'data/image2.png',
    'data/image3.png',
    'data/image4.png',
    'data/image5.png',
    'data/image6.png',
    'data/image7.png',
    'data/image8.png',
    'data/image9.png',
    'data/image10.png',
];

// Hàm để lấy 5 ảnh ngẫu nhiên
function getRandomImages(array, num) {
    const shuffled = array.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
}

export default function() {
    const jobIds = [];

    // Lấy 5 ảnh ngẫu nhiên
    const imagePaths = getRandomImages(allImagePaths, 5);

    imagePaths.forEach((imagePath) => {
        // Gửi request upload ảnh
        const uploadRes = http.post('http://localhost:3000/upload', {
            images: http.file(imagePath)
        });

        check(uploadRes, {
            'Upload successful': (r) => r.status === 200,
        });
        console.log('Upload response:', uploadRes.status, uploadRes.body);
        if (uploadRes.status === 200) {
            const jobId = JSON.parse(uploadRes.body).jobId;
            jobIds.push(jobId);
        }
    });

    // Kiểm tra trạng thái của các job
    jobIds.forEach((jobId) => {
        let status = '';
        let retries = 0;
        const maxRetries = 5;  // Số lần thử lại

        while (status !== 'completed' && status !== 'failed' && retries < maxRetries) {
            const statusRes = http.get(`http://localhost:3000/status/${jobId}`);

            check(statusRes, {
                'Status check successful': (r) => r.status === 200,
            });

            if (statusRes.status === 200) {
                status = JSON.parse(statusRes.body).status;
            }

            sleep(1); // Chờ 1 giây trước khi thử lại
            retries++;
        }
    });
}