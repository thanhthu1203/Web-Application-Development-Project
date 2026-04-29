/* =============================================
   ForumHub – user_profile.js
   Kết nối data thật từ session + API
   ============================================= */

const API = 'http://localhost:3000';

// ── Đọc session ──────────────────────────────────────────────
const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
if (!raw) {
  // Chưa đăng nhập → về login
  window.location.href = 'login.html';
}

const SESSION = JSON.parse(raw || '{}');

// Xác định role thật từ object DB trả về
let currentRole = 'user';
if (SESSION.admin_id !== undefined)    currentRole = 'admin';
else if (SESSION.mod_id !== undefined) currentRole = 'moderator';

// ID thực để gọi API
const ME_ID = SESSION.user_id || SESSION.admin_id || SESSION.mod_id;

// ── State từ API ─────────────────────────────────────────────
let profileData = {};        // data user thật từ DB
let allUsers    = [];        // danh sách user (admin dùng)
let allMods     = [];        // danh sách mod (admin dùng)

// ── Fetch profile data thật ──────────────────────────────────
async function loadProfile() {
  try {
    if (currentRole === 'user') {
      const res = await fetch(`${API}/users/${ME_ID}`);
      profileData = await res.json();
    } else {
      // Mod / Admin: lấy từ users endpoint (vì bảng moderators / admins
      // join accounts — cách đơn giản nhất là dùng SESSION đã có)
      profileData = SESSION;
    }
  } catch (e) {
    console.error('Không tải được profile:', e);
    profileData = SESSION;
  }

  if (currentRole === 'admin') {
    try {
      const [usersRes, modsRes] = await Promise.all([
        fetch(`${API}/users`),
        fetch(`${API}/manages`),
      ]);
      allUsers = await usersRes.json();
      allMods  = await modsRes.json();
    } catch (e) { console.error(e); }
  }

  applyProfile();
}

// ── Tính tên hiển thị ────────────────────────────────────────
function getDisplayName() {
  if (profileData.first_name || profileData.last_name)
    return `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
  if (profileData.admin_name) return profileData.admin_name;
  if (profileData.mod_name)   return profileData.mod_name;
  return 'Unknown';
}

function getInitials(name) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getRoleText() {
  return { user: 'User', moderator: 'Moderator', admin: 'Admin' }[currentRole];
}

function getAvatarGradient() {
  return {
    user:      'linear-gradient(135deg,#6B8CF2,#90A9F7)',
    moderator: 'linear-gradient(135deg,#7C5CFC,#A68EFD)',
    admin:     'linear-gradient(135deg,#F26B6B,#F79090)',
  }[currentRole];
}

// ── Apply data lên UI ─────────────────────────────────────────
function applyProfile() {
  const name     = getDisplayName();
  const initials = getInitials(name);
  const role     = getRoleText();
  const email    = profileData.email || '—';
  const username = profileData.username ? '@' + profileData.username : '—';
  const dob      = profileData.date_of_birth ? profileData.date_of_birth.slice(0, 10) : '—';
  const gender   = profileData.gender || '—';
  const joined   = profileData.register_date
    ? new Date(profileData.register_date).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
    : '—';
  const joinedShort = profileData.register_date
    ? new Date(profileData.register_date).toLocaleDateString('en-US', { month:'short', year:'numeric' })
    : '—';

  // Hero
  const heroAvatar = document.getElementById('heroAvatar');
  heroAvatar.textContent   = initials;
  heroAvatar.style.background = getAvatarGradient();

  document.getElementById('roleBadge').className = `role-badge ${currentRole}`;
  document.getElementById('roleText').textContent  = role;
  document.getElementById('heroName').textContent   = name;
  document.getElementById('heroUsername').textContent = username;
  document.getElementById('heroBio').textContent =
    `${role} at ForumHub · ${gender !== '—' ? gender + ' · ' : ''}Joined ${joinedShort}`;

  // Stats (posts/threads/likes cần JOIN query, để sau;
  // joined đã có thật)
  document.getElementById('statJoined').textContent = joinedShort;

  // Info tab
  document.getElementById('infoName').textContent     = name;
  document.getElementById('infoUsername').textContent = username;
  document.getElementById('infoEmail').textContent    = email;
  document.getElementById('infoJoined').textContent   = joined;

  // Thêm dòng giới tính & ngày sinh nếu có element (optional)
  const infoGender = document.getElementById('infoGender');
  if (infoGender) infoGender.textContent = gender;
  const infoDob = document.getElementById('infoDob');
  if (infoDob) infoDob.textContent = dob;

  const infoRoleBadge = document.getElementById('infoRoleBadge');
  infoRoleBadge.className  = `inline-badge ${currentRole}`;
  infoRoleBadge.textContent = role;

  // Header location (nếu có element)
  const infoLocation = document.getElementById('infoLocation');
  if (infoLocation) infoLocation.textContent = profileData.location || '—';

  // Show/hide tabs theo role
  const tabModtools = document.getElementById('tabModtools');
  const tabAdmin    = document.getElementById('tabAdmin');
  const btnManage   = document.getElementById('btnManage');

  tabModtools.style.display = (currentRole === 'moderator' || currentRole === 'admin') ? '' : 'none';
  tabAdmin.style.display    = currentRole === 'admin' ? '' : 'none';
  btnManage.style.display   = currentRole === 'admin' ? '' : 'none';

  // Role switcher: ẩn đi vì đã có session thật
  const roleSwitcher = document.querySelector('.role-switcher');
  if (roleSwitcher) roleSwitcher.style.display = 'none';

  // Pre-fill modal
  document.getElementById('editName').value     = name;
  document.getElementById('editUsername').value = profileData.username || '';
  document.getElementById('editEmail').value    = email;
  document.getElementById('editBio').value      = '';
  document.getElementById('editLocation').value = profileData.location || '';

  // Nếu admin: render danh sách mod thật
  if (currentRole === 'admin') renderAdminMods();

  // Header: thay Login/Sign Up bằng Logout
  renderHeaderUser(name, initials);
}

// ── Render header user info thay Login/SignUp buttons ────────
function renderHeaderUser(name, initials) {
  const actions = document.querySelector('.header-actions');
  if (!actions) return;

  // Xóa nút Login / Sign Up
  actions.querySelectorAll('.btn-login, .btn-signup').forEach(el => el.remove());

  // Thêm chip user + nút Logout
  const chip = document.createElement('div');
  chip.style.cssText = 'display:flex;align-items:center;gap:10px;';
  chip.innerHTML = `
    <div style="
      width:32px;height:32px;border-radius:50%;
      background:${getAvatarGradient()};
      color:#fff;font-weight:700;font-size:13px;
      display:flex;align-items:center;justify-content:center;">
      ${initials}
    </div>
    <span style="font-size:13px;font-weight:600;">${name}</span>
    <button onclick="doLogout()" style="
      padding:6px 14px;border-radius:8px;border:none;
      background:#ef4444;color:#fff;font-size:12px;
      font-weight:600;cursor:pointer;">Logout</button>
  `;
  actions.appendChild(chip);
}

// ── Logout ────────────────────────────────────────────────────
function doLogout() {
  localStorage.removeItem('currentUser');
  sessionStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

// ── Admin: render danh sách mod thật ─────────────────────────
function renderAdminMods() {
  const modList = document.querySelector('.mod-user-list');
  if (!modList || allMods.length === 0) return;

  const colors = ['linear-gradient(135deg,#7C5CFC,#A68EFD)', 'linear-gradient(135deg,#52C5A0,#5EDDB8)',
                  'linear-gradient(135deg,#F26B6B,#F79090)', 'linear-gradient(135deg,#6B8CF2,#90A9F7)'];

  modList.innerHTML = allMods.map((m, i) => `
    <div class="mod-user-row">
      <div class="ou-avatar" style="background:${colors[i % colors.length]};">
        ${(m.mod_name || '?')[0].toUpperCase()}
      </div>
      <div class="mod-user-info">
        <div class="mod-user-name">${m.mod_name}</div>
        <div class="mod-user-since">mod_id: ${m.mod_id}</div>
      </div>
      <button class="btn-demote" onclick="demoteMod(${m.mod_id})">Demote</button>
    </div>`).join('');
}

// ── Demote mod (gọi API) ──────────────────────────────────────
async function demoteMod(modId) {
  if (!confirm('Xóa moderator này?')) return;
  try {
    const res = await fetch(`${API}/manages/${modId}`, { method: 'DELETE' });
    const data = await res.json();
    showToast(data.message || 'Đã xóa moderator');
    allMods = allMods.filter(m => m.mod_id !== modId);
    renderAdminMods();
  } catch (e) {
    showToast('❌ Lỗi kết nối server');
  }
}

// ── Tab switching ─────────────────────────────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tabName));
  document.querySelectorAll('.tab-pane').forEach(pane =>
    pane.classList.toggle('active', pane.id === `tab-${tabName}`));
}

// ── Modal ─────────────────────────────────────────────────────
function openEditModal() {
  document.getElementById('editModal').classList.add('open');
}
function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
}

// ── Save profile (gọi API thật) ───────────────────────────────
async function saveProfile() {
  const fullName = document.getElementById('editName').value.trim().split(' ');
  const first    = fullName[0] || '';
  const last     = fullName.slice(1).join(' ') || '';
  const email    = document.getElementById('editEmail').value.trim();
  const location = document.getElementById('editLocation').value.trim();

  if (currentRole === 'user') {
    try {
      const res = await fetch(`${API}/users/${ME_ID}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: first,
          last_name:  last,
          gender:     profileData.gender || null,
          date_of_birth: profileData.date_of_birth || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast('❌ ' + data.message); return; }

      // Cập nhật local
      profileData.first_name = first;
      profileData.last_name  = last;
      profileData.location   = location;

      // Cập nhật session
      const updated = { ...SESSION, first_name: first, last_name: last };
      const storage = localStorage.getItem('currentUser') ? localStorage : sessionStorage;
      storage.setItem('currentUser', JSON.stringify(updated));

    } catch (e) {
      showToast('❌ Lỗi kết nối server');
      return;
    }
  } else {
    // Mod / Admin: chưa có endpoint riêng, cập nhật local + session thôi
    profileData.first_name = first;
    profileData.last_name  = last;
  }

  applyProfile();
  closeEditModal();
  showToast('✓ Profile updated successfully!');
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className   = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('toast-hide'), 2500);
  setTimeout(() => toast.remove(), 3000);
}

// Toast styles
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  .toast {
    position: fixed;
    bottom: 80px;
    right: 20px;
    background: #1A1A2E;
    color: #fff;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'Sora', sans-serif;
    box-shadow: 0 8px 30px rgba(0,0,0,0.18);
    z-index: 999;
    animation: toastIn 0.25s ease;
    transition: opacity 0.4s ease;
  }
  .toast-hide { opacity: 0; }
  @keyframes toastIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(toastStyle);

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );

  // Close modal khi click ngoài
  document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeEditModal();
  });

  // Load data thật từ API
  loadProfile();
});