module.exports = function(app, db) {

  // GET Admin profile by ID
  app.get("/admins/:id", (req, res) => {
    const sql = `
      SELECT a.admin_id, a.admin_name, a.username, a.avatar,
             a.gender, a.date_of_birth, ac.email
      FROM Admins a
      JOIN Accounts ac ON a.admin_id = ac.account_id
      WHERE a.admin_id = ? LIMIT 1
    `;
    db.query(sql, [req.params.id], (err, results) => {
      if (err) return res.status(500).send(err);
      if (results.length === 0)
        return res.status(404).json({ message: "Admin not found." });
      res.json(results[0]);
    });
  });

  // UPDATE Admin profile
  app.put("/admins/:id", (req, res) => {
    const { username, name, gender, date_of_birth, avatar } = req.body;
    const adminId = req.params.id;

    if (!username)
      return res.status(400).json({ message: "Username is required." });

    // Check username uniqueness (exclude current admin)
    db.query(
      "SELECT admin_id FROM Admins WHERE username = ? AND admin_id != ? LIMIT 1",
      [username, adminId],
      (errChk, rows) => {
        if (errChk) return res.status(500).send(errChk);
        if (rows.length > 0)
          return res.status(409).json({ message: "Username already taken." });

        db.query(
          `UPDATE Admins
           SET username=?, admin_name=?, gender=?, date_of_birth=?, avatar=?
           WHERE admin_id=?`,
          [username, name || null, gender || null, date_of_birth || null, avatar || null, adminId],
          (err) => {
            if (err) return res.status(500).send(err);
            res.json({ message: "Admin profile updated successfully." });
          }
        );
      }
    );
  });

  // SYSTEM SETTINGS
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
        res.json({ message: "Setting updated successfully." });
      }
    );
  });

  // ==========================================
  // MANAGE MODERATORS
  // ==========================================

  // GET danh sách tất cả moderators
  app.get("/manages", (req, res) => {
    const sql = `
      SELECT m.mod_id, m.mod_name, m.username, ac.email
      FROM Moderators m
      JOIN Accounts ac ON m.mod_id = ac.account_id
      ORDER BY m.mod_id DESC
    `;
    db.query(sql, (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    });
  });

  // POST - Tạo moderator mới (Admin tạo)
  // Body: { email, username, mod_name, password (tùy chọn - nếu không có sẽ tạo random), gender, date_of_birth }
  app.post("/moderators", (req, res) => {
    const { email, username, mod_name, password, gender, date_of_birth } = req.body;

    // Validation
    if (!email || !username || !mod_name) {
      return res.status(400).json({ 
        message: "email, username, and mod_name are required." 
      });
    }

    // Kiểm tra email đã tồn tại chưa
    db.query(
      "SELECT account_id FROM Accounts WHERE email = ? LIMIT 1",
      [email],
      (err1, existing) => {
        if (err1) return res.status(500).send(err1);

        if (existing.length > 0) {
          return res.status(409).json({ message: "Email already exists." });
        }

        // Kiểm tra username đã tồn tại chưa
        db.query(
          "SELECT mod_id FROM Moderators WHERE username = ? LIMIT 1",
          [username],
          (err2, existingUser) => {
            if (err2) return res.status(500).send(err2);

            if (existingUser.length > 0) {
              return res.status(409).json({ message: "Username already taken." });
            }

            // Tạo password mặc định nếu không được cung cấp
            const bcrypt = require('bcrypt');
            const defaultPassword = password || 'Moderator@' + Math.random().toString(36).substring(7);

            // Hash password
            bcrypt.hash(defaultPassword, 10, (hashErr, hashedPassword) => {
              if (hashErr) return res.status(500).send(hashErr);

              // Tạo account
              db.query(
                "INSERT INTO Accounts (email, password) VALUES (?, ?)",
                [email, hashedPassword],
                (err3, result) => {
                  if (err3) return res.status(500).send(err3);

                  const newAccountId = result.insertId;

                  // Tạo moderator
                  db.query(
                    `INSERT INTO Moderators 
                     (mod_id, username, mod_name, gender, date_of_birth) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [newAccountId, username, mod_name, gender || null, date_of_birth || null],
                    (err4) => {
                      if (err4) return res.status(500).send(err4);

                      // Thêm vào manages table (track who manages this mod - mặc định là admin hiện tại)
                      // Nếu API có token của admin, lấy admin_id từ token
                      // Nếu không, để NULL hoặc gán mặc định
                      const adminId = req.body.admin_id || 1;
                      db.query(
                        "INSERT INTO manages (admin_id, mod_id) VALUES (?, ?)",
                        [adminId, newAccountId],
                        (err5) => {
                          if (err5) {
                            console.error("Warning: Could not add to manages table:", err5);
                            // Không fail, vì moderator đã được tạo
                          }

                          res.status(201).json({
                            message: "Moderator created successfully.",
                            mod_id: newAccountId,
                            username: username,
                            email: email,
                            temp_password: password ? "User provided" : defaultPassword
                          });
                        }
                      );
                    }
                  );
                }
              );
            });
          }
        );
      }
    );
  });

  // DELETE - Xóa moderator
  app.delete("/manages/:mod_id", (req, res) => {
    const mod_id = req.params.mod_id;

    // Kiểm tra moderator tồn tại không
    db.query(
      "SELECT mod_id FROM Moderators WHERE mod_id = ? LIMIT 1",
      [mod_id],
      (err, mods) => {
        if (err) return res.status(500).send(err);

        if (mods.length === 0) {
          return res.status(404).json({ message: "Moderator not found." });
        }

        // Xóa từ manages table
        db.query("DELETE FROM manages WHERE mod_id = ?", [mod_id], (err2) => {
          if (err2) {
            console.error("Error deleting from manages:", err2);
            return res.status(500).send(err2);
          }

          // Xóa từ Moderators table
          db.query("DELETE FROM Moderators WHERE mod_id = ?", [mod_id], (err3) => {
            if (err3) return res.status(500).send(err3);

            // Xóa từ Accounts table
            db.query("DELETE FROM Accounts WHERE account_id = ?", [mod_id], (err4) => {
              if (err4) {
                console.error("Error deleting from accounts:", err4);
                return res.status(500).send(err4);
              }

              res.json({ message: "Moderator deleted successfully." });
            });
          });
        });
      }
    );
  });
};