-- ======================================================
-- ForumDB – Topic C: Forum
-- Phiên bản đầy đủ, đã bổ sung:
--   + SystemSettings  (Admin cài retention days)
--   + Soft-delete     (Messages & Threads)
--   + Notifications   (nhắc nhở subscriber)
--   + Categories      (danh mục thread)
--   + Sửa PK của Ban & Modifying (tránh conflict timestamp)
-- ======================================================

CREATE DATABASE IF NOT EXISTS ForumDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ForumDB;

-- ======================================================
-- RESET – xóa theo thứ tự ngược FK
-- ======================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS Notifications;
DROP TABLE IF EXISTS Modifying;
DROP TABLE IF EXISTS Ban;
DROP TABLE IF EXISTS Messages;
DROP TABLE IF EXISTS Subscribes;
DROP TABLE IF EXISTS Threads;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Manages;
DROP TABLE IF EXISTS AppUsers;
DROP TABLE IF EXISTS Moderators;
DROP TABLE IF EXISTS Admins;
DROP TABLE IF EXISTS Accounts;
DROP TABLE IF EXISTS SystemSettings;

SET FOREIGN_KEY_CHECKS = 1;

-- ======================================================
-- 1. ACCOUNTS – thông tin đăng nhập chung
-- ======================================================
CREATE TABLE Accounts (
    account_id  INT          AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,          -- nên hash bcrypt trước khi lưu
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ======================================================
-- 2. BA LOẠI NGƯỜI DÙNG (kế thừa Accounts)
-- ======================================================

-- User thông thường
CREATE TABLE AppUsers (
    user_id        INT          PRIMARY KEY,
    first_name     VARCHAR(100),
    middle_name    VARCHAR(100),
    last_name      VARCHAR(100),
    gender         VARCHAR(20),
    date_of_birth  DATE,
    register_date  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    is_banned      TINYINT(1)   DEFAULT 0,       -- 0: active | 1: đã bị ban
    FOREIGN KEY (user_id) REFERENCES Accounts(account_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Moderator
CREATE TABLE Moderators (
    mod_id    INT          PRIMARY KEY,
    mod_name  VARCHAR(100),
    FOREIGN KEY (mod_id) REFERENCES Accounts(account_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Admin
CREATE TABLE Admins (
    admin_id    INT          PRIMARY KEY,
    admin_name  VARCHAR(100),
    FOREIGN KEY (admin_id) REFERENCES Accounts(account_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ======================================================
-- 3. QUAN HỆ: Admin quản lý Moderator
-- ======================================================
CREATE TABLE Manages (
    admin_id  INT,
    mod_id    INT,
    PRIMARY KEY (admin_id, mod_id),
    FOREIGN KEY (admin_id) REFERENCES Admins(admin_id)      ON DELETE CASCADE,
    FOREIGN KEY (mod_id)   REFERENCES Moderators(mod_id)    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ======================================================
-- 4. SYSTEM SETTINGS – Admin cài đặt hệ thống
--    Đáp ứng: "Old messages/threads removed after N days (setting by Admin)"
-- ======================================================
CREATE TABLE SystemSettings (
    setting_id    INT           AUTO_INCREMENT PRIMARY KEY,
    setting_key   VARCHAR(100)  UNIQUE NOT NULL,
    -- Các key có thể dùng:
    --   'retention_days'     → số ngày giữ bài trước khi tự xóa  (vd: '30')
    --   'max_threads_per_day'→ giới hạn thread 1 user tạo/ngày   (vd: '5')
    setting_value VARCHAR(255)  NOT NULL,
    description   VARCHAR(255),
    updated_by    INT,                           -- admin_id thực hiện thay đổi
    updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES Admins(admin_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ======================================================
-- 5. CATEGORIES – Danh mục chủ đề
-- ======================================================
CREATE TABLE Categories (
    category_id  INT           AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100)  NOT NULL,
    description  TEXT,
    created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ======================================================
-- 6. THREADS – Chủ đề bài viết
-- ======================================================
CREATE TABLE Threads (
    thread_id     INT           AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(255)  NOT NULL,
    category_id   INT,                           -- thuộc danh mục nào
    created_date  DATETIME      DEFAULT CURRENT_TIMESTAMP,
    is_locked     TINYINT(1)    DEFAULT 0,        -- 0: mở | 1: đã khóa

    -- Soft-delete (Mod xóa thread)
    is_deleted    TINYINT(1)    DEFAULT 0,
    deleted_by    INT,                            -- mod_id thực hiện xóa
    deleted_at    DATETIME,

    created_by    INT,                            -- mod_id tạo thread
    FOREIGN KEY (category_id) REFERENCES Categories(category_id)  ON DELETE SET NULL,
    FOREIGN KEY (created_by)  REFERENCES Moderators(mod_id)       ON DELETE SET NULL,
    FOREIGN KEY (deleted_by)  REFERENCES Moderators(mod_id)       ON DELETE SET NULL
) ENGINE=InnoDB;

-- ======================================================
-- 7. SUBSCRIBES – User theo dõi Thread
--    Đáp ứng: "registry for the system to remind new messages"
-- ======================================================
CREATE TABLE Subscribes (
    user_id         INT,
    thread_id       INT,
    subscribe_date  DATETIME  DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, thread_id),
    FOREIGN KEY (user_id)   REFERENCES AppUsers(user_id)   ON DELETE CASCADE,
    FOREIGN KEY (thread_id) REFERENCES Threads(thread_id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ======================================================
-- 8. MESSAGES – Bài đăng trong thread
-- ======================================================
CREATE TABLE Messages (
    message_id   INT          AUTO_INCREMENT PRIMARY KEY,
    content      TEXT         NOT NULL,
    posted_date  DATETIME     DEFAULT CURRENT_TIMESTAMP,

    -- Soft-delete (Mod xóa bài)
    is_deleted   TINYINT(1)   DEFAULT 0,
    deleted_by   INT,                            -- mod_id thực hiện xóa
    deleted_at   DATETIME,

    user_id      INT,
    thread_id    INT,
    FOREIGN KEY (user_id)    REFERENCES AppUsers(user_id)   ON DELETE CASCADE,
    FOREIGN KEY (thread_id)  REFERENCES Threads(thread_id)  ON DELETE CASCADE,
    FOREIGN KEY (deleted_by) REFERENCES Moderators(mod_id)  ON DELETE SET NULL
) ENGINE=InnoDB;

-- ======================================================
-- 9. NOTIFICATIONS – Thông báo cho subscriber
--    Đáp ứng: "remind new messages appearing in favor their threads"
--    Logic: khi có Messages mới → tạo 1 row Notifications
--           cho mỗi user đang Subscribes thread đó
-- ======================================================
CREATE TABLE Notifications (
    notif_id    INT          AUTO_INCREMENT PRIMARY KEY,
    user_id     INT          NOT NULL,           -- người nhận thông báo
    thread_id   INT          NOT NULL,           -- thread có bài mới
    message_id  INT          NOT NULL,           -- bài mới kích hoạt thông báo
    is_read     TINYINT(1)   DEFAULT 0,          -- 0: chưa đọc | 1: đã đọc
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES AppUsers(user_id)    ON DELETE CASCADE,
    FOREIGN KEY (thread_id)  REFERENCES Threads(thread_id)   ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES Messages(message_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ======================================================
-- 10. BAN – Lịch sử ban user bởi Mod
--     Đã sửa: dùng ban_id AUTO_INCREMENT làm PK thay vì
--             composite key với timestamp (tránh conflict)
-- ======================================================
CREATE TABLE Ban (
    ban_id    INT       AUTO_INCREMENT PRIMARY KEY,
    mod_id    INT       NOT NULL,
    user_id   INT       NOT NULL,
    ban_date  DATETIME  DEFAULT CURRENT_TIMESTAMP,
    reason    VARCHAR(255),                      -- lý do ban (tùy chọn)
    FOREIGN KEY (mod_id)   REFERENCES Moderators(mod_id)  ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES AppUsers(user_id)   ON DELETE CASCADE
) ENGINE=InnoDB;

-- ======================================================
-- 11. MODIFYING – Lịch sử Mod chỉnh sửa bài
--     Đã sửa: dùng modify_id AUTO_INCREMENT làm PK
-- ======================================================
CREATE TABLE Modifying (
    modify_id    INT       AUTO_INCREMENT PRIMARY KEY,
    mod_id       INT       NOT NULL,
    message_id   INT       NOT NULL,
    modify_date  DATETIME  DEFAULT CURRENT_TIMESTAMP,
    note         VARCHAR(255),                   -- ghi chú lý do chỉnh sửa
    FOREIGN KEY (mod_id)      REFERENCES Moderators(mod_id)    ON DELETE CASCADE,
    FOREIGN KEY (message_id)  REFERENCES Messages(message_id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ======================================================
-- DỮ LIỆU MẪU
-- ======================================================

-- Accounts (1 admin, 2 mod, 3 user)
INSERT INTO Accounts (email, password) VALUES
('admin1@mail.com',  '$2b$10$hashed_admin_pass'),
('mod1@mail.com',    '$2b$10$hashed_mod1_pass'),
('mod2@mail.com',    '$2b$10$hashed_mod2_pass'),
('user1@mail.com',   '$2b$10$hashed_user1_pass'),
('user2@mail.com',   '$2b$10$hashed_user2_pass'),
('user3@mail.com',   '$2b$10$hashed_user3_pass');

INSERT INTO Admins     VALUES (1, 'Super Admin');
INSERT INTO Moderators VALUES (2, 'Mod Alpha'), (3, 'Mod Beta');

INSERT INTO AppUsers
    (user_id, first_name, middle_name, last_name, gender, date_of_birth, register_date, is_banned)
VALUES
    (4, 'John', 'A', 'Doe',   'Male',   '2000-05-10', NOW(), 0),
    (5, 'Jane', 'B', 'Smith', 'Female', '2001-07-15', NOW(), 0),
    (6, 'Mike', 'C', 'Brown', 'Male',   '1999-03-20', NOW(), 1);

-- Admin quản lý Mod
INSERT INTO Manages VALUES (1, 2), (1, 3);

-- Cài đặt hệ thống (Admin set)
INSERT INTO SystemSettings (setting_key, setting_value, description, updated_by) VALUES
('retention_days',      '30',  'Số ngày giữ bài/thread trước khi tự xóa', 1),
('max_threads_per_day', '5',   'Số thread tối đa 1 user tạo mỗi ngày',    1),
('max_messages_per_day','20',  'Số bài đăng tối đa 1 user gửi mỗi ngày',  1);

-- Danh mục
INSERT INTO Categories (name, description) VALUES
('Programming', 'Thảo luận về lập trình, thuật toán, công nghệ'),
('Academia',    'Tài liệu học tập, ôn thi, kinh nghiệm học thuật'),
('Entertainment','Game, phim, âm nhạc, giải trí'),
('Society',     'Các vấn đề xã hội, thời sự, thảo luận chung');

-- Threads (do Mod tạo)
INSERT INTO Threads (title, category_id, created_by, is_locked) VALUES
('Welcome Thread',       1, 2, 0),
('SQL Optimization Tips',1, 3, 0),
('Announcements',        1, 2, 1),
('Tài liệu ôn thi HCMIU',2, 3, 0);

-- Subscriptions
INSERT INTO Subscribes VALUES
(4, 1, NOW()),
(5, 1, NOW()),
(4, 2, NOW()),
(6, 2, NOW());

-- Messages
INSERT INTO Messages (content, user_id, thread_id) VALUES
('Hello everyone! Chào mừng đến forum.',           4, 1),
('Cảm ơn đã tạo thread này, rất hữu ích!',         5, 1),
('Ai có tips tối ưu JOIN query không?',              4, 2),
('Dùng index covering query thì nhanh hơn nhiều.',  6, 2),
('Mình share tài liệu DB semester 2 ở đây.',        5, 4);

-- Notifications (user 4 và 5 subscribe thread 1, message mới từ user khác)
INSERT INTO Notifications (user_id, thread_id, message_id) VALUES
(4, 1, 2),   -- user4 nhận notif vì user5 đăng bài vào thread 1
(5, 1, 1);   -- user5 nhận notif vì user4 đăng bài vào thread 1

-- Ban (Mod ban user 6)
INSERT INTO Ban (mod_id, user_id, reason) VALUES
(2, 6, 'Vi phạm nội quy forum lần thứ 2');

-- Modifying (Mod sửa bài)
INSERT INTO Modifying (mod_id, message_id, note) VALUES
(3, 1, 'Sửa lỗi chính tả'),
(2, 3, 'Điều chỉnh nội dung vi phạm quy định');

-- ======================================================
-- VIEWS HỮU ÍCH
-- ======================================================

-- View: Danh sách thread còn hoạt động (không bị xóa, không bị khóa)
CREATE OR REPLACE VIEW ActiveThreads AS
SELECT
    t.thread_id,
    t.title,
    c.name          AS category,
    m.mod_name      AS created_by,
    t.created_date,
    COUNT(msg.message_id) AS reply_count
FROM Threads t
LEFT JOIN Categories c   ON t.category_id = c.category_id
LEFT JOIN Moderators m   ON t.created_by  = m.mod_id
LEFT JOIN Messages   msg ON t.thread_id   = msg.thread_id
                        AND msg.is_deleted = 0
WHERE t.is_deleted = 0
  AND t.is_locked  = 0
GROUP BY t.thread_id, t.title, c.name, m.mod_name, t.created_date;

-- View: Thông báo chưa đọc của từng user
CREATE OR REPLACE VIEW UnreadNotifications AS
SELECT
    n.notif_id,
    n.user_id,
    CONCAT(u.first_name, ' ', u.last_name) AS user_name,
    n.thread_id,
    t.title        AS thread_title,
    n.message_id,
    n.created_at
FROM Notifications n
JOIN AppUsers  u ON n.user_id   = u.user_id
JOIN Threads   t ON n.thread_id = t.thread_id
WHERE n.is_read = 0;

-- View: Lịch sử bị ban của user
CREATE OR REPLACE VIEW BanHistory AS
SELECT
    b.ban_id,
    CONCAT(u.first_name, ' ', u.last_name) AS banned_user,
    m.mod_name   AS banned_by,
    b.ban_date,
    b.reason
FROM Ban b
JOIN AppUsers  u ON b.user_id = u.user_id
JOIN Moderators m ON b.mod_id = m.mod_id
ORDER BY b.ban_date DESC;

-- ======================================================
-- STORED PROCEDURES
-- ======================================================

DELIMITER $$

-- Procedure: Tự động xóa bài/thread cũ theo retention_days
-- Gọi mỗi ngày bằng scheduler hoặc cron job
CREATE PROCEDURE CleanOldContent()
BEGIN
    DECLARE v_days INT DEFAULT 30;

    -- Lấy giá trị retention_days từ SystemSettings
    SELECT CAST(setting_value AS UNSIGNED)
    INTO   v_days
    FROM   SystemSettings
    WHERE  setting_key = 'retention_days'
    LIMIT  1;

    -- Soft-delete messages cũ (không dùng hard delete để giữ lịch sử)
    UPDATE Messages
    SET    is_deleted = 1,
           deleted_at = NOW()
    WHERE  is_deleted = 0
      AND  posted_date < DATE_SUB(NOW(), INTERVAL v_days DAY);

    -- Soft-delete threads cũ (chỉ xóa thread không còn bài nào)
    UPDATE Threads t
    SET    t.is_deleted = 1,
           t.deleted_at = NOW()
    WHERE  t.is_deleted = 0
      AND  t.created_date < DATE_SUB(NOW(), INTERVAL v_days DAY)
      AND  NOT EXISTS (
               SELECT 1 FROM Messages m
               WHERE  m.thread_id  = t.thread_id
                 AND  m.is_deleted = 0
           );
END$$

-- Procedure: Gửi thông báo đến tất cả subscriber khi có bài mới
-- Gọi sau khi INSERT vào Messages thành công
CREATE PROCEDURE NotifySubscribers(
    IN p_thread_id  INT,
    IN p_message_id INT,
    IN p_poster_id  INT       -- không gửi notif cho chính người đăng
)
BEGIN
    INSERT INTO Notifications (user_id, thread_id, message_id)
    SELECT s.user_id, s.thread_id, p_message_id
    FROM   Subscribes s
    WHERE  s.thread_id = p_thread_id
      AND  s.user_id  <> p_poster_id;  -- bỏ qua người đăng bài
END$$

DELIMITER ;

-- ======================================================
-- DEMO: Gọi thử procedure
-- ======================================================

-- Giả lập: user 4 đăng bài mới vào thread 1
-- Sau đó gọi NotifySubscribers để tạo thông báo cho user 5 (cũng subscribe thread 1)
CALL NotifySubscribers(1, 1, 4);

-- Chạy dọn nội dung cũ
-- CALL CleanOldContent();

-- Chạy file này trong MySQL để cập nhật password
-- ================================================

UPDATE Accounts SET password='$2b$10$HPU2KombBu.sUjn831W2OO6YQfkJaliLxsmLYwh4klgzB9r/AtSvO' WHERE email='admin1@mail.com';
UPDATE Accounts SET password='$2b$10$BC/Rr03gLTbTewGk3DiQKu1ZQgXzTbKdj2GJicx1hrBl7dj1LSw1O' WHERE email='mod1@mail.com';
UPDATE Accounts SET password='$2b$10$eruEXOpjmqsCt05oIEZKouSqfbjfmj2SEHr5mwmwrFYX82jrwe0wS' WHERE email='mod2@mail.com';
UPDATE Accounts SET password='$2b$10$Eggqljo3YJGJkpTb0.qZd.53tmBnglHOWqf4mL0Jqnt7.F/xU2h9W' WHERE email='user1@mail.com';
UPDATE Accounts SET password='$2b$10$bajRBmfnyDqwsTBzPw1Cg.RvTPyfH4mG.O10uHJ8ISj0O2sLhNotu' WHERE email='user2@mail.com';
UPDATE Accounts SET password='$2b$10$wL4nrsduRCnHZkiUxxBIEOHYLmSv6gqMU8ojLbYPRf8fBp6iH5gwK' WHERE email='user3@mail.com';


-- Thêm cột cho bảng Admins
ALTER TABLE Admins 
ADD COLUMN date_of_birth DATE, 
ADD COLUMN gender VARCHAR(20);

-- Thêm cột cho bảng Moderators
ALTER TABLE Moderators 
ADD COLUMN date_of_birth DATE, 
ADD COLUMN gender VARCHAR(20);

-- UPDATE cho Admin (admin_id = 1)
UPDATE Admins 
SET gender = 'Male',              -- Đổi thành giới tính thật của admin
    date_of_birth = '1990-01-15'  -- Đổi thành ngày sinh thật
WHERE admin_id = 1;

-- UPDATE cho Moderator 1 (mod_id = 2)
UPDATE Moderators 
SET gender = 'Female',            -- Đổi thành giới tính thật
    date_of_birth = '1995-03-20'
WHERE mod_id = 2;

-- UPDATE cho Moderator 2 (mod_id = 3)
UPDATE Moderators 
SET gender = 'Male', 
    date_of_birth = '1992-07-10'
WHERE mod_id = 3;

-- tính năng bình luận --
ALTER TABLE Messages ADD COLUMN parent_id INT DEFAULT NULL;
ALTER TABLE Messages ADD FOREIGN KEY (parent_id) REFERENCES Messages(message_id) ON DELETE CASCADE;

-- =====================================================
-- Thêm Reactions table để lưu emoji reactions
-- =====================================================

USE ForumDB;

-- Nếu chưa có, tạo bảng Reactions

CREATE TABLE Reactions (
    reaction_id  INT          AUTO_INCREMENT PRIMARY KEY,
    message_id   INT          NOT NULL,
    user_id      INT          NOT NULL,
    emoji        VARCHAR(10)  NOT NULL,
    created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_reaction (message_id, user_id, emoji),
    FOREIGN KEY (message_id) REFERENCES Messages(message_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES Accounts(account_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tạo View để lấy reaction counts từng message
CREATE OR REPLACE VIEW MessageReactionCounts AS
SELECT 
    message_id,
    emoji,
    COUNT(*) AS count
FROM Reactions
GROUP BY message_id, emoji;

-- Tạo View để check user đã react message này chưa
CREATE OR REPLACE VIEW UserReactions AS
SELECT 
    message_id,
    user_id,
    GROUP_CONCAT(emoji SEPARATOR ',') AS emojis
FROM Reactions
GROUP BY message_id, user_id;

-- Sample data (optional)
-- INSERT INTO Reactions (message_id, user_id, emoji) VALUES
-- (1, 5, '👍'),
-- (1, 6, '❤️'),
-- (2, 4, '😂');

-- =====================================================
-- MIGRATION: Add username and avatar columns
-- Run this on your existing ForumDB database
-- =====================================================
-- Add username and avatar to AppUsers
ALTER TABLE AppUsers
  ADD COLUMN username VARCHAR(100) UNIQUE DEFAULT NULL AFTER user_id,
  ADD COLUMN avatar   LONGTEXT         DEFAULT NULL;

-- Add username and avatar to Admins
ALTER TABLE Admins
  ADD COLUMN username VARCHAR(100) UNIQUE DEFAULT NULL AFTER admin_id,
  ADD COLUMN avatar   LONGTEXT         DEFAULT NULL;

-- Add username and avatar to Moderators
ALTER TABLE Moderators
  ADD COLUMN username VARCHAR(100) UNIQUE DEFAULT NULL AFTER mod_id,
  ADD COLUMN avatar   LONGTEXT         DEFAULT NULL;

-- Backfill usernames from existing data so NOT NULL constraint is safe
UPDATE AppUsers SET username = CONCAT('user_', user_id)   WHERE username IS NULL;
UPDATE Admins   SET username = CONCAT('admin_', admin_id) WHERE username IS NULL;
UPDATE Moderators SET username = CONCAT('mod_', mod_id)   WHERE username IS NULL;

ALTER TABLE messages ADD COLUMN last_edited_at DATETIME NULL COMMENT 'Lưu lại lần edit gần nhất';

-- =========== sửa lỗi mod không comment được bài viết của user 
-- từ đây
ALTER TABLE messages DROP FOREIGN KEY messages_ibfk_1;

ALTER TABLE messages 
ADD CONSTRAINT fk_messages_account 
FOREIGN KEY (user_id) REFERENCES Accounts(account_id) ON DELETE CASCADE; -- tới đây

-- 1. Thêm cột lưu thời gian User tự sửa bài (nếu bảng messages chưa có) 
-- cái số 1 này hình như có rồi
-- ALTER TABLE messages ADD COLUMN edited_at DATETIME NULL DEFAULT NULL;

-- 2. Xóa bảng Reports cũ đi
DROP TABLE IF EXISTS Reports;

-- 3. Tạo lại bảng Reports mới chuẩn theo Database của bạn
CREATE TABLE Reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NULL, -- Cho phép NULL để giữ lại lịch sử khi bài (message) bị xóa
    reporter_id INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    custom_reason TEXT,
    message_content_snapshot TEXT, -- Chụp lại nội dung message lúc bị report
    status ENUM('pending', 'ignored', 'resolved') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Khóa ngoại trỏ đúng vào bảng Accounts và messages của bạn
    FOREIGN KEY (reporter_id) REFERENCES Accounts(account_id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE,
    
    -- Đảm bảo 1 user chỉ được report 1 message 1 lần
    CONSTRAINT UNIQUE_reporter_message UNIQUE (reporter_id, message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- THÔNG TIN ĐĂNG NHẬP (dùng khi thuyết trình)
-- ================================================
-- admin1@mail.com  →  admin123
-- mod1@mail.com    →  mod123
-- mod2@mail.com    →  mod123
-- user1@mail.com   →  user123
-- user2@mail.com   →  user123
-- user3@mail.com   →  user123   (bị ban)