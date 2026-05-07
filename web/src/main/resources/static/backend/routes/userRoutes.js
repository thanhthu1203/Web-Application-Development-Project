module.exports = function(app, db) {
  // USERS
  app.get("/users", (req, res) => {
    const sql = `SELECT u.*, a.email FROM AppUsers u JOIN Accounts a ON u.user_id = a.account_id`;
    db.query(sql, (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    });
  });

  app.get("/users/:id", (req, res) => {
    const sql = `SELECT u.*, a.email FROM AppUsers u JOIN Accounts a ON u.user_id = a.account_id WHERE u.user_id = ? LIMIT 1`;
    db.query(sql, [req.params.id], (err, results) => {
      if (err) return res.status(500).send(err);
      if (results.length === 0) return res.status(404).json({ message: "User not found." });
      res.json(results[0]);
    });
  });

  app.put("/users/:id", (req, res) => {
    const { first_name, last_name, gender, date_of_birth } = req.body;
    db.query("UPDATE appusers SET first_name=?, last_name=?, gender=?, date_of_birth=? WHERE user_id=?",
      [first_name, last_name, gender, date_of_birth, req.params.id],
      (err) => {
        if (err) return res.status(500).send(err);
        res.json({ message: "Profile updated successfully." });
      }
    );
  });

  // CATEGORIES & THREADS
  app.get("/categories", (req, res) => {
    db.query("SELECT * FROM categories", (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    });
  });

  app.get("/threads", (req, res) => {
    db.query("SELECT * FROM threads WHERE is_deleted = 0", (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    });
  });

  // MESSAGES
  app.get("/messages", (req, res) => {
    db.query("SELECT * FROM messages WHERE is_deleted = 0", (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    });
  });

  app.get("/messages/:id/comments", (req, res) => {
    const sql = `SELECT m.*, CONCAT(u.first_name, ' ', u.last_name) AS author_name FROM messages m JOIN AppUsers u ON m.user_id = u.user_id WHERE m.parent_id = ? AND m.is_deleted = 0 ORDER BY m.posted_date ASC`;
    db.query(sql, [req.params.id], (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    });
  });

  app.post("/messages", (req, res) => {
    const { content, user_id, thread_id, parent_id } = req.body;
    db.query("INSERT INTO messages (content, user_id, thread_id, parent_id) VALUES (?, ?, ?, ?)",
      [content, user_id, thread_id, parent_id || null],
      (err, result) => {
        if (err) return res.status(500).send(err);
        const message_id = result.insertId;
        if (!parent_id) {
          db.query("SELECT user_id FROM subscribes WHERE thread_id = ? AND user_id != ?", [thread_id, user_id], (err2, users) => {
              if (err2) return res.status(500).send(err2);
              const values = users.map(u => [u.user_id, thread_id, message_id, 0, new Date()]);
              if (values.length > 0) {
                db.query("INSERT INTO notifications (user_id, thread_id, message_id, is_read, created_at) VALUES ?", [values]);
              }
            }
          );
        }
        res.json({ message: "Message posted successfully.", message_id });
      }
    );
  });

  // SUBSCRIBE & NOTIFICATIONS
  app.post("/subscribe", (req, res) => {
    const { user_id, thread_id } = req.body;
    db.query("INSERT INTO subscribes (user_id, thread_id) VALUES (?, ?)", [user_id, thread_id], (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Subscribed successfully." });
    });
  });

  app.delete("/subscribe", (req, res) => {
    const { user_id, thread_id } = req.body;
    db.query("DELETE FROM subscribes WHERE user_id=? AND thread_id=?", [user_id, thread_id], (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Unsubscribed successfully." });
    });
  });

  app.get("/subscribes/:user_id", (req, res) => {
    db.query("SELECT * FROM subscribes WHERE user_id=?", [req.params.user_id], (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    });
  });

  app.get("/notifications/:user_id", (req, res) => {
    db.query("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC", [req.params.user_id], (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    });
  });

  app.put("/notifications/read/:id", (req, res) => {
    db.query("UPDATE notifications SET is_read=1 WHERE notif_id=?", [req.params.id], (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Notification marked as read." });
    });
  });
};