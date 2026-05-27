// Require dotenv để load biến từ .env file
require('dotenv').config();

// Require mysql2 package
const mysql = require('mysql2');

// Lấy config từ file config/database.js
const config = require('./config/database');

// Tạo connection pool (quản lý nhiều connection)
const db = mysql.createPool(config);

// Kiểm tra connection có thành công không
db.getConnection((err, connection) => {
  // Nếu có lỗi kết nối
  if (err) {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('Database has too many connections.');
    }
    if (err.code === 'ER_AUTHENTICATION_PLUGIN_ERROR') {
      console.error('Database authentication failed.');
    }
  }
  
  // Nếu kết nối thành công
  if (connection) {
    connection.release();  // Trả connection về pool
    console.log('✅ Connected to MySQL database successfully!');
  }
  
  return;
});

// Export connection pool
module.exports = db;