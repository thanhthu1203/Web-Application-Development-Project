module.exports = (app, db) => {
  // api nhan bao cao tu user
  app.post('/api/report', (req, res) => {
    const { reporter_id, message_id, reason, custom_reason } = req.body;

    if (!reporter_id || !message_id || !reason || !reason.trim()) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // kiem tra xem user da bao cao bai nay chua de tranh trung lap
    const sqlCheck = `SELECT report_id FROM Reports WHERE reporter_id = ? AND message_id = ? LIMIT 1`;
    db.query(sqlCheck, [reporter_id, message_id], (err, existing) => {
      if (err) return res.status(500).send(err);

      if (existing.length > 0) {
        return res.status(409).json({ message: 'You have already reported this post.' });
      }

      // chup lai noi dung bai viet luc bi bao cao
      const sqlSnapshot = 'SELECT content FROM messages WHERE message_id = ? LIMIT 1';
      db.query(sqlSnapshot, [message_id], (errSnap, msgs) => {
        const snapshot = (msgs && msgs.length > 0) ? msgs[0].content : '';

        const sqlInsert = 'INSERT INTO Reports (reporter_id, message_id, reason, custom_reason, message_content_snapshot, status) VALUES (?, ?, ?, ?, ?, "pending")';
        db.query(sqlInsert, [reporter_id, message_id, reason.trim(), custom_reason ? custom_reason.trim() : null, snapshot], (err2) => {
          if (err2) return res.status(500).send(err2);
          res.json({ message: 'Report submitted successfully.' });
        });
      });
    });
  });

  // api lay danh sach id cac bai viet da bao cao cua user de hien thi nut reported
  app.get('/api/user/my-reports', (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ message: 'User ID is required.' });

    db.query('SELECT message_id FROM Reports WHERE reporter_id = ?', [user_id], (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results.map(r => r.message_id));
    });
  });

  // api lay toan bo danh sach bao cao danh cho moderator
  app.get('/api/moderator/reports', (req, res) => {
    const sql = `
      SELECT r.report_id, r.reason, r.custom_reason, r.status,
        r.created_at, r.message_content_snapshot, m.message_id,
        m.content AS message_content, m.thread_id, m.posted_date,
        m.is_deleted AS message_is_deleted,
        COALESCE(u.username, mod_a.username, adm.username) AS author_username,
        COALESCE(CONCAT(u.first_name, ' ', u.last_name), mod_a.mod_name, adm.admin_name) AS author_name,
        reporter_acc.email AS reporter_email,
        COALESCE(reporter_u.username, reporter_mod.username, reporter_adm.username) AS reporter_username,
        t.title AS thread_title
      FROM Reports r
      LEFT JOIN messages m ON r.message_id = m.message_id
      LEFT JOIN accounts reporter_acc ON r.reporter_id = reporter_acc.account_id
      LEFT JOIN appusers u ON m.user_id = u.user_id
      LEFT JOIN moderators mod_a ON m.user_id = mod_a.mod_id
      LEFT JOIN admins adm ON m.user_id = adm.admin_id
      LEFT JOIN appusers reporter_u ON r.reporter_id = reporter_u.user_id
      LEFT JOIN moderators reporter_mod ON r.reporter_id = reporter_mod.mod_id
      LEFT JOIN admins reporter_adm ON r.reporter_id = reporter_adm.admin_id
      LEFT JOIN threads t ON m.thread_id = t.thread_id
      ORDER BY r.created_at DESC
    `;
    db.query(sql, (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    });
  });

  // api xu ly bao cao tu moderator
  app.post('/api/moderator/resolve-report', (req, res) => {
    const { report_id, message_id, action } = req.body;

    if (!report_id || !action) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    if (action === 'delete') {
      db.query('UPDATE messages SET is_deleted = 1, deleted_at = NOW() WHERE message_id = ?', [message_id], (err) => {
        if (err) return res.status(500).send(err);

        db.query('UPDATE Reports SET status = "resolved" WHERE report_id = ?', [report_id], (err2) => {
          if (err2) return res.status(500).send(err2);

          db.query('UPDATE Reports SET status = "resolved" WHERE message_id = ? AND status = "pending"', [message_id], (err3) => {
            if (err3) return res.status(500).send(err3);
            res.json({ message: 'Post deleted and report resolved.' });
          });
        });
      });
    } else if (action === 'ignore') {
      db.query('UPDATE Reports SET status = "ignored" WHERE report_id = ?', [report_id], (err) => {
        if (err) return res.status(500).send(err);
        res.json({ message: 'Report ignored.' });
      });
    } else {
      res.status(400).json({ message: 'Invalid action.' });
    }
  });
};