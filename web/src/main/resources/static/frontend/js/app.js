// ============================================================
// CONFIG
// ============================================================
const API = "http://localhost:3000";

// ============================================================
// DATA STORE
// ============================================================
let APP_USERS       = [];
let MODERATORS      = [];
let CATEGORIES      = [];
let THREADS         = [];
let MESSAGES        = [];
let SUBSCRIBES      = [];
let NOTIFICATIONS   = [];
let BAN_HISTORY     = [];
let SYSTEM_SETTINGS = [];
let MANAGES_MODS    = [];

async function loadAllData() {
  const [users, mods, cats, threads, messages, banHistory, settings] = await Promise.all([
    fetch(`${API}/users`).then(r => r.json()),
    fetch(`${API}/manages`).then(r => r.json()),
    fetch(`${API}/categories`).then(r => r.json()),
    fetch(`${API}/threads`).then(r => r.json()),
    fetch(`${API}/messages`).then(r => r.json()),
    fetch(`${API}/ban-history`).then(r => r.json()),
    fetch(`${API}/system-settings`).then(r => r.json()),
  ]);
  APP_USERS       = users;
  MODERATORS      = mods;
  MANAGES_MODS    = mods;
  CATEGORIES      = cats;
  THREADS         = threads;
  MESSAGES        = messages;
  BAN_HISTORY     = banHistory;
  SYSTEM_SETTINGS = settings;
}

async function loadUserData(userId) {
  const [subs, notifs] = await Promise.all([
    fetch(`${API}/subscribes/${userId}`).then(r => r.json()),
    fetch(`${API}/notifications/${userId}`).then(r => r.json()),
  ]);
  SUBSCRIBES    = subs;
  NOTIFICATIONS = notifs;
}

// ── Helpers ──────────────────────────────────────────────────
function getCategoryName(id) { return (CATEGORIES.find(c => c.category_id === id) || {}).name || ''; }
function getModName(id)      { return (MODERATORS.find(m => m.mod_id === id)      || {}).mod_name || 'Unknown'; }
function getUserName(id) {
  const u = APP_USERS.find(u => u.user_id === id);
  return u ? `${u.first_name} ${u.last_name}` : 'Unknown';
}
function countMsgs(tid)      { return MESSAGES.filter(m => m.thread_id === tid && !m.is_deleted).length; }
function getActiveThreads()  { return THREADS.filter(t => !t.is_deleted); }
function isSubscribed(uid, tid) { return SUBSCRIBES.some(s => s.user_id === uid && s.thread_id === tid); }

// ============================================================
// STATE — đọc từ session/localStorage (login.js đã lưu)
// ============================================================
let currentRole   = null;
let currentUserId = null;
let currentName   = null;
let toastTimer    = null;

function loadSession() {
  const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  if (!raw) {
    // Chưa đăng nhập → về trang login
    window.location.href = 'login.html';
    return false;
  }
  const user = JSON.parse(raw);

  currentUserId = user.user_id || user.admin_id || user.mod_id;
  currentName   = `${user.first_name || user.admin_name || user.mod_name || ''} ${user.last_name || ''}`.trim();

  // Xác định role dựa vào field trong object trả về từ DB
  if (user.admin_id !== undefined)     currentRole = 'admin';
  else if (user.mod_id !== undefined)  currentRole = 'mod';
  else                                  currentRole = 'user';

  return true;
}

// ============================================================
// LOGOUT
// ============================================================
function doLogout() {
  localStorage.removeItem('currentUser');
  sessionStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

// ============================================================
// TOPBAR
// ============================================================
function renderTopbar() {
  const initials  = currentName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = { admin: 'Admin', mod: 'Moderator', user: 'User' }[currentRole];
  const av = document.getElementById('chipAvatar');
  av.className  = 'chip-avatar ' + currentRole;
  av.textContent = initials;
  document.getElementById('chipName').textContent = currentName;
  const badge = document.getElementById('chipRole');
  badge.className  = 'role-tag ' + currentRole;
  badge.textContent = roleLabel;
}

// ============================================================
// SIDEBAR
// ============================================================
function renderSidebar() {
  const menus = {
    common: [
      { id: 'threads',  icon: '◫', label: 'Threads'  },
      { id: 'messages', icon: '✉', label: 'Messages' },
    ],
    user: [
      { id: 'notifications', icon: '◎', label: 'Notifications'      },
      { id: 'subscribes',    icon: '★', label: 'Subscriptions'  },
      { id: 'profile',       icon: '👤', label: 'Profile' },
    ],
    mod: [
      { id: 'manage-users', icon: '◉', label: 'Manage Users'  },
      { id: 'ban-history',  icon: '⊘', label: 'Ban History'   },
      { id: 'profile',      icon: '👤', label: 'Profile'         },
    ],
    admin: [
      { id: 'system-settings', icon: '⚙', label: 'System Settings' },
      { id: 'manage-mods',     icon: '◈', label: 'Manage Mods'     },
      { id: 'profile',         icon: '👤', label: 'Profile'           },
    ],
  };

  const roleLabel = { admin: 'Admin', mod: 'Moderator', user: 'User' }[currentRole];
  const extra = menus[currentRole] || [];

  document.getElementById('sidebarNav').innerHTML =
    renderNavSection('Forum', menus.common) +
    (extra.length ? renderNavSection(roleLabel, extra) : '');
}

function renderNavSection(label, items) {
  return `<div class="sidebar-label">${label}</div>` +
    items.map(i => `
      <div class="nav-item" id="nav-${i.id}" onclick="switchTab('${i.id}')">
        <span class="nav-icon">${i.icon}</span>${i.label}
      </div>`).join('');
}

// ============================================================
// TAB SWITCHING
// ============================================================
function switchTab(tabId) {
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.remove('active', 'admin', 'mod', 'user'));
  const nav = document.getElementById('nav-' + tabId);
  if (nav) nav.classList.add('active', currentRole);

  const pages = {
    'threads':         renderThreadsPage,
    'messages':        renderMessagesPage,
    'notifications':   renderNotificationsPage,
    'subscribes':      renderSubscribesPage,
    'manage-users':    renderManageUsersPage,
    'ban-history':     renderBanHistoryPage,
    'system-settings': renderSystemSettingsPage,
    'manage-mods':     renderManageModsPage,
    'profile':         renderProfilePage,
  };
  document.getElementById('mainContent').innerHTML =
    (pages[tabId] || (() => '<p>Page not found</p>'))();
}

// ============================================================
// PERMISSION BANNER
// ============================================================
function banner() {
  const msg = {
    admin: 'You are <strong>Admin</strong> — Manage Moderators and System Settings.',
    mod:   'You are <strong>Moderator</strong> — create/delete threads, edit/delete posts, ban users.',
    user:  'You are <strong>User</strong> — read posts, create posts, subscribe to threads.',
  }[currentRole];
  return `<div class="perm-banner ${currentRole}">ℹ️ ${msg}</div>`;
}

// ============================================================
// PAGE: THREADS
// ============================================================
function renderThreadsPage() {
  const threads  = getActiveThreads();
  const createBtn = (currentRole !== 'user')
    ? `<button class="btn primary" style="margin-bottom:1rem" onclick="createThread()">+ Create New Thread</button>` : '';

  const rows = threads.map(t => {
    const status = t.is_locked
      ? '<span class="tag-locked">Locked</span>'
      : '<span class="tag-open">Open</span>';

    let actions = '';
    if (currentRole !== 'user') {
      actions = `
        <button class="btn" onclick="lockThread(${t.thread_id}, ${t.is_locked ? 0 : 1})">${t.is_locked ? 'Unlock' : 'Lock'}</button>
        <button class="btn danger" onclick="deleteThread(${t.thread_id})">Delete</button>`;
    } else {
      const sub = isSubscribed(currentUserId, t.thread_id);
      actions = `<button class="btn ${sub ? '' : 'success'}" onclick="toggleSubscribe(${t.thread_id})">
        ${sub ? '★ Following' : '☆ Subscribe'}</button>`;
    }
    return `
      <div class="thread-item">
        <div class="thread-icon-box">💬</div>
        <div class="thread-info">
          <div class="thread-title">${t.title}</div>
          <div class="thread-meta">
            <span>${getCategoryName(t.category_id)}</span>
            <span class="meta-dot"></span>
            <span>${countMsgs(t.thread_id)} posts</span>
            <span class="meta-dot"></span>${status}
          </div>
        </div>
        <div class="thread-actions">${actions}</div>
      </div>`;
  }).join('');

  return `<div class="page-title">Threads</div>
    <div class="page-desc">List of discussion threads</div>
    ${banner()}${createBtn}
    ${rows || '<div class="empty-state"><div class="empty-icon">◫</div>No threads available</div>'}`;
}

// ============================================================
// PAGE: MESSAGES
// ============================================================
function renderMessagesPage() {
  const msgs = MESSAGES.filter(m => !m.is_deleted);
  const rows = msgs.map(m => {
    const thread = THREADS.find(t => t.thread_id === m.thread_id);
    let actions  = '';
    if (currentRole !== 'user') {
      actions = `
        <button class="btn" onclick="editMessage(${m.message_id})">Edit</button>
        <button class="btn danger" onclick="deleteMessage(${m.message_id})">Delete</button>`;
    }
    return `
      <div class="thread-item" id="msg-${m.message_id}">
        <div class="thread-icon-box" style="font-size:11px">#${m.message_id}</div>
        <div class="thread-info">
          <div class="thread-title" style="font-size:13px">${m.content}</div>
          <div class="thread-meta">
            <span>${getUserName(m.user_id)}</span>
            <span class="meta-dot"></span>
            <span>${thread ? thread.title : ''}</span>
            <span class="meta-dot"></span>
            <span>${m.posted_date || ''}</span>
          </div>
        </div>
        <div class="thread-actions">${actions}</div>
      </div>`;
  }).join('');

  const openThreads = getActiveThreads().filter(t => !t.is_locked);
  const options = openThreads.map(t => `<option value="${t.thread_id}">${t.title}</option>`).join('');

  return `<div class="page-title">Posts</div>
    <div class="page-desc">All posts in the forum</div>
    ${banner()}
    ${rows || '<div class="empty-state"><div class="empty-icon">✉</div>No posts available</div>'}
    <div class="card" style="margin-top:1rem">
      <div class="card-title">Create New Post</div>
      <select id="threadSelect">${options}</select>
      <div class="compose-box">
        <input class="compose-input" id="msgInput" placeholder="Enter content...">
        <button class="btn success" onclick="postMessage()">Post</button>
      </div>
    </div>`;
}

// ============================================================
// PAGE: NOTIFICATIONS
// ============================================================
function renderNotificationsPage() {
  const notifs = NOTIFICATIONS.filter(n => n.user_id === currentUserId);
  const unread = notifs.filter(n => !n.is_read).length;
  const rows = notifs.map(n => {
    const t = THREADS.find(t => t.thread_id === n.thread_id);
    return `
      <div class="notif-item">
        <div class="notif-dot ${n.is_read ? 'read' : ''}"></div>
        <div class="notif-body">
          <div class="notif-text">New post in <strong>${t ? t.title : ''}</strong>
            ${n.is_read ? '<span style="color:var(--text-dim)">(read)</span>' : ''}</div>
          <div class="notif-time">${n.created_at}</div>
        </div>
        ${!n.is_read ? `<button class="btn" onclick="markRead(${n.notif_id})">Mark as Read</button>` : ''}
      </div>`;
  }).join('');

  return `<div class="page-title">Notifications</div>
    <div class="page-desc">${unread} unread</div>
    ${banner()}
    <div class="card">${rows || '<div class="empty-state"><div class="empty-icon">◎</div>No notifications available</div>'}</div>`;
}

// ============================================================
// PAGE: SUBSCRIBES
// ============================================================
function renderSubscribesPage() {
  const subs = SUBSCRIBES.filter(s => s.user_id === currentUserId);
  const rows = subs.map(s => {
    const t = THREADS.find(t => t.thread_id === s.thread_id);
    if (!t) return '';
    return `
      <div class="thread-item">
        <div class="thread-icon-box">💬</div>
        <div class="thread-info">
          <div class="thread-title">${t.title}</div>
          <div class="thread-meta">${getCategoryName(t.category_id)}</div>
        </div>
        <div class="thread-actions">
          <button class="btn danger" onclick="unsubscribe(${s.thread_id})">Unsubscribe</button>
        </div>
      </div>`;
  }).join('');

  return `<div class="page-title">Subscriptions</div>
    <div class="page-desc">Threads you are subscribed to</div>
    ${banner()}
    ${rows || '<div class="empty-state"><div class="empty-icon">★</div>You are not subscribed to any threads</div>'}`;
}

// ============================================================
// PAGE: MANAGE USERS (Mod)
// ============================================================
function renderManageUsersPage() {
  const rows = APP_USERS.map(u => {
    const badge = u.is_banned
      ? '<span class="status-badge banned"><span class="status-dot"></span>Bị ban</span>'
      : '<span class="status-badge active"><span class="status-dot"></span>Hoạt động</span>';
    const btn = u.is_banned
      ? `<button class="btn success" onclick="unbanUser(${u.user_id})">Unban</button>`
      : `<button class="btn danger"  onclick="banUser(${u.user_id})">Ban</button>`;
    return `<tr>
      <td>${u.first_name} ${u.last_name}</td>
      <td style="color:var(--text-muted)">${u.email || ''}</td>
      <td>${badge}</td>
      <td>${btn}</td>
    </tr>`;
  }).join('');

  return `<div class="page-title">Manage Users</div>
    <div class="page-desc">Ban/unban users</div>
    ${banner()}
    <div class="card">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ============================================================
// PAGE: BAN HISTORY (Mod)
// ============================================================
function renderBanHistoryPage() {
  const rows = BAN_HISTORY.map(b =>
    `<tr>
      <td>#${b.ban_id}</td>
      <td>${getUserName(b.user_id)}</td>
      <td>${getModName(b.mod_id)}</td>
      <td style="color:var(--text-muted)">${b.reason}</td>
      <td style="color:var(--text-muted)">${b.ban_date}</td>
    </tr>`).join('');

  return `<div class="page-title">Ban History</div>
    <div class="page-desc">Data from the Ban table</div>
    ${banner()}
    <div class="card">
      <table class="data-table">
        <thead><tr><th>ID</th><th>Banned User</th><th>Mod</th><th>Reason</th><th>Date</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:1rem">No records available</td></tr>'}</tbody>
      </table>
    </div>`;
}

// ============================================================
// PAGE: SYSTEM SETTINGS (Admin)
// ============================================================
function renderSystemSettingsPage() {
  const rows = SYSTEM_SETTINGS.map((s, i) => `
    <div class="setting-row">
      <div class="setting-key">${s.description || s.setting_key}<small>${s.setting_key}</small></div>
      <div class="setting-val" id="sval-${i}">${s.setting_value}</div>
      <button class="btn" onclick="editSetting(${i})">Edit</button>
    </div>`).join('');

  return `<div class="page-title">System Settings</div>
    <div class="page-desc">System settings — only Admin can edit</div>
    ${banner()}
    <div class="card"><div class="card-title">System Settings</div>${rows}</div>`;
}

// ============================================================
// PAGE: MANAGE MODS (Admin)
// ============================================================
function renderManageModsPage() {
  const rows = MANAGES_MODS.map(m => `
    <tr id="mod-row-${m.mod_id}">
      <td>${m.mod_name}</td>
      <td style="color:var(--text-muted)">mod${m.mod_id}@mail.com</td>
      <td>Super Admin</td>
      <td><button class="btn danger" onclick="removeMod(${m.mod_id})">Delete</button></td>
    </tr>`).join('');

  return `<div class="page-title">Manage Moderators</div>
    <div class="page-desc">Admin manages moderators</div>
    ${banner()}
    <button class="btn primary" style="margin-bottom:1rem" onclick="addMod()">+ Add Moderator</button>
    <div class="card">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Managed by</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody id="modTableBody">${rows}</tbody>
      </table>
    </div>`;
}

// ============================================================
// PAGE: PROFILE (User / Mod / Admin)
// ============================================================
function renderProfilePage() {
  const u = APP_USERS.find(u => u.user_id === currentUserId) || {};
  return `
    <div class="page-title">Profile</div>
    <div class="page-desc">Your account information</div>
    ${banner()}
    <div class="card" style="max-width:520px">
      <div class="card-title">Profile Information</div>
      <div class="form-group">
        <label>First Name</label>
        <input id="pf-first" value="${u.first_name || ''}" placeholder="First Name">
      </div>
      <div class="form-group">
        <label>Last Name</label>
        <input id="pf-last" value="${u.last_name || ''}" placeholder="Last Name">
      </div>
      <div class="form-group">
        <label>Gender</label>
        <select id="pf-gender">
          <option value="" ${!u.gender ? 'selected' : ''}>-- Select --</option>
          <option value="Male"   ${u.gender === 'Male'   ? 'selected' : ''}>Male</option>
          <option value="Female" ${u.gender === 'Female' ? 'selected' : ''}>Female</option>
          <option value="Other"  ${u.gender === 'Other'  ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label>Date of Birth</label>
        <input type="date" id="pf-dob" value="${u.date_of_birth ? u.date_of_birth.slice(0,10) : ''}">
      </div>
      <button class="btn success" onclick="saveProfile()">Save Changes</button>
    </div>`;
}

// ============================================================
// ACTIONS — gọi API thật
// ============================================================

// ── Đăng bài ─────────────────────────────────────────────────
function postMessage() {
  const input   = document.getElementById('msgInput');
  const sel     = document.getElementById('threadSelect');
  const content = input.value.trim();
  if (!content) { showToast('⚠ Please enter a message'); return; }

  fetch(`${API}/messages`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, user_id: currentUserId, thread_id: parseInt(sel.value) }),
  })
  .then(r => r.json())
  .then(async () => {
    showToast('✓ Message posted');
    MESSAGES = await fetch(`${API}/messages`).then(r => r.json());
    input.value = '';
    switchTab('messages');
  })
  .catch(() => showToast('❌ Server error'));
}

// ── Tạo thread ───────────────────────────────────────────────
function createThread() {
  const title = prompt('Enter new thread title:');
  if (!title || !title.trim()) return;

  fetch(`${API}/threads`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title.trim(), category_id: 1, created_by: currentUserId }),
  })
  .then(r => r.json())
  .then(async (data) => {
    showToast('✓ Thread created #' + data.thread_id);
    THREADS = await fetch(`${API}/threads`).then(r => r.json());
    switchTab('threads');
  })
  .catch(() => showToast('❌ Server error'));
}

// ── Xóa thread ───────────────────────────────────────────────
function deleteThread(tid) {
  if (!confirm('Delete this thread?')) return;

  fetch(`${API}/threads/${tid}`, {
    method:  'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deleted_by: currentUserId }),
  })
  .then(r => r.json())
  .then(async () => {
    showToast('✓ Thread deleted');
    THREADS = await fetch(`${API}/threads`).then(r => r.json());
    switchTab('threads');
  })
  .catch(() => showToast('❌ Server error'));
}

// ── Khóa / mở khóa thread ────────────────────────────────────
function lockThread(tid, newLockState) {
  fetch(`${API}/threads/${tid}/lock`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_locked: newLockState }),
  })
  .then(r => r.json())
  .then(async (data) => {
    showToast('✓ ' + data.message);
    THREADS = await fetch(`${API}/threads`).then(r => r.json());
    switchTab('threads');
  })
  .catch(() => showToast('❌ Server error'));
}

// ── Sửa message ──────────────────────────────────────────────
function editMessage(mid) {
  const m = MESSAGES.find(m => m.message_id === mid);
  if (!m) return;
  const val = prompt('Sửa nội dung:', m.content);
  if (!val || !val.trim()) return;

  fetch(`${API}/messages/${mid}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: val.trim(), mod_id: currentUserId }),
  })
  .then(r => r.json())
  .then(async () => {
    showToast('✓ Đã sửa bài');
    MESSAGES = await fetch(`${API}/messages`).then(r => r.json());
    switchTab('messages');
  })
  .catch(() => showToast('❌ Server error'));
}

// ── Xóa message ──────────────────────────────────────────────
function deleteMessage(mid) {
  if (!confirm('Delete this message?')) return;

  fetch(`${API}/messages/${mid}`, { method: 'DELETE' })
  .then(r => r.json())
  .then(async () => {
    showToast('✓ Message deleted');
    MESSAGES = await fetch(`${API}/messages`).then(r => r.json());
    switchTab('messages');
  })
  .catch(() => showToast('❌ Server error'));
}

// ── Ban user ──────────────────────────────────────────────────
function banUser(uid) {
  const u = APP_USERS.find(u => u.user_id === uid);
  if (!u) return;
  const reason = prompt(`Ban reason for ${u.first_name}:`) || 'Rule violation';

  fetch(`${API}/ban`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: uid, mod_id: currentUserId, reason }),
  })
  .then(r => r.json())
  .then(async () => {
    showToast('✓ User banned');
    APP_USERS   = await fetch(`${API}/users`).then(r => r.json());
    BAN_HISTORY = await fetch(`${API}/ban-history`).then(r => r.json());
    switchTab('manage-users');
  })
  .catch(() => showToast('❌ Server error'));
}

// ── Unban user ────────────────────────────────────────────────
function unbanUser(uid) {
  fetch(`${API}/unban`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: uid }),
  })
  .then(r => r.json())
  .then(async () => {
    showToast('✓ User unbanned');
    APP_USERS = await fetch(`${API}/users`).then(r => r.json());
    switchTab('manage-users');
  })
  .catch(() => showToast('❌ Server error'));
}

// ── Subscribe ─────────────────────────────────────────────────
function toggleSubscribe(tid) {
  const idx = SUBSCRIBES.findIndex(s => s.user_id === currentUserId && s.thread_id === tid);
  if (idx >= 0) {
    fetch(`${API}/subscribe`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId, thread_id: tid }),
    }).then(() => {
      SUBSCRIBES.splice(idx, 1);
      showToast('✓ Thread unsubscribed');
      switchTab('threads');
    });
  } else {
    fetch(`${API}/subscribe`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId, thread_id: tid }),
    }).then(() => {
      SUBSCRIBES.push({ user_id: currentUserId, thread_id: tid });
      showToast('✓ Thread subscribed');
      switchTab('threads');
    });
  }
}

function unsubscribe(tid) {
  fetch(`${API}/subscribe`, {
    method:  'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUserId, thread_id: tid }),
  }).then(async () => {
    SUBSCRIBES = await fetch(`${API}/subscribes/${currentUserId}`).then(r => r.json());
    showToast('✓ Thread unsubscribed');
    switchTab('subscribes');
  });
}

// ── Mark notification read ────────────────────────────────────
function markRead(nid) {
  fetch(`${API}/notifications/read/${nid}`, { method: 'PUT' })
  .then(() => {
    const n = NOTIFICATIONS.find(n => n.notif_id === nid);
    if (n) n.is_read = 1;
    showToast('✓ Marked as read');
    switchTab('notifications');
  });
}

// ── Edit system setting ───────────────────────────────────────
function editSetting(i) {
  const s   = SYSTEM_SETTINGS[i];
  const val = prompt(`Giá trị mới cho "${s.setting_key}":`, s.setting_value);
  if (!val || !val.trim()) return;

  fetch(`${API}/system-settings`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setting_key: s.setting_key, setting_value: val.trim() }),
  })
  .then(r => r.json())
  .then(() => {
    s.setting_value = val.trim();
    showToast(`✓ Updated ${s.setting_key} = ${val.trim()}`);
    switchTab('system-settings');
  });
}

// ── Add mod (chưa có API insert mod — hiện thông báo) ────────
function addMod() {
  showToast('⚠ The "Add Mod" feature requires creating an account first (use the Sign Up page).');
}

// ── Remove mod ───────────────────────────────────────────────
function removeMod(mid) {
  if (!confirm('Delete this moderator?')) return;
  fetch(`${API}/manages/${mid}`, { method: 'DELETE' })
  .then(r => r.json())
  .then(() => {
    const idx = MANAGES_MODS.findIndex(m => m.mod_id === mid);
    if (idx >= 0) MANAGES_MODS.splice(idx, 1);
    showToast('✓ Moderator deleted');
    switchTab('manage-mods');
  });
}

// ── Save profile ──────────────────────────────────────────────
function saveProfile() {
  const body = {
    first_name:    document.getElementById('pf-first').value.trim(),
    last_name:     document.getElementById('pf-last').value.trim(),
    gender:        document.getElementById('pf-gender').value,
    date_of_birth: document.getElementById('pf-dob').value || null,
  };

  fetch(`${API}/users/${currentUserId}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  .then(r => r.json())
  .then(async () => {
    showToast('✓ Profile saved');
    currentName = `${body.first_name} ${body.last_name}`.trim();
    APP_USERS   = await fetch(`${API}/users`).then(r => r.json());
    renderTopbar();
    // Cập nhật session
    const raw  = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (raw) {
      const user = { ...JSON.parse(raw), ...body };
      const storage = localStorage.getItem('currentUser') ? localStorage : sessionStorage;
      storage.setItem('currentUser', JSON.stringify(user));
    }
  })
  .catch(() => showToast('❌ Server error'));
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ============================================================
// INIT — đọc session, load data, render
// ============================================================
async function init() {
  if (!loadSession()) return;   // redirect nếu chưa login

  await loadAllData();

  if (currentRole === 'user') {
    await loadUserData(currentUserId);
  }

  document.getElementById('loginScreen').style.display  = 'none';
  document.getElementById('forumScreen').style.display  = 'flex';

  renderTopbar();
  renderSidebar();

  const defaultTab = currentRole === 'admin' ? 'system-settings' : 'threads';
  switchTab(defaultTab);
}

init();