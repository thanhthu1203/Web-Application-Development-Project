// Require dotenv - package để đọc file .env
require('dotenv').config();

// Object chứa tất cả config database
const databaseConfig = {
  // Host - nơi MySQL server chạy
  host: process.env.DB_HOST || 'localhost',
  
  // User - tên người dùng MySQL
  user: process.env.DB_USER || 'root',
  
  // Password - mật khẩu MySQL
  password: process.env.DB_PASSWORD || '',
  
  // Database - tên database cần kết nối
  database: process.env.DB_NAME || 'forumdb',
  
  // Port - cổng MySQL
  port: process.env.DB_PORT || 3306,
  
  // Waitfor connections - hỗ trợ connection pooling
  waitForConnections: true,
  
  // Connection limit - số kết nối tối đa
  connectionLimit: 10,
  
  // Queue limit - số request chờ tối đa
  queueLimit: 0
};

// Export config để file khác dùng
module.exports = databaseConfig;