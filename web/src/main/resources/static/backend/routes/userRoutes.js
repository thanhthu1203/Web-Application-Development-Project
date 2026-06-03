// module.exports = function(app, db) {

//   // user routes

//   // Lấy tất cả người dùng
//   app.get("/users", (req, res) => {
//     const sql = `SELECT u.*, a.email FROM AppUsers u JOIN Accounts a ON u.user_id = a.account_id`;
//     db.query(sql, (err, results) => {
//       if (err) return res.status(500).send(err);
//       res.json(results);
//     });
//   });

//   // Lấy thông tin một người dùng theo ID
//   app.get("/users/:id", (req, res) => {
//     const sql = `
//       SELECT u.*, a.email
//       FROM AppUsers u
//       JOIN Accounts a ON u.user_id = a.account_id
//       WHERE u.user_id = ? LIMIT 1
//     `;
//     db.query(sql, [req.params.id], (err, results) => {
//       if (err) return res.status(500).send(err);
//       if (results.length === 0)
//         return res.status(404).json({ message: "User not found." });
//       res.json(results[0]);
//     });
//   });

//   // Cập nhật hồ sơ người dùng (username, name, gender, dob, avatar)
//   app.put("/users/:id", (req, res) => {
//     const { username, first_name, last_name, gender, date_of_birth, avatar } = req.body;
//     const userId = req.params.id;

//     if (!username || !first_name || !last_name)
//       return res.status(400).json({ message: "Username, first name and last name are required." });

//     // Kiểm tra username duy nhất (loại trừ người dùng hiện tại)
//     db.query(
//       "SELECT user_id FROM AppUsers WHERE username = ? AND user_id != ? LIMIT 1",
//       [username, userId],
//       (errChk, rows) => {
//         if (errChk) return res.status(500).send(errChk);
//         if (rows.length > 0)
//           return res.status(409).json({ message: "Username already taken." });

//         db.query(
//           `UPDATE AppUsers
//            SET username=?, first_name=?, last_name=?, gender=?, date_of_birth=?, avatar=?
//            WHERE user_id=?`,
//           [username, first_name, last_name, gender || null, date_of_birth || null, avatar || null, userId],
//           (err) => {
//             if (err) return res.status(500).send(err);
//             res.json({ message: "Profile updated successfully." });
//           }
//         );
//       }
//     );
//   });

//   // categories & threads

//   app.get("/categories", (req, res) => {
//     db.query("SELECT * FROM categories", (err, result) => {
//       if (err) return res.status(500).send(err);
//       res.json(result);
//     });
//   });

//   app.get("/threads", (req, res) => {
//     db.query("SELECT * FROM threads WHERE is_deleted = 0", (err, result) => {
//       if (err) return res.status(500).send(err);
//       res.json(result);
//     });
//   });

//   // messages - GET
  
//   // Lấy danh sách tin nhắn cùng với thông tin người đăng (hỗ trợ cả AppUsers, Moderators, Admins)
//   app.get("/messages", (req, res) => {
//     const sql = `
//       SELECT m.*,
//              COALESCE(u.username, mod_u.username, adm.username, CONCAT(u.first_name, ' ', u.last_name), mod_u.mod_name, adm.admin_name) AS author_name,
//              COALESCE(u.avatar, mod_u.avatar, adm.avatar) AS author_avatar
//       FROM messages m
//       LEFT JOIN appusers u ON m.user_id = u.user_id
//       LEFT JOIN moderators mod_u ON m.user_id = mod_u.mod_id
//       LEFT JOIN admins adm ON m.user_id = adm.admin_id
//       WHERE m.is_deleted = 0
//       ORDER BY m.posted_date DESC
//     `;
//     db.query(sql, (err, result) => {
//       if (err) return res.status(500).send(err);
//       res.json(result);
//     });
//   });

//   // Lấy chi tiết tin nhắn + bình luận lồng nhau + lượt thả cảm xúc
//   app.get("/messages/:id/full", (req, res) => {
//     const messageId = req.params.id;

//     // Lấy tin nhắn gốc kèm thông tin tác giả đồng nhất
//     const sqlMessage = `
//       SELECT m.*,
//              COALESCE(u.username, mod_u.username, adm.username, CONCAT(u.first_name, ' ', u.last_name), mod_u.mod_name, adm.admin_name) AS author_name,
//              COALESCE(u.avatar, mod_u.avatar, adm.avatar) AS author_avatar,
//              COUNT(DISTINCT reply.message_id) AS reply_count
//       FROM messages m
//       LEFT JOIN appusers u ON m.user_id = u.user_id
//       LEFT JOIN moderators mod_u ON m.user_id = mod_u.mod_id
//       LEFT JOIN admins adm ON m.user_id = adm.admin_id
//       LEFT JOIN messages reply ON reply.parent_id = m.message_id AND reply.is_deleted = 0
//       WHERE m.message_id = ? AND m.is_deleted = 0
//       GROUP BY m.message_id
//       LIMIT 1
//     `;

//     db.query(sqlMessage, [messageId], (err, messages) => {
//       if (err) return res.status(500).send(err);
//       if (messages.length === 0)
//         return res.status(404).json({ message: "Message not found." });

//       const message = messages[0];

//       // Lấy bình luận lồng nhau (hỗ trợ đến cấp 2)
//       const sqlComments = `
//         SELECT m.*,
//                COALESCE(u.username, mod_u.username, adm.username, CONCAT(u.first_name, ' ', u.last_name), mod_u.mod_name, adm.admin_name) AS author_name,
//                COALESCE(u.avatar, mod_u.avatar, adm.avatar) AS author_avatar
//         FROM messages m
//         LEFT JOIN appusers u ON m.user_id = u.user_id
//         LEFT JOIN moderators mod_u ON m.user_id = mod_u.mod_id
//         LEFT JOIN admins adm ON m.user_id = adm.admin_id
//         WHERE (m.parent_id = ? OR m.parent_id IN (SELECT message_id FROM messages WHERE parent_id = ?))
//           AND m.is_deleted = 0
//         ORDER BY m.posted_date ASC
//       `;

//       db.query(sqlComments, [messageId, messageId], (err2, comments) => {
//         if (err2) return res.status(500).send(err2);

//         const sqlReactions = `
//           SELECT emoji, COUNT(*) AS count,
//                  GROUP_CONCAT(user_id) AS user_ids
//           FROM reactions
//           WHERE message_id = ?
//           GROUP BY emoji
//         `;

//         db.query(sqlReactions, [messageId], (err3, reactions) => {
//           if (err3) return res.status(500).send(err3);
//           res.json({ message, comments, reactions: reactions || [] });
//         });
//       });
//     });
//   });

//   // Lấy bình luận của một tin nhắn (route phụ trợ)
//   app.get("/messages/:id/comments", (req, res) => {
//     const sql = `
//       SELECT m.*,
//              COALESCE(u.username, mod_u.username, adm.username, CONCAT(u.first_name, ' ', u.last_name), mod_u.mod_name, adm.admin_name) AS author_name,
//              COALESCE(u.avatar, mod_u.avatar, adm.avatar) AS author_avatar
//       FROM messages m
//       LEFT JOIN appusers u ON m.user_id = u.user_id
//       LEFT JOIN moderators mod_u ON m.user_id = mod_u.mod_id
//       LEFT JOIN admins adm ON m.user_id = adm.admin_id
//       WHERE m.parent_id = ? AND m.is_deleted = 0
//       ORDER BY m.posted_date ASC
//     `;
//     db.query(sql, [req.params.id], (err, result) => {
//       if (err) return res.status(500).send(err);
//       res.json(result);
//     });
//   });

// // messages - create
// app.post("/messages", (req, res) => {
//   const { content, user_id, thread_id, parent_id } = req.body;
  
//   if (!content || !content.trim())
//     return res.status(400).json({ message: "Content cannot be empty." });

//   // 1. Kiểm tra xem thread có bị khóa không trước khi cho phép post
//   db.query(
//     "SELECT is_locked FROM threads WHERE thread_id = ? LIMIT 1",
//     [thread_id],
//     (err, threads) => {
//       if (err) return res.status(500).send(err);

//       if (threads.length === 0) {
//         return res.status(404).json({ message: "Thread not found." });
//       }

//       // Nếu thread đã bị khóa (is_locked = 1), từ chối lưu và trả về lỗi 403
//       if (threads[0].is_locked === 1) {
//         return res.status(403).json({ message: "This thread is locked. You cannot post messages here." });
//       }

//       // 2. Nếu thread vẫn mở (is_locked = 0), tiến hành insert tin nhắn bình thường
//       db.query(
//         "INSERT INTO messages (content, user_id, thread_id, parent_id) VALUES (?, ?, ?, ?)",
//         [content, user_id, thread_id, parent_id || null],
//         (err2, result) => {
//           if (err2) return res.status(500).send(err2);
//           const message_id = result.insertId;

//           if (!parent_id) {
//             db.query(
//               "SELECT user_id FROM subscribes WHERE thread_id = ? AND user_id != ?",
//               [thread_id, user_id],
//               (err3, users) => {
//                 if (!err3 && users.length > 0) {
//                   const values = users.map(u => [u.user_id, thread_id, message_id, 0, new Date()]);
//                   db.query(
//                     "INSERT INTO notifications (user_id, thread_id, message_id, is_read, created_at) VALUES ?",
//                     [values],
//                     (err4) => { if (err4) console.error(err4); }
//                   );
//                 }
//               }
//             );
//           }
//           res.json({ message: "Message posted successfully.", message_id });
//         }
//       );
//     }
//   );
// });

//   // messages - edit (người dùng chỉ có thể sửa tin nhắn của mình)

//   app.put("/messages/:id", (req, res) => {
//     const { content, user_id } = req.body;
//     const messageId = req.params.id;

//     if (!content || !content.trim())
//       return res.status(400).json({ message: "Content cannot be empty." });

//     // Kiểm tra tin nhắn có tồn tại và người dùng có quyền edit không
//     db.query("SELECT * FROM messages WHERE message_id = ? LIMIT 1", [messageId], (err, messages) => {
//       if (err) return res.status(500).send(err);
//       if (messages.length === 0)
//         return res.status(404).json({ message: "Message not found." });

//       if (messages[0].user_id !== user_id)
//         return res.status(403).json({ message: "You can only edit your own messages." });

//       // Update message content và timestamp (để track khi edit)
//       db.query(
//         "UPDATE messages SET content = ?, last_edited_at = NOW() WHERE message_id = ?",
//         [content.trim(), messageId],
//         (err2) => {
//           if (err2) return res.status(500).send(err2);
//           res.json({ message: "Message updated successfully." });
//         }
//       );
//     });
//   });


//   // messages - delete (xóa mềm)

//   app.delete("/messages/:id", (req, res) => {
//     const { user_id } = req.body;
//     const messageId = req.params.id;

//     db.query("SELECT * FROM messages WHERE message_id = ? LIMIT 1", [messageId], (err, messages) => {
//       if (err) return res.status(500).send(err);
//       if (messages.length === 0)
//         return res.status(404).json({ message: "Message not found." });

//       if (messages[0].user_id !== user_id)
//         return res.status(403).json({ message: "You can only delete your own messages." });

//       db.query(
//         "UPDATE messages SET is_deleted = 1, deleted_at = NOW() WHERE message_id = ?",
//         [messageId],
//         (err2) => {
//           if (err2) return res.status(500).send(err2);
//           res.json({ message: "Message deleted successfully." });
//         }
//       );
//     });
//   });

//   // reactions

//   app.get("/messages/:id/reactions", (req, res) => {
//     const sql = `
//       SELECT r.emoji, COUNT(*) AS count,
//              GROUP_CONCAT(r.user_id) AS user_ids,
//              GROUP_CONCAT(COALESCE(u.username, mod_u.username, adm.username, CONCAT(u.first_name, ' ', u.last_name), mod_u.mod_name, adm.admin_name)) AS users
//       FROM reactions r
//       LEFT JOIN appusers u ON r.user_id = u.user_id
//       LEFT JOIN moderators mod_u ON r.user_id = mod_u.mod_id
//       LEFT JOIN admins adm ON r.user_id = adm.admin_id
//       WHERE r.message_id = ?
//       GROUP BY r.emoji
//     `;
//     db.query(sql, [req.params.id], (err, result) => {
//       if (err) return res.status(500).send(err);
//       res.json(result || []);
//     });
//   });

//   app.post("/reactions", (req, res) => {
//     const { message_id, user_id, emoji } = req.body;
//     if (!message_id || !user_id || !emoji)
//       return res.status(400).json({ message: "Invalid reaction data." });

//     db.query(
//       "SELECT * FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ? LIMIT 1",
//       [message_id, user_id, emoji],
//       (err, existing) => {
//         if (err) return res.status(500).send(err);

//         if (existing.length > 0) {
//           db.query(
//             "DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?",
//             [message_id, user_id, emoji],
//             (err2) => {
//               if (err2) return res.status(500).send(err2);
//               res.json({ message: "Reaction removed.", action: "removed" });
//             }
//           );
//         } else {
//           db.query(
//             "INSERT INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)",
//             [message_id, user_id, emoji],
//             (err2) => {
//               if (err2) return res.status(500).send(err2);
//               res.json({ message: "Reaction added.", action: "added" });
//             }
//           );
//         }
//       }
//     );
//   });

//   app.delete("/reactions/:id", (req, res) => {
//     db.query("DELETE FROM reactions WHERE reaction_id = ?", [req.params.id], (err) => {
//       if (err) return res.status(500).send(err);
//       res.json({ message: "Reaction deleted." });
//     });
//   });


//   // subscribes & notifications

//   // subscribes & notifications
//   app.post("/subscribe", (req, res) => {
//     const { user_id, thread_id } = req.body;

//     // 1. Kiểm tra xem thread có bị khóa không trước khi cho phép subscribe
//     db.query(
//       "SELECT is_locked FROM threads WHERE thread_id = ? LIMIT 1",
//       [thread_id],
//       (err, threads) => {
//         if (err) return res.status(500).send(err);
        
//         // Nếu thread không tồn tại
//         if (threads.length === 0) {
//           return res.status(404).json({ message: "Thread not found." });
//         }
        
//         // Nếu thread đã bị khóa
//         if (threads[0].is_locked === 1) {
//           return res.status(403).json({ message: "This thread is locked. You cannot subscribe." });
//         }

//         // 2. Nếu hợp lệ, tiến hành subscribe
//         db.query(
//           "INSERT INTO subscribes (user_id, thread_id) VALUES (?, ?)", 
//           [user_id, thread_id], 
//           (errInsert) => {
//             if (errInsert) return res.status(500).send(errInsert);
//             res.json({ message: "Subscribed successfully." });
//           }
//         );
//       }
//     );
//   });

//   app.delete("/subscribe", (req, res) => {
//     const { user_id, thread_id } = req.body;
//     db.query("DELETE FROM subscribes WHERE user_id=? AND thread_id=?", [user_id, thread_id], (err) => {
//       if (err) return res.status(500).send(err);
//       res.json({ message: "Unsubscribed successfully." });
//     });
//   });

//   app.get("/subscribes/:user_id", (req, res) => {
//     db.query("SELECT * FROM subscribes WHERE user_id=?", [req.params.user_id], (err, result) => {
//       if (err) return res.status(500).send(err);
//       res.json(result);
//     });
//   });

//   app.get("/notifications/:user_id", (req, res) => {
//     db.query(
//       "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC",
//       [req.params.user_id],
//       (err, result) => {
//         if (err) return res.status(500).send(err);
//         res.json(result);
//       }
//     );
//   });

//   app.put("/notifications/read/:id", (req, res) => {
//     db.query("UPDATE notifications SET is_read=1 WHERE notif_id=?", [req.params.id], (err) => {
//       if (err) return res.status(500).send(err);
//       res.json({ message: "Notification marked as read." });
//     });
//   });
// };

module.exports = function(app, db) {

  // user routes

  // Lấy tất cả người dùng
  app.get("/users", (req, res) => {
    const sql = `SELECT u.*, a.email FROM AppUsers u JOIN Accounts a ON u.user_id = a.account_id`;
    db.query(sql, (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    });
  });

  // Lấy thông tin một người dùng theo ID
  app.get("/users/:id", (req, res) => {
    const sql = `
      SELECT u.*, a.email
      FROM AppUsers u
      JOIN Accounts a ON u.user_id = a.account_id
      WHERE u.user_id = ? LIMIT 1
    `;
    db.query(sql, [req.params.id], (err, results) => {
      if (err) return res.status(500).send(err);
      if (results.length === 0)
        return res.status(404).json({ message: "User not found." });
      res.json(results[0]);
    });
  });

  // Cập nhật hồ sơ người dùng (username, name, gender, dob, avatar)
  app.put("/users/:id", (req, res) => {
    const { username, first_name, last_name, gender, date_of_birth, avatar } = req.body;
    const userId = req.params.id;

    if (!username || !first_name || !last_name)
      return res.status(400).json({ message: "Username, first name and last name are required." });

    // Kiểm tra username duy nhất (loại trừ người dùng hiện tại)
    db.query(
      "SELECT user_id FROM AppUsers WHERE username = ? AND user_id != ? LIMIT 1",
      [username, userId],
      (errChk, rows) => {
        if (errChk) return res.status(500).send(errChk);
        if (rows.length > 0)
          return res.status(409).json({ message: "Username already taken." });

        db.query(
          `UPDATE AppUsers
           SET username=?, first_name=?, last_name=?, gender=?, date_of_birth=?, avatar=?
           WHERE user_id=?`,
          [username, first_name, last_name, gender || null, date_of_birth || null, avatar || null, userId],
          (err) => {
            if (err) return res.status(500).send(err);
            res.json({ message: "Profile updated successfully." });
          }
        );
      }
    );
  });

  // categories & threads

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

  // Search threads by keyword (title) and optional category filter
  app.get("/threads/search", (req, res) => {
    const keyword = (req.query.q || "").trim();
    const categoryId = req.query.category_id || null;

    let sql = "SELECT * FROM threads WHERE is_deleted = 0";
    const params = [];

    if (keyword) {
      sql += " AND title LIKE ?";
      params.push(`%${keyword}%`);
    }

    if (categoryId) {
      sql += " AND category_id = ?";
      params.push(categoryId);
    }

    sql += " ORDER BY created_at DESC";

    db.query(sql, params, (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    });
  });

  // messages - GET
  
  // Lấy danh sách tin nhắn cùng với thông tin người đăng (hỗ trợ cả AppUsers, Moderators, Admins)
  // Lấy message, bỏ qua message thuộc thread đã bị xóa
app.get("/messages", (req, res) => {
    const sql = `
      SELECT m.*,
             COALESCE(u.username, mod_u.username, adm.username, CONCAT(u.first_name, ' ', u.last_name), mod_u.mod_name, adm.admin_name) AS author_name,
             COALESCE(u.avatar, mod_u.avatar, adm.avatar) AS author_avatar
      FROM messages m
      INNER JOIN threads t ON m.thread_id = t.thread_id AND t.is_deleted = 0
      LEFT JOIN appusers u ON m.user_id = u.user_id
      LEFT JOIN moderators mod_u ON m.user_id = mod_u.mod_id
      LEFT JOIN admins adm ON m.user_id = adm.admin_id
      WHERE m.is_deleted = 0
      ORDER BY m.posted_date DESC
    `;
    db.query(sql, (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    });
  });

  // Lấy chi tiết tin nhắn + bình luận lồng nhau + lượt thả cảm xúc
  app.get("/messages/:id/full", (req, res) => {
    const messageId = req.params.id;

    // Lấy tin nhắn gốc kèm thông tin tác giả đồng nhất
    const sqlMessage = `
      SELECT m.*,
             COALESCE(u.username, mod_u.username, adm.username, CONCAT(u.first_name, ' ', u.last_name), mod_u.mod_name, adm.admin_name) AS author_name,
             COALESCE(u.avatar, mod_u.avatar, adm.avatar) AS author_avatar,
             COUNT(DISTINCT reply.message_id) AS reply_count
      FROM messages m
      LEFT JOIN appusers u ON m.user_id = u.user_id
      LEFT JOIN moderators mod_u ON m.user_id = mod_u.mod_id
      LEFT JOIN admins adm ON m.user_id = adm.admin_id
      LEFT JOIN messages reply ON reply.parent_id = m.message_id AND reply.is_deleted = 0
      WHERE m.message_id = ? AND m.is_deleted = 0
      GROUP BY m.message_id
      LIMIT 1
    `;

    db.query(sqlMessage, [messageId], (err, messages) => {
      if (err) return res.status(500).send(err);
      if (messages.length === 0)
        return res.status(404).json({ message: "Message not found." });

      const message = messages[0];

      // Lấy bình luận lồng nhau (hỗ trợ đến cấp 2)
      const sqlComments = `
        SELECT m.*,
               COALESCE(u.username, mod_u.username, adm.username, CONCAT(u.first_name, ' ', u.last_name), mod_u.mod_name, adm.admin_name) AS author_name,
               COALESCE(u.avatar, mod_u.avatar, adm.avatar) AS author_avatar
        FROM messages m
        LEFT JOIN appusers u ON m.user_id = u.user_id
        LEFT JOIN moderators mod_u ON m.user_id = mod_u.mod_id
        LEFT JOIN admins adm ON m.user_id = adm.admin_id
        WHERE (m.parent_id = ? OR m.parent_id IN (SELECT message_id FROM messages WHERE parent_id = ?))
          AND m.is_deleted = 0
        ORDER BY m.posted_date ASC
      `;

      db.query(sqlComments, [messageId, messageId], (err2, comments) => {
        if (err2) return res.status(500).send(err2);

        const sqlReactions = `
          SELECT emoji, COUNT(*) AS count,
                 GROUP_CONCAT(user_id) AS user_ids
          FROM reactions
          WHERE message_id = ?
          GROUP BY emoji
        `;

        db.query(sqlReactions, [messageId], (err3, reactions) => {
          if (err3) return res.status(500).send(err3);
          res.json({ message, comments, reactions: reactions || [] });
        });
      });
    });
  });

  // Lấy bình luận của một tin nhắn (route phụ trợ)
  app.get("/messages/:id/comments", (req, res) => {
    const sql = `
      SELECT m.*,
             COALESCE(u.username, mod_u.username, adm.username, CONCAT(u.first_name, ' ', u.last_name), mod_u.mod_name, adm.admin_name) AS author_name,
             COALESCE(u.avatar, mod_u.avatar, adm.avatar) AS author_avatar
      FROM messages m
      LEFT JOIN appusers u ON m.user_id = u.user_id
      LEFT JOIN moderators mod_u ON m.user_id = mod_u.mod_id
      LEFT JOIN admins adm ON m.user_id = adm.admin_id
      WHERE m.parent_id = ? AND m.is_deleted = 0
      ORDER BY m.posted_date ASC
    `;
    db.query(sql, [req.params.id], (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    });
  });

// messages - create
app.post("/messages", (req, res) => {
  const { content, user_id, thread_id, parent_id } = req.body;
  
  if (!content || !content.trim())
    return res.status(400).json({ message: "Content cannot be empty." });

  // 1. Kiểm tra xem thread có bị khóa không trước khi cho phép post
  db.query(
    "SELECT is_locked FROM threads WHERE thread_id = ? LIMIT 1",
    [thread_id],
    (err, threads) => {
      if (err) return res.status(500).send(err);

      if (threads.length === 0) {
        return res.status(404).json({ message: "Thread not found." });
      }

      // Nếu thread đã bị khóa (is_locked = 1), từ chối lưu và trả về lỗi 403
      if (threads[0].is_locked === 1) {
        return res.status(403).json({ message: "This thread is locked. You cannot post messages here." });
      }

      // 2. Nếu thread vẫn mở (is_locked = 0), tiến hành insert tin nhắn bình thường
      db.query(
        "INSERT INTO messages (content, user_id, thread_id, parent_id) VALUES (?, ?, ?, ?)",
        [content, user_id, thread_id, parent_id || null],
        (err2, result) => {
          if (err2) return res.status(500).send(err2);
          const message_id = result.insertId;

          if (!parent_id) {
            db.query(
              "SELECT user_id FROM subscribes WHERE thread_id = ? AND user_id != ?",
              [thread_id, user_id],
              (err3, users) => {
                if (!err3 && users.length > 0) {
                  const values = users.map(u => [u.user_id, thread_id, message_id, 0, new Date()]);
                  db.query(
                    "INSERT INTO notifications (user_id, thread_id, message_id, is_read, created_at) VALUES ?",
                    [values],
                    (err4) => { if (err4) console.error(err4); }
                  );
                }
              }
            );
          }
          res.json({ message: "Message posted successfully.", message_id });
        }
      );
    }
  );
});

  // messages - edit (người dùng chỉ có thể sửa tin nhắn của mình)

  app.put("/messages/:id", (req, res) => {
    const { content, user_id } = req.body;
    const messageId = req.params.id;

    if (!content || !content.trim())
      return res.status(400).json({ message: "Content cannot be empty." });

    // Kiểm tra tin nhắn có tồn tại và người dùng có quyền edit không
    db.query("SELECT * FROM messages WHERE message_id = ? LIMIT 1", [messageId], (err, messages) => {
      if (err) return res.status(500).send(err);
      if (messages.length === 0)
        return res.status(404).json({ message: "Message not found." });

      if (messages[0].user_id !== user_id)
        return res.status(403).json({ message: "You can only edit your own messages." });

      // Update message content và timestamp (để track khi edit)
      db.query(
        "UPDATE messages SET content = ?, last_edited_at = NOW() WHERE message_id = ?",
        [content.trim(), messageId],
        (err2) => {
          if (err2) return res.status(500).send(err2);
          res.json({ message: "Message updated successfully." });
        }
      );
    });
  });


  // messages - delete (xóa mềm)

  app.delete("/messages/:id", (req, res) => {
    const { user_id } = req.body;
    const messageId = req.params.id;

    db.query("SELECT * FROM messages WHERE message_id = ? LIMIT 1", [messageId], (err, messages) => {
      if (err) return res.status(500).send(err);
      if (messages.length === 0)
        return res.status(404).json({ message: "Message not found." });

      if (messages[0].user_id !== user_id)
        return res.status(403).json({ message: "You can only delete your own messages." });

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

  // reactions

  app.get("/messages/:id/reactions", (req, res) => {
    const sql = `
      SELECT r.emoji, COUNT(*) AS count,
             GROUP_CONCAT(r.user_id) AS user_ids,
             GROUP_CONCAT(COALESCE(u.username, mod_u.username, adm.username, CONCAT(u.first_name, ' ', u.last_name), mod_u.mod_name, adm.admin_name)) AS users
      FROM reactions r
      LEFT JOIN appusers u ON r.user_id = u.user_id
      LEFT JOIN moderators mod_u ON r.user_id = mod_u.mod_id
      LEFT JOIN admins adm ON r.user_id = adm.admin_id
      WHERE r.message_id = ?
      GROUP BY r.emoji
    `;
    db.query(sql, [req.params.id], (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result || []);
    });
  });

  app.post("/reactions", (req, res) => {
    const { message_id, user_id, emoji } = req.body;
    if (!message_id || !user_id || !emoji)
      return res.status(400).json({ message: "Invalid reaction data." });

    db.query(
      "SELECT * FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ? LIMIT 1",
      [message_id, user_id, emoji],
      (err, existing) => {
        if (err) return res.status(500).send(err);

        if (existing.length > 0) {
          db.query(
            "DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?",
            [message_id, user_id, emoji],
            (err2) => {
              if (err2) return res.status(500).send(err2);
              res.json({ message: "Reaction removed.", action: "removed" });
            }
          );
        } else {
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

  app.delete("/reactions/:id", (req, res) => {
    db.query("DELETE FROM reactions WHERE reaction_id = ?", [req.params.id], (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Reaction deleted." });
    });
  });


  // subscribes & notifications

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
    db.query("UPDATE notifications SET is_read=1 WHERE notif_id=?", [req.params.id], (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Notification marked as read." });
    });
  });
};

