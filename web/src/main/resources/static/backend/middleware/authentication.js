// Middleware để xác thực (authentication) bằng JWT token
// JWT = JSON Web Token - cách lưu user session an toàn

const jwt = require('jsonwebtoken');

// ========================================
// BƯỚC 1: Generate Token (khi user login)
// ========================================

// Hàm tạo JWT token khi user đăng nhập thành công
function generateToken(userId, role) {
  // Payload - dữ liệu cần lưu trong token
  // Cẩn thận: chỉ lưu dữ liệu không sensitive (userId, role)
  // KHÔNG lưu password, email sensitive
  const payload = {
    userId: userId,
    role: role,
    // issuedAt được tự động thêm bởi jwt.sign()
  };
  
  // Options - cài đặt token
  const options = {
    expiresIn: '30d',  // Token hết hạn sau 30 ngày
    algorithm: 'HS256'  // Thuật toán mã hóa
  };
  
  // jwt.sign(payload, secret, options)
  // Tạo token bằng cách mã hóa payload + secret key
  // secret key từ .env (JWT_SECRET)
  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    options
  );
  
  return token;
}

// ========================================
// BƯỚC 2: Verify Token (kiểm tra token hợp lệ)
// ========================================

// Hàm kiểm tra JWT token có hợp lệ không
function verifyToken(token) {
  try {
    // jwt.verify(token, secret)
    // Giải mã token bằng secret key
    // Nếu token bị sửa đổi hoặc secret sai → throw error
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Return payload nếu token hợp lệ
    return decoded;
    
  } catch (err) {
    // Nếu token expired, invalid, hoặc sai secret
    console.error('Token verification failed:', err.message);
    return null;  // Return null nếu invalid
  }
}

// ========================================
// BƯỚC 3: Middleware - kiểm tra token ở mỗi route
// ========================================

// Middleware để kiểm tra client có gửi token hợp lệ không
const authenticateToken = (req, res, next) => {
  // Lấy token từ request header
  // Client gửi: Authorization: Bearer eyJhbGciOi...
  const authHeader = req.headers['authorization'];
  
  // Split "Bearer token" để lấy token
  // authHeader = "Bearer eyJhbGciOi..."
  // authHeader.split(' ') = ["Bearer", "eyJhbGciOi..."]
  // [1] = "eyJhbGciOi..."
  const token = authHeader && authHeader.split(' ')[1];
  
  // Nếu không có token trong header
  if (!token) {
    return res.status(401).json({ 
      message: 'Access token is required. Please login first.' 
    });
  }
  
  // Kiểm tra token có hợp lệ không
  const decoded = verifyToken(token);
  
  // Nếu token invalid hoặc expired
  if (!decoded) {
    return res.status(403).json({ 
      message: 'Token is invalid or expired. Please login again.' 
    });
  }
  
  // Nếu token hợp lệ, lưu user info vào req object
  // Để các route handler có thể dùng req.user
  req.user = decoded;  // { userId, role }
  req.user.id = decoded.userId;  // Thêm id shortcut
  
  // Token hợp lệ, tiếp tục xử lý request
  next();
};

// ========================================
// BƯỚC 4: Middleware - kiểm tra role/quyền
// ========================================

// Middleware để kiểm tra user có role được phép không
// Ví dụ: authorizeRole(['admin', 'mod'])
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    // Kiểm tra user đã được authenticate không (đã gọi authenticateToken)
    if (!req.user) {
      return res.status(401).json({ 
        message: 'User not authenticated.' 
      });
    }
    
    // Kiểm tra role của user có trong danh sách allowed không
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `You do not have permission. Required role: ${allowedRoles.join(', ')}` 
      });
    }
    
    // Role hợp lệ, tiếp tục
    next();
  };
};

// ========================================
// BƯỚC 5: Middleware - kiểm tra resource ownership
// ========================================

// Middleware để kiểm tra user chỉ có thể sửa/xóa dữ liệu của chính mình
// Hoặc admin/mod có thể
const authorizeOwnerOrMod = (resourceOwnerId) => {
  return (req, res, next) => {
    // Kiểm tra user đã authenticate không
    if (!req.user) {
      return res.status(401).json({ 
        message: 'User not authenticated.' 
      });
    }
    
    // Nếu user là owner của resource hoặc là admin/mod → được phép
    const isOwner = req.user.userId === resourceOwnerId;
    const isMod = req.user.role === 'moderator' || req.user.role === 'admin';
    
    if (!isOwner && !isMod) {
      return res.status(403).json({ 
        message: 'You can only modify your own resources.' 
      });
    }
    
    next();
  };
};

// Export tất cả functions
module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  authorizeRole,
  authorizeOwnerOrMod
};