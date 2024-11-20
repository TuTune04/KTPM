// queues/queues.js
const Queue = require('bull');
const IORedis = require('ioredis');

// Cấu hình Redis sử dụng ioredis với các tùy chọn tối ưu
const redisConfig = {
  host: '192.168.2.131',
  port: 6379,
  // password: 'your_redis_password', // Nếu Redis yêu cầu xác thực
  // db: 0, // Sử dụng db 0 hoặc bất kỳ db nào bạn muốn
  // Removing maxRetriesPerRequest as it's deprecated in ioredis v4.x
};

const redisClient = new IORedis(redisConfig);

// Thêm các sự kiện để theo dõi trạng thái kết nối Redis
redisClient.on('connect', () => {
  console.log('Đã kết nối thành công với Redis server');
});

redisClient.on('ready', () => {
  console.log('Redis client ready to use');
});

redisClient.on('error', (err) => {
  console.error('Redis Error:', err);
});

redisClient.on('reconnecting', () => {
  console.log('Đang thử kết nối lại với Redis server...');
});

// Cấu hình Bull Queue với các thiết lập tối ưu
const queueOptions = {
  redis: redisClient,
  settings: {
    stalledInterval: 30000, // Kiểm tra công việc bị kẹt sau 30 giây
    maxStalledCount: 0, // Tắt việc tái xử lý công việc bị kẹt
    lockDuration: 60000, // Khoá công việc trong 60 giây
  },
  limiter: {
    max: 1000, // Số lượng công việc tối đa trong một khoảng thời gian
    duration: 60000, // Khoảng thời gian là 60 giây
  },
};

const ocrQueue = new Queue('ocr', queueOptions);
const translateQueue = new Queue('translate', queueOptions);
const pdfQueue = new Queue('pdf', queueOptions);

module.exports = {
  ocrQueue,
  translateQueue,
  pdfQueue,
};