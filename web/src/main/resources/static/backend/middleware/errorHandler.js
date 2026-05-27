// Middleware để xử lý lỗi chung (centralized error handling)
// Thay vì mỗi route return error khác nhau, dùng error handler chung

// ========================================
// BƯỚC 1: Custom Error Class
// ========================================

// Tạo error class riêng để có thể detect lỗi của app
class APIError extends Error {
  // Constructor nhận message và HTTP status code
  constructor(message, statusCode = 500) {
    // Gọi constructor của Error class
    super(message);
    
    // Lưu status code
    this.statusCode = statusCode;
    
    // Lưu tên class để debug
    this.name = this.constructor.name;
    
    // Capture stack trace (để biết error xảy ra ở dòng nào)
    Error.captureStackTrace(this, this.constructor);
  }
}

// ========================================
// BƯỚC 2: Global Error Handler Middleware
// ========================================

// Middleware để xử lý tất cả lỗi
// Phải có 4 tham số (err, req, res, next) để Express nhận diện là error handler
const errorHandler = (err, req, res, next) => {
  // Log lỗi ra console để debug
  // Nên log vào file hoặc database ở production
  console.error('=== ERROR ===');
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  console.error('==============');
  
  // Nếu response đã được gửi rồi, bỏ qua
  // (tránh error "Cannot set headers after they are sent")
  if (res.headersSent) {
    return next(err);
  }
  
  // ── Kiểm tra loại lỗi và return response phù hợp ──
  
  // 1. Lỗi từ validation hoặc authorization (APIError)
  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      success: false,
      error: true,
      message: err.message,
      statusCode: err.statusCode
    });
  }
  
  // 2. Lỗi duplicate entry (email/username already exists)
  if (err.code === 'ER_DUP_ENTRY') {
    // Parse lỗi để lấy field bị duplicate
    const field = err.message.split("'")[1] || 'record';
    
    return res.status(409).json({
      success: false,
      error: true,
      message: `${field} already exists.`,
      statusCode: 409
    });
  }
  
  // 3. Lỗi foreign key (xóa record bị reference)
  if (err.code === 'ER_NO_REFERENCED_ROW') {
    return res.status(400).json({
      success: false,
      error: true,
      message: 'Cannot perform this action due to database constraints.',
      statusCode: 400
    });
  }
  
  // 4. Lỗi data type (ví dụ insert text vào INT column)
  if (err.code === 'ER_TRUNCATED_WRONG_VALUE') {
    return res.status(400).json({
      success: false,
      error: true,
      message: 'Invalid data type.',
      statusCode: 400
    });
  }
  
  // 5. Lỗi JSON parse (client gửi JSON invalid)
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      success: false,
      error: true,
      message: 'Invalid JSON format.',
      statusCode: 400
    });
  }
  
  // 6. Lỗi không xác định (generic error)
  // Không reveal chi tiết lỗi cho client (security)
  return res.status(500).json({
    success: false,
    error: true,
    message: 'Internal server error. Please try again later.',
    statusCode: 500
    // Ở production, có thể thêm error ID để user báo lỗi
    // errorId: generateErrorId()
  });
};

// ========================================
// BƯỚC 3: Helper Functions để throw errors
// ========================================

// Hàm throw error validation
const throwValidationError = (message) => {
  throw new APIError(message, 400);
};

// Hàm throw error unauthorized
const throwUnauthorizedError = (message = 'Unauthorized') => {
  throw new APIError(message, 401);
};

// Hàm throw error forbidden
const throwForbiddenError = (message = 'Forbidden') => {
  throw new APIError(message, 403);
};

// Hàm throw error not found
const throwNotFoundError = (message = 'Resource not found') => {
  throw new APIError(message, 404);
};

// Hàm throw error conflict (duplicate, etc.)
const throwConflictError = (message = 'Conflict') => {
  throw new APIError(message, 409);
};

// Hàm throw error internal
const throwInternalError = (message = 'Internal server error') => {
  throw new APIError(message, 500);
};

// ========================================
// BƯỚC 4: Async Error Wrapper
// ========================================

// Wrapper để catch lỗi async/await trong route handler
// Dùng khi route handler là async function
const asyncHandler = (fn) => {
  return (req, res, next) => {
    // Chạy hàm, nếu throw error thì catch và pass vào next
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ========================================
// BƯỚC 5: Not Found Handler
// ========================================

// Middleware để handle route không tồn tại (404)
// Phải là middleware cuối cùng trong server.js
const notFoundHandler = (req, res, next) => {
  const err = new APIError(
    `Cannot ${req.method} ${req.path}`,
    404
  );
  
  next(err);
};

// Export tất cả
module.exports = {
  APIError,
  errorHandler,
  throwValidationError,
  throwUnauthorizedError,
  throwForbiddenError,
  throwNotFoundError,
  throwConflictError,
  throwInternalError,
  asyncHandler,
  notFoundHandler
};