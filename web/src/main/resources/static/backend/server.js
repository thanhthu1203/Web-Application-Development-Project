const express = require("express");
const cors    = require("cors");
const bcrypt  = require("bcrypt");
const db      = require("./db");
const path    = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(path.join(__dirname, "../frontend")));

require('./routes/adminRoutes')(app, db);
require('./routes/modRoutes')(app, db);
require('./routes/userRoutes')(app, db);

// =======================
// AUTH — LOGIN & SIGNUP
// =======================
app.get("/", (req, res) => res.send("Backend is running OK!"));

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password cannot be empty." });

  db.query("SELECT * FROM Accounts WHERE email = ? LIMIT 1", [email], async (err, accounts) => {
    if (err) return res.status(500).send(err);
    if (accounts.length === 0)
      return res.status(401).json({ message: "Email or password is incorrect." });

    const match = await bcrypt.compare(password, accounts[0].password);
    if (!match)
      return res.status(401).json({ message: "Email or password is incorrect." });

    const id = accounts[0].account_id;

    // Admin
    db.query("SELECT * FROM Admins WHERE admin_id = ? LIMIT 1", [id], (err2, admins) => {
      if (err2) return res.status(500).send(err2);
      if (admins.length > 0) {
        const a = admins[0];
        return res.json({
          account_id: id, email,
          admin_id:   id,
          admin_name: a.admin_name,
          username:   a.username   || a.admin_name,
          avatar:     a.avatar     || null,
          gender:     a.gender     || null,
          date_of_birth: a.date_of_birth || null,
          role: 'admin'
        });
      }

      // Moderator
      db.query("SELECT * FROM Moderators WHERE mod_id = ? LIMIT 1", [id], (err3, mods) => {
        if (err3) return res.status(500).send(err3);
        if (mods.length > 0) {
          const m = mods[0];
          return res.json({
            account_id: id, email,
            mod_id:     id,
            mod_name:   m.mod_name,
            username:   m.username  || m.mod_name,
            avatar:     m.avatar    || null,
            gender:     m.gender    || null,
            date_of_birth: m.date_of_birth || null,
            role: 'moderator'
          });
        }

        // AppUser
        db.query("SELECT * FROM AppUsers WHERE user_id = ? LIMIT 1", [id], (err4, users) => {
          if (err4) return res.status(500).send(err4);
          if (users.length === 0)
            return res.status(401).json({ message: "Account does not exist." });
          if (users[0].is_banned)
            return res.status(403).json({ message: "Your account has been banned." });

          const user = { ...users[0] };
          delete user.password;
          return res.json({ ...user, account_id: id, email, role: 'user' });
        });
      });
    });
  });
});

app.post("/signup", async (req, res) => {
  const { email, password, username, first_name, last_name, gender, date_of_birth, avatar } = req.body;

  if (!email || !password || !first_name || !last_name || !username)
    return res.status(400).json({ message: "Please fill in all required fields." });

  // Check username uniqueness
  db.query("SELECT user_id FROM AppUsers WHERE username = ? LIMIT 1", [username], async (errChk, existing) => {
    if (errChk) return res.status(500).send(errChk);
    if (existing.length > 0)
      return res.status(409).json({ message: "Username already taken. Please choose another." });

    const hashed = await bcrypt.hash(password, 10);

    db.query("INSERT INTO Accounts (email, password) VALUES (?, ?)", [email, hashed], (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res.status(409).json({ message: "Email already exists." });
        return res.status(500).send(err);
      }

      const newId = result.insertId;

      // avatar is saved here — this was the missing piece causing user2's avatar to be lost
      db.query(
        `INSERT INTO AppUsers
           (user_id, username, first_name, last_name, gender, date_of_birth, avatar, is_banned)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [newId, username, first_name, last_name, gender || null, date_of_birth || null, avatar || null],
        (err2) => {
          if (err2) return res.status(500).send(err2);
          res.json({ message: "Sign up successful!", user_id: newId });
        }
      );
    });
  });
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));