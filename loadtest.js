import { check } from 'k6';
import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
    vus: 100, // Số lượng virtual users
    duration: '10s', // Thời gian test
};

const imagePaths = ['D:/KTPM_PJ/KTPM/data/example2.png', 'D:/KTPM_PJ/KTPM/data/example1.png', 'D:/KTPM_PJ/KTPM/data/example4.png'];

export default function() {
    const jobIds = [];

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