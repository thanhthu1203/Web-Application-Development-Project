module.exports = function(app, db) {

  // GET Moderator profile by ID
  app.get("/moderators/:id", (req, res) => {
    const sql = `
      SELECT m.mod_id, m.mod_name, m.username, m.avatar,
             m.gender, m.date_of_birth, ac.email
      FROM Moderators m
      JOIN Accounts ac ON m.mod_id = ac.account_id
      WHERE m.mod_id = ? LIMIT 1
    `;
    db.query(sql, [req.params.id], (err, results) => {
      if (err) return res.status(500).send(err);
      if (results.length === 0)
        return res.status(404).json({ message: "Moderator not found." });
      res.json(results[0]);
    });
  });

  // UPDATE Moderator profile
  app.put("/moderators/:id", (req, res) => {
    const { username, name, gender, date_of_birth, avatar } = req.body;
    const modId = req.params.id;

    if (!username)
      return res.status(400).json({ message: "Username is required." });

    // Check username uniqueness (exclude current mod)
    db.query(
      "SELECT mod_id FROM Moderators WHERE username = ? AND mod_id != ? LIMIT 1",
      [username, modId],
      (errChk, rows) => {
        if (errChk) return res.status(500).send(errChk);
        if (rows.length > 0)
          return res.status(409).json({ message: "Username already taken." });

        db.query(
          `UPDATE Moderators
           SET username=?, mod_name=?, gender=?, date_of_birth=?, avatar=?
           WHERE mod_id=?`,
          [username, name || null, gender || null, date_of_birth || null, avatar || null, modId],
          (err) => {
            if (err) return res.status(500).send(err);
            res.json({ message: "Moderator profile updated successfully." });
          }
        );
      }
    );
  });

  // THREADS (Mod actions)
  app.post("/threads", (req, res) => {
    const { title, category_id, created_by } = req.body;
    if (!title)
      return res.status(400).json({ message: "Title cannot be empty." });
    db.query(
      "INSERT INTO threads (title, category_id, created_by) VALUES (?, ?, ?)",
      [title, category_id || null, created_by || null],
      (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ message: "Thread created successfully.", thread_id: result.insertId });
      }
    );
  });

  app.delete("/threads/:id", (req, res) => {
    const { deleted_by } = req.body;
    db.query(
      "UPDATE threads SET is_deleted=1, deleted_by=?, deleted_at=NOW() WHERE thread_id=?",
      [deleted_by || null, req.params.id],
      (err) => {
        if (err) return res.status(500).send(err);
        res.json({ message: "Thread deleted successfully." });
      }
    );
  });

  app.put("/threads/:id/lock", (req, res) => {
    const { is_locked } = req.body;
    db.query("UPDATE threads SET is_locked=? WHERE thread_id=?", [is_locked, req.params.id], (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: `Thread ${is_locked ? "locked" : "unlocked"}.` });
    });
  });

  // MESSAGES (Mod actions)
  app.put("/messages/:id", (req, res) => {
    const { content, mod_id } = req.body;
    db.query(
      "UPDATE messages SET content=? WHERE message_id=?",
      [content, req.params.id],
      (err) => {
        if (err) return res.status(500).send(err);
        db.query(
          "INSERT INTO Modifying (mod_id, message_id, modify_date) VALUES (?, ?, NOW())",
          [mod_id || null, req.params.id],
          (err2) => {
            if (err2) console.error(err2);
            res.json({ message: "Message updated successfully." });
          }
        );
      }
    );
  });

  app.delete("/messages/:id", (req, res) => {
    db.query("UPDATE messages SET is_deleted=1 WHERE message_id=?", [req.params.id], (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Message deleted successfully." });
    });
  });

  // BAN / UNBAN / BAN HISTORY
  app.post("/ban", (req, res) => {
    const { user_id, mod_id, reason } = req.body;
    db.query("UPDATE appusers SET is_banned=1 WHERE user_id=?", [user_id], (err) => {
      if (err) return res.status(500).send(err);
      db.query(
        "INSERT INTO ban (mod_id, user_id, ban_date, reason) VALUES (?, ?, NOW(), ?)",
        [mod_id, user_id, reason],
        (err2) => {
          if (err2) return res.status(500).send(err2);
          res.json({ message: "User banned successfully." });
        }
      );
    });
  });

  app.post("/unban", (req, res) => {
    const { user_id } = req.body;
    db.query("UPDATE appusers SET is_banned=0 WHERE user_id=?", [user_id], (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "User unbanned successfully." });
    });
  });

  app.get("/ban-history", (req, res) => {
    db.query("SELECT * FROM ban ORDER BY ban_date DESC", (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    });
  });
};