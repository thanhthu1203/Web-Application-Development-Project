// Helper functions để xử lý soft-delete inconsistency
// Vấn đề: Nhiều nơi quên add WHERE is_deleted = 0 khi query
// Giải pháp: Tạo helper functions để tự động thêm điều kiện này

// Hàm bao gói mysql2 query thành Promise (để dễ xử lý async/await)
function promisifyQuery(db) {
  return {
    // Query nhiều dòng dữ liệu
    query: (sql, values = []) => {
      return new Promise((resolve, reject) => {
        db.query(sql, values, (err, results) => {
          if (err) reject(err);
          resolve(results);
        });
      });
    },
    
    // Query 1 dòng dữ liệu
    queryOne: (sql, values = []) => {
      return new Promise((resolve, reject) => {
        db.query(sql, values, (err, results) => {
          if (err) reject(err);
          resolve(results && results.length > 0 ? results[0] : null);
        });
      });
    },
    
    // Execute (INSERT, UPDATE, DELETE)
    execute: (sql, values = []) => {
      return new Promise((resolve, reject) => {
        db.query(sql, values, (err, result) => {
          if (err) reject(err);
          resolve(result);
        });
      });
    }
  };
}

// Hàm lấy tất cả messages không bị xóa của 1 thread
async function getActiveMessages(db, threadId) {
  const promise = promisifyQuery(db);
  
  const sql = `
    SELECT m.*,
           COALESCE(u.username, mod.username, adm.username, CONCAT(u.first_name, ' ', u.last_name), mod.mod_name, adm.admin_name) AS author_name,
           COALESCE(u.avatar, mod.avatar, adm.avatar) AS author_avatar
    FROM messages m
    LEFT JOIN appusers u ON m.user_id = u.user_id
    LEFT JOIN moderators mod ON m.user_id = mod.mod_id
    LEFT JOIN admins adm ON m.user_id = adm.admin_id
    WHERE m.thread_id = ? AND m.is_deleted = 0
    ORDER BY m.posted_date ASC
  `;
  
  try {
    const messages = await promise.query(sql, [threadId]);
    return messages;
  } catch (err) {
    console.error('Error getting active messages:', err);
    throw err;
  }
}

// Hàm lấy tất cả threads không bị xóa
async function getActiveThreads(db) {
  const promise = promisifyQuery(db);
  
  const sql = `
    SELECT t.*, c.name AS category_name
    FROM threads t
    LEFT JOIN categories c ON t.category_id = c.category_id
    WHERE t.is_deleted = 0
    ORDER BY t.created_date DESC
  `;
  
  try {
    const threads = await promise.query(sql);
    return threads;
  } catch (err) {
    console.error('Error getting active threads:', err);
    throw err;
  }
}

// Hàm lấy comments của 1 message (không bị xóa)
async function getMessageComments(db, messageId) {
  const promise = promisifyQuery(db);
  
  const sql = `
    SELECT m.*,
           COALESCE(u.username, mod.username, adm.username, CONCAT(u.first_name, ' ', u.last_name), mod.mod_name, adm.admin_name) AS author_name,
           COALESCE(u.avatar, mod.avatar, adm.avatar) AS author_avatar
    FROM messages m
    LEFT JOIN appusers u ON m.user_id = u.user_id
    LEFT JOIN moderators mod ON m.user_id = mod.mod_id
    LEFT JOIN admins adm ON m.user_id = adm.admin_id
    WHERE (m.parent_id = ? OR m.parent_id IN (SELECT message_id FROM messages WHERE parent_id = ?))
      AND m.is_deleted = 0
    ORDER BY m.posted_date ASC
  `;
  
  try {
    const comments = await promise.query(sql, [messageId, messageId]);
    return comments;
  } catch (err) {
    console.error('Error getting message comments:', err);
    throw err;
  }
}

// Hàm kiểm tra message có bị xóa không
async function isMessageDeleted(db, messageId) {
  const promise = promisifyQuery(db);
  
  const sql = `SELECT is_deleted FROM messages WHERE message_id = ? LIMIT 1`;
  
  try {
    const result = await promise.queryOne(sql, [messageId]);
    
    // Nếu không tìm thấy, coi như đã bị xóa
    if (!result) return true;
    
    // Return true nếu is_deleted = 1, false nếu is_deleted = 0
    return result.is_deleted === 1;
  } catch (err) {
    console.error('Error checking if message is deleted:', err);
    throw err;
  }
}

// Hàm kiểm tra thread có bị xóa không
async function isThreadDeleted(db, threadId) {
  const promise = promisifyQuery(db);
  
  const sql = `SELECT is_deleted FROM threads WHERE thread_id = ? LIMIT 1`;
  
  try {
    const result = await promise.queryOne(sql, [threadId]);
    
    if (!result) return true;
    
    return result.is_deleted === 1;
  } catch (err) {
    console.error('Error checking if thread is deleted:', err);
    throw err;
  }
}

// Hàm soft delete message
async function softDeleteMessage(db, messageId) {
  const promise = promisifyQuery(db);
  
  const sql = `UPDATE messages SET is_deleted = 1, deleted_at = NOW() WHERE message_id = ?`;
  
  try {
    const result = await promise.execute(sql, [messageId]);
    return result;
  } catch (err) {
    console.error('Error soft deleting message:', err);
    throw err;
  }
}

// Hàm soft delete thread
async function softDeleteThread(db, threadId, deletedBy) {
  const promise = promisifyQuery(db);
  
  const sql = `UPDATE threads SET is_deleted = 1, deleted_by = ?, deleted_at = NOW() WHERE thread_id = ?`;
  
  try {
    const result = await promise.execute(sql, [deletedBy, threadId]);
    return result;
  } catch (err) {
    console.error('Error soft deleting thread:', err);
    throw err;
  }
}

// Hàm lấy tất cả active users (không bị ban)
async function getActiveUsers(db) {
  const promise = promisifyQuery(db);
  
  const sql = `
    SELECT u.*, a.email
    FROM appusers u
    JOIN accounts a ON u.user_id = a.account_id
    WHERE u.is_banned = 0
    ORDER BY u.register_date DESC
  `;
  
  try {
    const users = await promise.query(sql);
    return users;
  } catch (err) {
    console.error('Error getting active users:', err);
    throw err;
  }
}

// Hàm check user có bị ban không
async function isUserBanned(db, userId) {
  const promise = promisifyQuery(db);
  
  const sql = `SELECT is_banned FROM appusers WHERE user_id = ? LIMIT 1`;
  
  try {
    const result = await promise.queryOne(sql, [userId]);
    
    if (!result) return false;
    
    return result.is_banned === 1;
  } catch (err) {
    console.error('Error checking if user is banned:', err);
    throw err;
  }
}

// Hàm lấy tất cả active messages (không bị xóa) của tất cả threads
async function getAllActiveMessages(db) {
  const promise = promisifyQuery(db);
  
  const sql = `
    SELECT m.*,
           COALESCE(u.username, mod.username, adm.username, CONCAT(u.first_name, ' ', u.last_name), mod.mod_name, adm.admin_name) AS author_name,
           COALESCE(u.avatar, mod.avatar, adm.avatar) AS author_avatar
    FROM messages m
    LEFT JOIN appusers u ON m.user_id = u.user_id
    LEFT JOIN moderators mod ON m.user_id = mod.mod_id
    LEFT JOIN admins adm ON m.user_id = adm.admin_id
    WHERE m.is_deleted = 0 AND m.parent_id IS NULL
    ORDER BY m.posted_date DESC
  `;
  
  try {
    const messages = await promise.query(sql);
    return messages;
  } catch (err) {
    console.error('Error getting all active messages:', err);
    throw err;
  }
}

// Export tất cả functions
module.exports = {
  promisifyQuery,
  getActiveMessages,
  getActiveThreads,
  getMessageComments,
  isMessageDeleted,
  isThreadDeleted,
  softDeleteMessage,
  softDeleteThread,
  getActiveUsers,
  isUserBanned,
  getAllActiveMessages
};