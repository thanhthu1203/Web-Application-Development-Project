// Test file để kiểm tra config/database.js hoạt động không

// Require file config
const config = require('./src/main/resources/static/backend/config/database.js');

// In ra console để xem giá trị
console.log('=== DATABASE CONFIG ===');
console.log('Host:', config.host);
console.log('User:', config.user);
console.log('Password:', config.password);
console.log('Database:', config.database);
console.log('Port:', config.port);
console.log('Connection Limit:', config.connectionLimit);
console.log('=======================');
console.log('✅ Config loaded successfully!');