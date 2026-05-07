const express = require("express");
const cors    = require("cors");
const bcrypt  = require("bcrypt");
const db      = require("./db"); 
const path    = require("path"); // Thêm thư viện path

const app = express();
app.use(cors());
app.use(express.json());

// 1. Cấu hình phục vụ file tĩnh (HTML, CSS, JS) từ thư mục frontend
// Đoạn này giúp bạn truy cập web qua http://localhost:3000
app.use(express.static(path.join(__dirname, "../frontend")));

// 2. Import các Routes đã bóc tách
require('./routes/adminRoutes')(app, db);
require('./routes/modRoutes')(app, db);
require('./routes/userRoutes')(app, db);

// =======================
// AUTH — LOGIN & SIGNUP
// =======================
app.get("/", (req, res) => res.send("Backend is running OK!"));

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password cannot be empty." });

  db.query("SELECT * FROM Accounts WHERE email = ? LIMIT 1", [email], async (err, accounts) => {
    if (err) return res.status(500).send(err);
    if (accounts.length === 0) return res.status(401).json({ message: "Email or password is incorrect." });

    const match = await bcrypt.compare(password, accounts[0].password);
    if (!match) return res.status(401).json({ message: "Email or password is incorrect." });

    const id = accounts[0].account_id;
    db.query("SELECT * FROM Admins WHERE admin_id = ? LIMIT 1", [id], (err2, admins) => {
      if (err2) return res.status(500).send(err2);
      if (admins.length > 0) return res.json({ account_id: id, email, admin_id: id, admin_name: admins[0].admin_name, role: 'admin' });

      db.query("SELECT * FROM Moderators WHERE mod_id = ? LIMIT 1", [id], (err3, mods) => {
        if (err3) return res.status(500).send(err3);
        if (mods.length > 0) return res.json({ account_id: id, email, mod_id: id, mod_name: mods[0].mod_name, role: 'moderator' });

        db.query("SELECT * FROM AppUsers WHERE user_id = ? LIMIT 1", [id], (err4, users) => {
          if (err4) return res.status(500).send(err4);
          if (users.length === 0) return res.status(401).json({ message: "Account does not exist." });
          if (users[0].is_banned) return res.status(403).json({ message: "Your account has been banned." });

          const user = users[0];
          delete user.password;
          return res.json({ ...user, account_id: id, email, role: 'user' });
        });
      });
    });
  });
});

app.post("/signup", async (req, res) => {
  const { email, password, first_name, last_name, gender, date_of_birth } = req.body;
  if (!email || !password || !first_name || !last_name) 
    return res.status(400).json({ message: "Please fill in all required fields." });

  const hashed = await bcrypt.hash(password, 10);
  db.query("INSERT INTO Accounts (email, password) VALUES (?, ?)", [email, hashed], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Email already exists." });
      return res.status(500).send(err);
    }
    const newId = result.insertId;
    db.query("INSERT INTO AppUsers (user_id, first_name, last_name, gender, date_of_birth, is_banned) VALUES (?, ?, ?, ?, ?, 0)",
      [newId, first_name, last_name, gender || null, date_of_birth || null],
      (err2) => {
        if (err2) return res.status(500).send(err2);
        res.json({ message: "Sign up successful!", user_id: newId });
      }
    );
  });
});

app.listen(3000, () => console.log("Server run at http://localhost:3000"));