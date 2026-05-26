module.exports = (app, db) => {
  
    // ==========================================
    // 1. PHẦN BẠN HỎI: User gửi báo cáo lên
    // ==========================================
    app.post("/api/report", (req, res) => {
      const { reporter_id, message_id, reason } = req.body;
  
      if (!message_id || !reason) {
        return res.status(400).json({ message: "Missing post ID or reason for reporting." });
      }
  
      const sql = "INSERT INTO Reports (reporter_id, message_id, reason) VALUES (?, ?, ?)";
      db.query(sql, [reporter_id, message_id, reason], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Database erró." });
        }
        res.json({ message: "Reports sent successfully!" });
      });
    });
  
    // ==========================================
    // 2. PHẦN THÊM MỚI: Lấy danh sách báo cáo cho Mod
    // ==========================================
    app.get("/api/moderator/reports", (req, res) => {
      const sql = `
        SELECT r.report_id, r.reason, r.created_at, 
               m.message_id, m.content, m.thread_id,
               a.email AS reporter_email
        FROM Reports r
        JOIN Messages m ON r.message_id = m.message_id
        LEFT JOIN Accounts a ON r.reporter_id = a.account_id
        WHERE r.status = 'Pending'
        ORDER BY r.created_at DESC`;
      
      db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
      });
    });
  
    // ==========================================
    // 3. PHẦN THÊM MỚI: Mod xử lý (Xóa hoặc Bỏ qua)
    // ==========================================
    app.post("/api/moderator/resolve-report", (req, res) => {
      const { report_id, message_id, action } = req.body;
  
      if (action === 'delete') {
        const sqlDelete = "UPDATE Messages SET is_deleted = 1 WHERE message_id = ?";
        const sqlResolve = "UPDATE Reports SET status = 'Resolved' WHERE report_id = ?";
  
        db.query(sqlDelete, [message_id], (err) => {
          if (err) return res.status(500).send(err);
          db.query(sqlResolve, [report_id], (err2) => {
            if (err2) return res.status(500).send(err2);
            res.json({ message: "Delete the post and close the report successfully!" });
          });
        });
      } else {
        db.query("UPDATE Reports SET status = 'Resolved' WHERE report_id = ?", [report_id], (err) => {
          if (err) return res.status(500).send(err);
          res.json({ message: "Skip the reports" });
        });
      }
    });
  };
