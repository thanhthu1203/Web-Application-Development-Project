const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Password4/eva", 
  database: "forumdb",
});

db.connect(err => {
  if (err) {
    console.error("Lỗi DB: huhu", err);
  } else {
    console.log("Kết nối MySQL thành công!");
  }
});

module.exports = db;