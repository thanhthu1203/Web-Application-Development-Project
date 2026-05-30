// Require packages
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const path = require("path");
require('dotenv').config();

// Require database connection
const db = require("./db");

// Require middleware
const { 
  validateSignup, 
  validateLogin, 
  validateMessage 
} = require("./middleware/validation");

const { 
  authenticateToken, 
  authorizeRole, 
  generateToken 
} = require("./middleware/authentication");

const { 
  errorHandler, 
  notFoundHandler, 
  APIError 
} = require("./middleware/errorHandler");

// Require routes
const adminRoutes = require('./routes/adminRoutes');
const modRoutes = require('./routes/modRoutes');
const userRoutes = require('./routes/userRoutes');

// Tạo Express app
const app = express();


// middleware global (áp dụng cho toàn app)


// cors - cho phép cross-origin requests
app.use(cors());

// Parse JSON request body (max 10MB)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "../../../")));

 
// routes - Authentication (không cần token)
 

// Health check
app.get("/", (req, res) => {
  res.json({ 
    message: "Backend is running OK!",
    timestamp: new Date().toISOString()
  });
});

// login route
app.post("/login", validateLogin, (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Query user từ database
    db.query(
      "SELECT * FROM Accounts WHERE email = ? LIMIT 1",
      [email],
      async (err, accounts) => {
        // Nếu có lỗi database
        if (err) return next(err);
        
        // Nếu email không tồn tại
        if (accounts.length === 0) {
          throw new APIError("Email or password is incorrect.", 401);
        }
        
        // Kiểm tra password có đúng không
        const match = await bcrypt.compare(password, accounts[0].password);
        if (!match) {
          throw new APIError("Email or password is incorrect.", 401);
        }
        
        const id = accounts[0].account_id;
        
        // Tìm user type: Admin, Moderator, hoặc User
        db.query("SELECT * FROM Admins WHERE admin_id = ? LIMIT 1", [id], (err2, admins) => {
          if (err2) return next(err2);
          
          // Nếu là Admin
          if (admins.length > 0) {
            const admin = admins[0];
            const token = generateToken(id, 'admin');
            
            return res.json({
              success: true,
              message: "Login successful",
              account_id: id,
              email: email,
              admin_id: id,
              admin_name: admin.admin_name,
              username: admin.username || admin.admin_name,
              avatar: admin.avatar || null,
              role: 'admin',
              token: token
            });
          }
          
          // Tìm Moderator
          db.query("SELECT * FROM Moderators WHERE mod_id = ? LIMIT 1", [id], (err3, mods) => {
            if (err3) return next(err3);
            
            if (mods.length > 0) {
              const mod = mods[0];
              const token = generateToken(id, 'moderator');
              
              return res.json({
                success: true,
                message: "Login successful",
                account_id: id,
                email: email,
                mod_id: id,
                mod_name: mod.mod_name,
                username: mod.username || mod.mod_name,
                avatar: mod.avatar || null,
                role: 'moderator',
                token: token
              });
            }
            
            // Tìm User thường
            db.query("SELECT * FROM AppUsers WHERE user_id = ? LIMIT 1", [id], (err4, users) => {
              if (err4) return next(err4);
              
              if (users.length === 0) {
                throw new APIError("Account does not exist.", 401);
              }
              
              // Kiểm tra user có bị ban không
              if (users[0].is_banned) {
                throw new APIError("Your account has been banned.", 403);
              }
              
              const user = users[0];
              const token = generateToken(id, 'user');
              
              res.json({
                success: true,
                message: "Login successful",
                account_id: id,
                email: email,
                user_id: id,
                username: user.username || `${user.first_name} ${user.last_name}`,
                avatar: user.avatar || null,
                role: 'user',
                token: token
              });
            });
          });
        });
      }
    );
  } catch (err) {
    next(err);
  }
});

// signup route
app.post("/signup", validateSignup, async (req, res, next) => {
  try {
    const { email, password, username, first_name, last_name, gender, date_of_birth, avatar } = req.body;
    
    // Kiểm tra username duy nhất
    db.query(
      "SELECT user_id FROM AppUsers WHERE username = ? LIMIT 1",
      [username],
      async (errChk, existing) => {
        if (errChk) return next(errChk);
        
        if (existing.length > 0) {
          throw new APIError("Username already taken. Please choose another.", 409);
        }
        
        // Hash password
        const hashed = await bcrypt.hash(password, 10);
        
        // Insert vào Accounts table
        db.query(
          "INSERT INTO Accounts (email, password) VALUES (?, ?)",
          [email, hashed],
          (err, result) => {
            if (err) {
              if (err.code === "ER_DUP_ENTRY") {
                return next(new APIError("Email already exists.", 409));
              }
              return next(err);
            }
            
            const newId = result.insertId;
            
            // Insert vào AppUsers table
            db.query(
              `INSERT INTO AppUsers
                 (user_id, username, first_name, last_name, gender, date_of_birth, avatar, is_banned)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
              [newId, username, first_name, last_name, gender || null, date_of_birth || null, avatar || null],
              (err2) => {
                if (err2) return next(err2);
                
                res.json({ 
                  success: true,
                  message: "Sign up successful! Please login.", 
                  user_id: newId 
                });
              }
            );
          }
        );
      }
    );
  } catch (err) {
    next(err);
  }
});

 
// routes - Require authentication
 

// Admin routes - chỉ admin được access
require('./routes/adminRoutes')(app, db, authenticateToken, authorizeRole);

// Mod routes - admin hoặc mod được access
require('./routes/modRoutes')(app, db, authenticateToken, authorizeRole);

// User routes - user được access
require('./routes/userRoutes')(app, db, authenticateToken);


// error handling (phải ở cuối)


// 404 Not Found handler
app.use(notFoundHandler);

// Global error handler (phải ở sau notFoundHandler)
app.use(errorHandler);


// start server
const PORT = process.env.SERVER_PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n✅ Server is running at http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});