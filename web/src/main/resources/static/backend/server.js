const express = require("express");
const cors    = require("cors");
const db      = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// ── Test ──────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("Backend is running OK!"));

// =======================
// AUTH — LOGIN
// =======================
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email và mật khẩu không được để trống." });

  // Tìm account theo email + password thẳng
  db.query(
    "SELECT * FROM Accounts WHERE email = ? AND password = ? LIMIT 1",
    [email, password],
    (err, accounts) => {
      if (err) return res.status(500).send(err);
      if (accounts.length === 0)
        return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });

      const id = accounts[0].account_id;

      // Xác định role: Admin > Mod > User
      db.query("SELECT * FROM Admins WHERE admin_id = ? LIMIT 1", [id], (err2, admins) => {
        if (err2) return res.status(500).send(err2);
        if (admins.length > 0)
          return res.json({ account_id: id, email, admin_id: id, admin_name: admins[0].admin_name, role: 'admin' });

        db.query("SELECT * FROM Moderators WHERE mod_id = ? LIMIT 1", [id], (err3, mods) => {
          if (err3) return res.status(500).send(err3);
          if (mods.length > 0)
            return res.json({ account_id: id, email, mod_id: id, mod_name: mods[0].mod_name, role: 'moderator' });

          db.query("SELECT * FROM AppUsers WHERE user_id = ? LIMIT 1", [id], (err4, users) => {
            if (err4) return res.status(500).send(err4);
            if (users.length === 0)
              return res.status(401).json({ message: "Tài khoản không tồn tại." });
            if (users[0].is_banned)
              return res.status(403).json({ message: "Tài khoản của bạn đã bị ban." });

            return res.json({ ...users[0], account_id: id, email, role: 'user' });
          });
        });
      });
    }
  );
});

// =======================
// AUTH — SIGN UP
// =======================
app.post("/signup", (req, res) => {
  const { email, password, first_name, last_name } = req.body;
  if (!email || !password || !first_name || !last_name)
    return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin." });

  db.query("INSERT INTO Accounts (email, password) VALUES (?, ?)", [email, password], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY")
        return res.status(409).json({ message: "Email đã tồn tại." });
      return res.status(500).send(err);
    }
    const newId = result.insertId;
    db.query(
      "INSERT INTO AppUsers (user_id, first_name, last_name, is_banned) VALUES (?, ?, ?, 0)",
      [newId, first_name, last_name],
      (err2) => {
        if (err2) return res.status(500).send(err2);
        res.json({ message: "Đăng ký thành công!", user_id: newId });
      }
    );
  });
});

// =======================
// USERS
// =======================
app.get("/users", (req, res) => {
  db.query("SELECT * FROM appusers", (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// GET một user theo id
app.get("/users/:id", (req, res) => {
  db.query(
    "SELECT * FROM appusers WHERE user_id = ? LIMIT 1",
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).send(err);
      if (results.length === 0) return res.status(404).json({ message: "Không tìm thấy user." });
      const user = results[0];
      delete user.password;
      res.json(user);
    }
  );
});

// UPDATE profile user
app.put("/users/:id", (req, res) => {
  const { first_name, last_name, gender, date_of_birth } = req.body;
  db.query(
    "UPDATE appusers SET first_name=?, last_name=?, gender=?, date_of_birth=? WHERE user_id=?",
    [first_name, last_name, gender, date_of_birth, req.params.id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Đã cập nhật profile." });
    }
  );
});

// =======================
// CATEGORIES
// =======================
app.get("/categories", (req, res) => {
  db.query("SELECT * FROM categories", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// =======================
// THREADS — FULL CRUD
// =======================
app.get("/threads", (req, res) => {
  db.query("SELECT * FROM threads WHERE is_deleted = 0", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// Tạo thread mới (mod)
app.post("/threads", (req, res) => {
  const { title, category_id, created_by } = req.body;
  if (!title) return res.status(400).json({ message: "Tiêu đề không được để trống." });

  db.query(
    "INSERT INTO threads (title, category_id, created_by) VALUES (?, ?, ?)",
    [title, category_id || null, created_by || null],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Đã tạo thread.", thread_id: result.insertId });
    }
  );
});

// Xóa mềm thread (mod)
app.delete("/threads/:id", (req, res) => {
  const { deleted_by } = req.body;
  db.query(
    "UPDATE threads SET is_deleted=1, deleted_by=?, deleted_at=NOW() WHERE thread_id=?",
    [deleted_by || null, req.params.id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Đã xóa thread." });
    }
  );
});

// Khóa / mở khóa thread (mod)
app.put("/threads/:id/lock", (req, res) => {
  const { is_locked } = req.body;           // 0 hoặc 1
  db.query(
    "UPDATE threads SET is_locked=? WHERE thread_id=?",
    [is_locked, req.params.id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: `Thread ${is_locked ? "đã khóa" : "đã mở khóa"}.` });
    }
  );
});

// =======================
// MESSAGES — FULL CRUD
// =======================
app.get("/messages", (req, res) => {
  db.query("SELECT * FROM messages WHERE is_deleted = 0", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// Đăng bài mới + tạo notification
app.post("/messages", (req, res) => {
  const { content, user_id, thread_id } = req.body;

  db.query(
    "INSERT INTO messages (content, user_id, thread_id) VALUES (?, ?, ?)",
    [content, user_id, thread_id],
    (err, result) => {
      if (err) return res.status(500).send(err);
      const message_id = result.insertId;

      db.query(
        "SELECT user_id FROM subscribes WHERE thread_id = ? AND user_id != ?",
        [thread_id, user_id],
        (err2, users) => {
          if (err2) return res.status(500).send(err2);
          const values = users.map(u => [u.user_id, thread_id, message_id, 0, new Date()]);
          if (values.length > 0) {
            db.query(
              "INSERT INTO notifications (user_id, thread_id, message_id, is_read, created_at) VALUES ?",
              [values],
              (err3) => { if (err3) console.error(err3); }
            );
          }
          res.json({ message: "Đã đăng bài + tạo notification.", message_id });
        }
      );
    }
  );
});

// Sửa message (mod) — lưu lịch sử vào Modifying
app.put("/messages/:id", (req, res) => {
  const { content, mod_id } = req.body;
  db.query(
    "UPDATE messages SET content=? WHERE message_id=?",
    [content, req.params.id],
    (err) => {
      if (err) return res.status(500).send(err);

      // Ghi lịch sử chỉnh sửa
      db.query(
        "INSERT INTO modifying (mod_id, message_id, modified_at) VALUES (?, ?, NOW())",
        [mod_id || null, req.params.id],
        (err2) => {
          if (err2) console.error(err2);
          res.json({ message: "Đã sửa bài." });
        }
      );
    }
  );
});

// Xóa mềm message (mod)
app.delete("/messages/:id", (req, res) => {
  db.query(
    "UPDATE messages SET is_deleted=1 WHERE message_id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Đã xóa bài." });
    }
  );
});

// =======================
// SYSTEM SETTINGS
// =======================
app.get("/system-settings", (req, res) => {
  db.query("SELECT * FROM systemsettings", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

app.put("/system-settings", (req, res) => {
  const { setting_key, setting_value } = req.body;
  db.query(
    "UPDATE systemsettings SET setting_value=? WHERE setting_key=?",
    [setting_value, setting_key],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Đã cập nhật setting." });
    }
  );
});

// =======================
// BAN / UNBAN
// =======================
app.post("/ban", (req, res) => {
  const { user_id, mod_id, reason } = req.body;
  db.query("UPDATE appusers SET is_banned=1 WHERE user_id=?", [user_id], (err) => {
    if (err) return res.status(500).send(err);
    db.query(
      "INSERT INTO ban (mod_id, user_id, ban_date, reason) VALUES (?, ?, NOW(), ?)",
      [mod_id, user_id, reason],
      (err2) => {
        if (err2) return res.status(500).send(err2);
        res.json({ message: "User đã bị ban." });
      }
    );
  });
});

app.post("/unban", (req, res) => {
  const { user_id } = req.body;
  db.query("UPDATE appusers SET is_banned=0 WHERE user_id=?", [user_id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: "User đã được gỡ ban." });
  });
});

// =======================
// BAN HISTORY
// =======================
app.get("/ban-history", (req, res) => {
  db.query("SELECT * FROM ban ORDER BY ban_date DESC", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// =======================
// MANAGES (Mod list)
// =======================
app.get("/manages", (req, res) => {
  db.query("SELECT m.mod_id, m.mod_name FROM moderators m", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

app.delete("/manages/:mod_id", (req, res) => {
  const mod_id = req.params.mod_id;
  db.query("DELETE FROM manages WHERE mod_id=?", [mod_id], (err) => {
    if (err) return res.status(500).send(err);
    db.query("DELETE FROM moderators WHERE mod_id=?", [mod_id], (err2) => {
      if (err2) return res.status(500).send(err2);
      res.json({ message: "Đã xóa moderator." });
    });
  });
});

// =======================
// SUBSCRIBE
// =======================
app.post("/subscribe", (req, res) => {
  const { user_id, thread_id } = req.body;
  db.query(
    "INSERT INTO subscribes (user_id, thread_id) VALUES (?, ?)",
    [user_id, thread_id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Đã subscribe." });
    }
  );
});

app.delete("/subscribe", (req, res) => {
  const { user_id, thread_id } = req.body;
  db.query(
    "DELETE FROM subscribes WHERE user_id=? AND thread_id=?",
    [user_id, thread_id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Đã unsubscribe." });
    }
  );
});

app.get("/subscribes/:user_id", (req, res) => {
  db.query(
    "SELECT * FROM subscribes WHERE user_id=?",
    [req.params.user_id],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    }
  );
});

// =======================
// NOTIFICATIONS
// =======================
app.get("/notifications/:user_id", (req, res) => {
  db.query(
    "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC",
    [req.params.user_id],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    }
  );
});

app.put("/notifications/read/:id", (req, res) => {
  db.query(
    "UPDATE notifications SET is_read=1 WHERE notif_id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Đã đọc." });
    }
  );
});

// ── Start ─────────────────────────────────────────────────────
app.listen(3000, () => console.log("Server run at http://localhost:3000"));