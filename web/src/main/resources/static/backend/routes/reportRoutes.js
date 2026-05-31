// reportRoutes.js — API endpoints cho chức năng report bài vi phạm

module.exports = (app, db) => {

  // =============================================
  // POST /api/report — user gửi report
  // =============================================
  app.post('/api/report', (req, res) => {
    const { reporter_id, message_id, reason } = req.body;

    if (!reporter_id || !message_id || !reason || !reason.trim()) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Kiểm tra đã report bài này chưa
    const sqlCheck = `
      SELECT report_id FROM Reports
      WHERE reporter_id = ? AND message_id = ?
      LIMIT 1
    `;
    db.query(sqlCheck, [reporter_id, message_id], (err, existing) => {
      if (err) return res.status(500).send(err);

      if (existing.length > 0) {
        return res.status(409).json({ message: 'You have already reported this post.' });
      }

      const sqlInsert = 'INSERT INTO Reports (reporter_id, message_id, reason) VALUES (?, ?, ?)';
      db.query(sqlInsert, [reporter_id, message_id, reason.trim()], (err2) => {
        if (err2) return res.status(500).send(err2);
        res.json({ message: 'Report submitted successfully.' });
      });
    });
  });

  // =============================================
  // GET /api/user/my-reports — lấy các message_id mà user đã report
  // Dùng để hiện nút "Reported" khi load trang
  // =============================================
  app.get('/api/user/my-reports', (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ message: 'user_id is required.' });

    db.query(
      'SELECT message_id FROM Reports WHERE reporter_id = ?',
      [user_id],
      (err, results) => {
        if (err) return res.status(500).send(err);
        // Trả về mảng message_id đã report
        res.json(results.map(r => r.message_id));
      }
    );
  });

  // =============================================
  // GET /api/moderator/reports — mod lấy TẤT CẢ reports (kể cả đã xử lý)
  // =============================================
  app.get('/api/moderator/reports', (req, res) => {
    const sql = `
      SELECT
        r.report_id,
        r.reason,
        r.status,
        r.created_at,
        r.resolved_at,
        m.message_id,
        m.content        AS message_content,
        m.thread_id,
        m.posted_date,
        m.is_deleted     AS message_is_deleted,
        -- Tác giả bài viết bị report
        COALESCE(u.username, mod_a.username, adm.username)                              AS author_username,
        COALESCE(CONCAT(u.first_name, ' ', u.last_name), mod_a.mod_name, adm.admin_name) AS author_name,
        -- Người đã report
        reporter_acc.email                                                               AS reporter_email,
        COALESCE(reporter_u.username, reporter_mod.username, reporter_adm.username)      AS reporter_username,
        -- Tên thread
        t.title                                                                          AS thread_title,
        -- Mod đã xử lý
        resolver.mod_name                                                                AS resolved_by_name
      FROM Reports r
      JOIN Messages   m            ON r.message_id  = m.message_id
      JOIN Accounts   reporter_acc ON r.reporter_id = reporter_acc.account_id
      LEFT JOIN AppUsers   u            ON m.user_id      = u.user_id
      LEFT JOIN Moderators mod_a        ON m.user_id      = mod_a.mod_id
      LEFT JOIN Admins     adm          ON m.user_id      = adm.admin_id
      LEFT JOIN AppUsers   reporter_u   ON r.reporter_id  = reporter_u.user_id
      LEFT JOIN Moderators reporter_mod ON r.reporter_id  = reporter_mod.mod_id
      LEFT JOIN Admins     reporter_adm ON r.reporter_id  = reporter_adm.admin_id
      LEFT JOIN Threads    t            ON m.thread_id    = t.thread_id
      LEFT JOIN Moderators resolver     ON r.resolved_by  = resolver.mod_id
      ORDER BY r.created_at DESC
    `;

    db.query(sql, (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    });
  });

  // =============================================
  // POST /api/moderator/resolve-report — mod xử lý report
  // action = 'delete' (xóa bài) hoặc 'dismiss' (bỏ qua)
  // =============================================
  app.post('/api/moderator/resolve-report', (req, res) => {
    const { report_id, message_id, action, mod_id } = req.body;

    if (!report_id || !action || !mod_id) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    if (action === 'delete') {
      // Xóa mềm bài viết
      db.query(
        'UPDATE Messages SET is_deleted = 1, deleted_at = NOW() WHERE message_id = ?',
        [message_id],
        (err) => {
          if (err) return res.status(500).send(err);

          // Mark report này là Resolved
          db.query(
            'UPDATE Reports SET status = "Resolved", resolved_by = ?, resolved_at = NOW() WHERE report_id = ?',
            [mod_id, report_id],
            (err2) => {
              if (err2) return res.status(500).send(err2);

              // Mark tất cả report Pending khác của cùng bài là Resolved
              db.query(
                `UPDATE Reports
                 SET status = "Resolved", resolved_by = ?, resolved_at = NOW()
                 WHERE message_id = ? AND status = "Pending"`,
                [mod_id, message_id],
                (err3) => {
                  if (err3) return res.status(500).send(err3);
                  res.json({ message: 'Post deleted and all related reports resolved.' });
                }
              );
            }
          );
        }
      );
    } else if (action === 'dismiss') {
      db.query(
        'UPDATE Reports SET status = "Dismissed", resolved_by = ?, resolved_at = NOW() WHERE report_id = ?',
        [mod_id, report_id],
        (err) => {
          if (err) return res.status(500).send(err);
          res.json({ message: 'Report dismissed.' });
        }
      );
    } else {
      res.status(400).json({ message: 'Invalid action. Use "delete" or "dismiss".' });
    }
  });
};