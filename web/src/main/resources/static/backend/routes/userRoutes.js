// 


// test code dưới đây
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

  // ==========================================
  // CATEGORIES & THREADS
  // ==========================================
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

  // ==========================================
  // MESSAGES - GET
  // ==========================================
  app.get("/messages", (req, res) => {
    db.query("SELECT * FROM messages WHERE is_deleted = 0 ORDER BY posted_date DESC", (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    });
  });

  // GET chi tiết 1 message + nested comments + reactions
  app.get("/messages/:id/full", (req, res) => {
    const messageId = req.params.id;
    
    // Lấy message gốc + author info
    const sqlMessage = `
      SELECT m.*, 
             u.user_id, CONCAT(u.first_name, ' ', u.last_name) as author_name,
             COUNT(DISTINCT reply.message_id) as reply_count
      FROM messages m
      JOIN appusers u ON m.user_id = u.user_id
      LEFT JOIN messages reply ON reply.parent_id = m.message_id AND reply.is_deleted = 0
      WHERE m.message_id = ? AND m.is_deleted = 0
      GROUP BY m.message_id
      LIMIT 1
    `;
    
    db.query(sqlMessage, [messageId], (err, messages) => {
      if (err) return res.status(500).send(err);
      if (messages.length === 0) return res.status(404).json({ message: "Message not found." });
      
      const message = messages[0];
      
      // Lấy nested comments (replies)
      const sqlComments = `
        SELECT m.*, 
               u.user_id, CONCAT(u.first_name, ' ', u.last_name) as author_name
        FROM messages m
        JOIN appusers u ON m.user_id = u.user_id
        WHERE m.parent_id = ? AND m.is_deleted = 0
        ORDER BY m.posted_date ASC
      `;
      
      db.query(sqlComments, [messageId], (err2, comments) => {
        if (err2) return res.status(500).send(err2);
        
        // Lấy reactions của message
        const sqlReactions = `
          SELECT emoji, COUNT(*) as count 
          FROM reactions 
          WHERE message_id = ? 
          GROUP BY emoji
        `;
        
        db.query(sqlReactions, [messageId], (err3, reactions) => {
          if (err3) return res.status(500).send(err3);
          
          res.json({
            message,
            comments,
            reactions: reactions || []
          });
        });
      });
    });
  });

  // GET comments của 1 message
  app.get("/messages/:id/comments", (req, res) => {
    const sql = `
      SELECT m.*, CONCAT(u.first_name, ' ', u.last_name) AS author_name 
      FROM messages m 
      JOIN AppUsers u ON m.user_id = u.user_id 
      WHERE m.parent_id = ? AND m.is_deleted = 0 
      ORDER BY m.posted_date ASC
    `;
    db.query(sql, [req.params.id], (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    });
  });

  // ==========================================
  // MESSAGES - CREATE
  // ==========================================
  app.post("/messages", (req, res) => {
    const { content, user_id, thread_id, parent_id } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Content cannot be empty." });
    }
    
    db.query("INSERT INTO messages (content, user_id, thread_id, parent_id) VALUES (?, ?, ?, ?)",
      [content, user_id, thread_id, parent_id || null],
      (err, result) => {
        if (err) return res.status(500).send(err);
        const message_id = result.insertId;
        
        // Nếu là message gốc (không phải reply), gửi notification cho subscribers
        if (!parent_id) {
          db.query(
            "SELECT user_id FROM subscribes WHERE thread_id = ? AND user_id != ?", 
            [thread_id, user_id], 
            (err2, users) => {
              if (err2) {
                console.error(err2);
              } else if (users.length > 0) {
                const values = users.map(u => [u.user_id, thread_id, message_id, 0, new Date()]);
                db.query(
                  "INSERT INTO notifications (user_id, thread_id, message_id, is_read, created_at) VALUES ?", 
                  [values],
                  (err3) => {
                    if (err3) console.error(err3);
                  }
                );
              }
            }
          );
        }
        
        res.json({ message: "Message posted successfully.", message_id });
      }
    );
  });

  // ==========================================
  // MESSAGES - EDIT (User có thể edit message của mình)
  // ==========================================
  app.put("/messages/:id", (req, res) => {
    const { content, user_id } = req.body;
    const messageId = req.params.id;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Content cannot be empty." });
    }
    
    // Kiểm tra message có tồn tại và user có phải tác giả không
    db.query("SELECT * FROM messages WHERE message_id = ? LIMIT 1", [messageId], (err, messages) => {
      if (err) return res.status(500).send(err);
      if (messages.length === 0) return res.status(404).json({ message: "Message not found." });
      
      const msg = messages[0];
      if (msg.user_id !== user_id) {
        return res.status(403).json({ message: "You can only edit your own messages." });
      }
      
      // Update message
      db.query("UPDATE messages SET content = ? WHERE message_id = ?", [content.trim(), messageId], (err2) => {
        if (err2) return res.status(500).send(err2);
        res.json({ message: "Message updated successfully." });
      });
    });
  });

  // ==========================================
  // MESSAGES - DELETE (Soft delete)
  // ==========================================
  app.delete("/messages/:id", (req, res) => {
    const { user_id } = req.body;
    const messageId = req.params.id;
    
    // Kiểm tra message có tồn tại và user có phải tác giả không
    db.query("SELECT * FROM messages WHERE message_id = ? LIMIT 1", [messageId], (err, messages) => {
      if (err) return res.status(500).send(err);
      if (messages.length === 0) return res.status(404).json({ message: "Message not found." });
      
      const msg = messages[0];
      if (msg.user_id !== user_id) {
        return res.status(403).json({ message: "You can only delete your own messages." });
      }
      
      // Soft delete
      db.query(
        "UPDATE messages SET is_deleted = 1, deleted_at = NOW() WHERE message_id = ?",
        [messageId],
        (err2) => {
          if (err2) return res.status(500).send(err2);
          res.json({ message: "Message deleted successfully." });
        }
      );
    });
  });

  // ==========================================
  // REACTIONS - Emoji reactions
  // ==========================================
  
  // GET reactions của 1 message
  app.get("/messages/:id/reactions", (req, res) => {
    const sql = `
      SELECT emoji, COUNT(*) as count, 
             GROUP_CONCAT(CONCAT(u.first_name, ' ', u.last_name)) as users
      FROM reactions r
      JOIN appusers u ON r.user_id = u.user_id
      WHERE r.message_id = ?
      GROUP BY emoji
    `;
    db.query(sql, [req.params.id], (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result || []);
    });
  });

  // POST - Thêm reaction
  app.post("/reactions", (req, res) => {
    const { message_id, user_id, emoji } = req.body;
    
    if (!message_id || !user_id || !emoji) {
      return res.status(400).json({ message: "Invalid reaction data." });
    }
    
    // Kiểm tra user đã react emoji này chưa
    db.query(
      "SELECT * FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ? LIMIT 1",
      [message_id, user_id, emoji],
      (err, existing) => {
        if (err) return res.status(500).send(err);
        
        if (existing.length > 0) {
          // User đã react cái emoji này rồi, xóa đi (toggle)
          db.query(
            "DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?",
            [message_id, user_id, emoji],
            (err2) => {
              if (err2) return res.status(500).send(err2);
              res.json({ message: "Reaction removed.", action: "removed" });
            }
          );
        } else {
          // Thêm reaction mới
          db.query(
            "INSERT INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)",
            [message_id, user_id, emoji],
            (err2) => {
              if (err2) return res.status(500).send(err2);
              res.json({ message: "Reaction added.", action: "added" });
            }
          );
        }
      }
    );
  });

  // DELETE reaction
  app.delete("/reactions/:id", (req, res) => {
    db.query("DELETE FROM reactions WHERE reaction_id = ?", [req.params.id], (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Reaction deleted." });
    });
  });

  // ==========================================
  // SUBSCRIBE & NOTIFICATIONS
  // ==========================================
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