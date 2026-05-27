// Middleware để validate input từ client
// Tránh SQL Injection, XSS, invalid data

const { 
  escapeHtml, 
  validatePassword, 
  validateEmail, 
  validateUsername, 
  isEmpty 
} = require('../utils/helpers');

// Hàm validate signup input
const validateSignup = (req, res, next) => {
  // Lấy dữ liệu từ request body
  const { email, password, confirmPassword, username, first_name, last_name } = req.body;
  
  // Kiểm tra tất cả required fields có không
  if (isEmpty(email) || isEmpty(password) || isEmpty(username) || isEmpty(first_name) || isEmpty(last_name)) {
    return res.status(400).json({ 
      message: 'All required fields must be filled.' 
    });
  }
  
  // Kiểm tra email hợp lệ
  if (!validateEmail(email)) {
    return res.status(400).json({ 
      message: 'Email format is invalid.' 
    });
  }
  
  // Kiểm tra email không quá dài (tránh overflow)
  if (email.length > 255) {
    return res.status(400).json({ 
      message: 'Email is too long (max 255 characters).' 
    });
  }
  
  // Kiểm tra password strength
  if (!validatePassword(password)) {
    return res.status(400).json({ 
      message: 'Password must be at least 8 characters, contain uppercase, lowercase, number, and special character (@$!%*?&).' 
    });
  }
  
  // Kiểm tra password và confirmPassword trùng không
  if (password !== confirmPassword) {
    return res.status(400).json({ 
      message: 'Passwords do not match.' 
    });
  }
  
  // Kiểm tra username hợp lệ
  if (!validateUsername(username)) {
    return res.status(400).json({ 
      message: 'Username must be 3-20 characters, contain only letters, numbers, and underscores.' 
    });
  }
  
  // Kiểm tra first_name length
  if (first_name.trim().length < 2 || first_name.trim().length > 100) {
    return res.status(400).json({ 
      message: 'First name must be 2-100 characters.' 
    });
  }
  
  // Kiểm tra last_name length
  if (last_name.trim().length < 2 || last_name.trim().length > 100) {
    return res.status(400).json({ 
      message: 'Last name must be 2-100 characters.' 
    });
  }
  
  // Escape HTML input để chống XSS
  req.body.email = escapeHtml(email.trim());
  req.body.username = escapeHtml(username.trim());
  req.body.first_name = escapeHtml(first_name.trim());
  req.body.last_name = escapeHtml(last_name.trim());
  // Không escape password vì password không được display
  req.body.password = password;
  
  // Validation thành công, tiếp tục xử lý request
  next();
};

// Hàm validate login input
const validateLogin = (req, res, next) => {
  // Lấy dữ liệu từ request body
  const { email, password } = req.body;
  
  // Kiểm tra email và password có không
  if (isEmpty(email) || isEmpty(password)) {
    return res.status(400).json({ 
      message: 'Email and password are required.' 
    });
  }
  
  // Kiểm tra email format
  if (!validateEmail(email)) {
    return res.status(400).json({ 
      message: 'Email format is invalid.' 
    });
  }
  
  // Kiểm tra password không quá dài (tránh brute force)
  if (password.length > 255) {
    return res.status(400).json({ 
      message: 'Password is too long.' 
    });
  }
  
  // Escape HTML
  req.body.email = escapeHtml(email.trim());
  
  // Validation thành công, tiếp tục
  next();
};

// Hàm validate message/comment input
const validateMessage = (req, res, next) => {
  // Lấy dữ liệu từ request body
  const { content, user_id, thread_id } = req.body;
  
  // Kiểm tra content có không và không rỗng
  if (isEmpty(content)) {
    return res.status(400).json({ 
      message: 'Content cannot be empty.' 
    });
  }
  
  // Kiểm tra content length (min 1, max 5000)
  if (content.trim().length > 5000) {
    return res.status(400).json({ 
      message: 'Content is too long (max 5000 characters).' 
    });
  }
  
  // Kiểm tra user_id và thread_id là số
  if (!Number.isInteger(user_id) || !Number.isInteger(thread_id)) {
    return res.status(400).json({ 
      message: 'Invalid user_id or thread_id.' 
    });
  }
  
  // Kiểm tra user_id và thread_id > 0
  if (user_id <= 0 || thread_id <= 0) {
    return res.status(400).json({ 
      message: 'user_id and thread_id must be positive numbers.' 
    });
  }
  
  // Escape HTML content để chống XSS
  req.body.content = escapeHtml(content.trim());
  
  // Validation thành công
  next();
};

// Hàm validate user profile update
const validateUserProfile = (req, res, next) => {
  // Lấy dữ liệu từ request body
  const { username, first_name, last_name, gender, date_of_birth } = req.body;
  
  // Kiểm tra required fields
  if (isEmpty(username) || isEmpty(first_name) || isEmpty(last_name)) {
    return res.status(400).json({ 
      message: 'Username, first name, and last name are required.' 
    });
  }
  
  // Kiểm tra username hợp lệ
  if (!validateUsername(username)) {
    return res.status(400).json({ 
      message: 'Username must be 3-20 characters, contain only letters, numbers, and underscores.' 
    });
  }
  
  // Kiểm tra first_name length
  if (first_name.trim().length < 2 || first_name.trim().length > 100) {
    return res.status(400).json({ 
      message: 'First name must be 2-100 characters.' 
    });
  }
  
  // Kiểm tra last_name length
  if (last_name.trim().length < 2 || last_name.trim().length > 100) {
    return res.status(400).json({ 
      message: 'Last name must be 2-100 characters.' 
    });
  }
  
  // Kiểm tra gender (nếu có)
  if (gender && !['Male', 'Female', 'Other'].includes(gender)) {
    return res.status(400).json({ 
      message: 'Gender must be Male, Female, or Other.' 
    });
  }
  
  // Kiểm tra date_of_birth format (nếu có)
  if (date_of_birth) {
    const date = new Date(date_of_birth);
    
    // Kiểm tra có phải date hợp lệ không
    if (isNaN(date.getTime())) {
      return res.status(400).json({ 
        message: 'Date of birth format is invalid (must be YYYY-MM-DD).' 
      });
    }
    
    // Kiểm tra không được lớn hơn hôm nay
    if (date > new Date()) {
      return res.status(400).json({ 
        message: 'Date of birth cannot be in the future.' 
      });
    }
    
    // Kiểm tra phải >= 13 tuổi
    const age = new Date().getFullYear() - date.getFullYear();
    if (age < 13) {
      return res.status(400).json({ 
        message: 'You must be at least 13 years old.' 
      });
    }
  }
  
  // Escape HTML
  req.body.username = escapeHtml(username.trim());
  req.body.first_name = escapeHtml(first_name.trim());
  req.body.last_name = escapeHtml(last_name.trim());
  
  // Validation thành công
  next();
};

// Hàm validate thread create input
const validateThreadCreate = (req, res, next) => {
  // Lấy dữ liệu từ request body
  const { title, category_id, created_by } = req.body;
  
  // Kiểm tra title có không
  if (isEmpty(title)) {
    return res.status(400).json({ 
      message: 'Thread title is required.' 
    });
  }
  
  // Kiểm tra title length (min 5, max 255)
  if (title.trim().length < 5 || title.trim().length > 255) {
    return res.status(400).json({ 
      message: 'Title must be 5-255 characters.' 
    });
  }
  
  // Kiểm tra category_id là số (nếu có)
  if (category_id && !Number.isInteger(category_id)) {
    return res.status(400).json({ 
      message: 'Invalid category_id.' 
    });
  }
  
  // Kiểm tra created_by là số
  if (!Number.isInteger(created_by)) {
    return res.status(400).json({ 
      message: 'Invalid created_by.' 
    });
  }
  
  // Escape HTML title
  req.body.title = escapeHtml(title.trim());
  
  // Validation thành công
  next();
};

// Hàm validate ban user input
const validateBanUser = (req, res, next) => {
  // Lấy dữ liệu từ request body
  const { user_id, mod_id, reason } = req.body;
  
  // Kiểm tra user_id và mod_id có không
  if (!Number.isInteger(user_id) || !Number.isInteger(mod_id)) {
    return res.status(400).json({ 
      message: 'Invalid user_id or mod_id.' 
    });
  }
  
  // Kiểm tra user_id và mod_id > 0
  if (user_id <= 0 || mod_id <= 0) {
    return res.status(400).json({ 
      message: 'user_id and mod_id must be positive numbers.' 
    });
  }
  
  // Kiểm tra không ban chính mình
  if (user_id === mod_id) {
    return res.status(400).json({ 
      message: 'You cannot ban yourself.' 
    });
  }
  
  // Kiểm tra reason length (max 255)
  if (reason && reason.length > 255) {
    return res.status(400).json({ 
      message: 'Reason is too long (max 255 characters).' 
    });
  }
  
  // Escape HTML reason
  if (reason) {
    req.body.reason = escapeHtml(reason.trim());
  }
  
  // Validation thành công
  next();
};

// Export tất cả middleware
module.exports = {
  validateSignup,
  validateLogin,
  validateMessage,
  validateUserProfile,
  validateThreadCreate,
  validateBanUser
};