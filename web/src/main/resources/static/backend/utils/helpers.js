// Hàm escape HTML - chống XSS attack
function escapeHtml(text) {
  // Nếu text không phải string hoặc rỗng, return empty string
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Thay thế các ký tự nguy hiểm thành HTML entities
  const map = {
    '&': '&amp;',      // & thành &amp;
    '<': '&lt;',       // < thành &lt;
    '>': '&gt;',       // > thành &gt;
    '"': '&quot;',     // " thành &quot;
    "'": '&#39;'       // ' thành &#39;
  };
  
  // Dùng regex replace để thay thế tất cả ký tự nguy hiểm
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

// Hàm validate password strength
function validatePassword(password) {
  // Nếu password không phải string, return false
  if (!password || typeof password !== 'string') {
    return false;
  }
  
  // Regex kiểm tra:
  // (?=.*[a-z]) - phải có ít nhất 1 chữ thường
  // (?=.*[A-Z]) - phải có ít nhất 1 chữ hoa
  // (?=.*\d) - phải có ít nhất 1 số
  // (?=.*[@$!%*?&]) - phải có ít nhất 1 ký tự đặc biệt
  // .{8,} - độ dài tối thiểu 8 ký tự
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]{8,}$/;
  
  return passwordRegex.test(password);
}

// Hàm validate email
function validateEmail(email) {
  // Nếu email không phải string, return false
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Regex kiểm tra format email chuẩn
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(email);
}

// Hàm validate username
function validateUsername(username) {
  // Nếu username không phải string, return false
  if (!username || typeof username !== 'string') {
    return false;
  }
  
  // Username phải:
  // ^[a-zA-Z0-9_] - bắt đầu bằng chữ, số, hoặc dấu gạch dưới
  // {3,20}$ - độ dài 3-20 ký tự
  // Không có khoảng trắng, ký tự đặc biệt (trừ _)
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  
  return usernameRegex.test(username);
}

// Hàm format date theo chuẩn
function formatDate(date) {
  // Nếu date không phải Date object, return empty string
  if (!date || !(date instanceof Date)) {
    return '';
  }
  
  // Lấy năm, tháng, ngày
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');  // +1 vì month tính từ 0
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  // Return format: YYYY-MM-DD HH:MM:SS
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Hàm generate random string (dùng cho token hoặc temporary code)
function generateRandomString(length = 32) {
  // Ký tự có thể dùng
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  let result = '';
  
  // Lặp length lần, mỗi lần chọn 1 ký tự ngẫu nhiên
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  
  return result;
}

// Hàm kiểm tra xem value có phải empty/null/undefined không
function isEmpty(value) {
  // Nếu null hoặc undefined, return true
  if (value === null || value === undefined) {
    return true;
  }
  
  // Nếu là string, kiểm tra có whitespace không (nếu có thì coi là không empty)
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  
  // Nếu là array, kiểm tra length
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  
  // Nếu là object, kiểm tra có property không
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  // Nếu là số hoặc kiểu khác, return false
  return false;
}

// Export tất cả hàm để file khác dùng
module.exports = {
  escapeHtml,
  validatePassword,
  validateEmail,
  validateUsername,
  formatDate,
  generateRandomString,
  isEmpty
};