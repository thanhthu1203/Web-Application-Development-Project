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

  // MANAGE MODS
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
        res.json({ message: "Moderator deleted successfully." });
      });
    });
  });
};