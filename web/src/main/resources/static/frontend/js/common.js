// dùng để chứa biến cục bộ cho các role
const API = "http://localhost:3000";

// Biến State chung
let currentRole   = null;
let currentUserId = null;
let currentName   = null;
let toastTimer    = null;

// Hàm kiểm tra session
function loadSession(expectedRole) {
  const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  if (!raw) {
    window.location.href = '../login.html';
    return false;
  }
  const user = JSON.parse(raw);
  
  currentUserId = user.user_id || user.admin_id || user.mod_id;
  currentName   = `${user.first_name || user.admin_name || user.mod_name || ''} ${user.last_name || ''}`.trim();
  currentRole   = user.role; // API đã trả về role ở signup/login

  // Chặn nếu vào sai trang (Ví dụ: user thường cố vào admin.html)
  if (expectedRole && currentRole !== expectedRole) {
    alert("Bạn không có quyền truy cập trang này!");
    window.location.href = '../login.html';
    return false;
  }
  return true;
}

// Đăng xuất
function doLogout() {
  localStorage.removeItem('currentUser');
  sessionStorage.removeItem('currentUser');
  window.location.href = '../login.html';
}

// Render Topbar
function renderTopbar() {
  const initials  = currentName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = { admin: 'Admin', moderator: 'Moderator', user: 'User' }[currentRole];
  
  const av = document.getElementById('chipAvatar');
  av.className  = 'chip-avatar ' + currentRole;
  av.textContent = initials;
  document.getElementById('chipName').textContent = currentName;
  
  const badge = document.getElementById('chipRole');
  badge.className  = 'role-tag ' + currentRole;
  badge.textContent = roleLabel;
}

// Toast Notification
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}