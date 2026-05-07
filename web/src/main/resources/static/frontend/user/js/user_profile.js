/* =============================================
   user_profile.js - Xử lý Profile cho tất cả Role
   ============================================= */

// 1. Khởi tạo dữ liệu từ Common.js (Đã có sẵn API, currentUserId, currentRole...)
async function populateProfile() {
  try {
    let endpoint = '';
    // Xác định endpoint dựa trên role của người đang đăng nhập
    if (currentRole === 'admin') endpoint = `/admins/${currentUserId}`;
    else if (currentRole === 'moderator') endpoint = `/moderators/${currentUserId}`;
    else endpoint = `/users/${currentUserId}`;

    const data = await fetch(`${API}${endpoint}`).then(r => r.json());

    // Điền dữ liệu vào Form
    if (currentRole === 'user') {
      document.getElementById('pf-first').value = data.first_name || '';
      document.getElementById('pf-last').value  = data.last_name || '';
    } else {
      // Với Admin/Mod dùng trường 'name' (admin_name/mod_name)
      const fullName = data.admin_name || data.mod_name || '';
      const parts = fullName.split(' ');
      document.getElementById('pf-first').value = parts[0] || '';
      document.getElementById('pf-last').value  = parts.slice(1).join(' ') || '';
    }

    document.getElementById('pf-email').value  = data.email || '';
    document.getElementById('pf-gender').value = data.gender || '';
    if (data.date_of_birth) {
      document.getElementById('pf-dob').value = data.date_of_birth.slice(0, 10);
    }
  } catch (err) {
    console.error('Load Profile Error:', err);
    showToast('❌ Không thể tải thông tin cá nhân');
  }
}

async function saveProfile() {
  const first = document.getElementById('pf-first').value.trim();
  const last  = document.getElementById('pf-last').value.trim();
  const gender = document.getElementById('pf-gender').value;
  const dob    = document.getElementById('pf-dob').value || null;
  const fullName = `${first} ${last}`.trim();

  if (!first || !last) {
    showToast('⚠ Vui lòng nhập đầy đủ Họ và Tên');
    return;
  }

  // Chuẩn bị dữ liệu gửi đi (User gửi tách, Admin/Mod gửi gộp)
  let body = {};
  let endpoint = '';

  if (currentRole === 'user') {
    endpoint = `/users/${currentUserId}`;
    body = { first_name: first, last_name: last, gender, date_of_birth: dob };
  } else if (currentRole === 'admin') {
    endpoint = `/admins/${currentUserId}`;
    body = { name: fullName, gender, date_of_birth: dob };
  } else {
    endpoint = `/moderators/${currentUserId}`;
    body = { name: fullName, gender, date_of_birth: dob };
  }

  try {
    const res = await fetch(`${API}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      showToast('✅ Đã lưu thông tin thành công!');
      
      // CẬP NHẬT TRẠNG THÁI NGAY LẬP TỨC (Rất quan trọng)
      currentName = fullName;
      renderTopbar(); // Vẽ lại thanh topbar với tên mới

      // Cập nhật lại Session trong Storage
      const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
      if (raw) {
        const userSession = JSON.parse(raw);
        const updated = { ...userSession, ...body };
        // Nếu là admin/mod thì cập nhật thêm trường tên gộp cho đồng bộ session
        if (currentRole === 'admin') updated.admin_name = fullName;
        if (currentRole === 'moderator') updated.mod_name = fullName;

        const storage = localStorage.getItem('currentUser') ? localStorage : sessionStorage;
        storage.setItem('currentUser', JSON.stringify(updated));
      }
    } else {
      const err = await res.json();
      showToast('❌ Lỗi: ' + err.message);
    }
  } catch (err) {
    showToast('❌ Không thể kết nối đến Server');
  }
}

// Khởi chạy
async function init() {
  // loadSession() đã được định nghĩa trong common.js
  if (!loadSession()) return; 
  renderTopbar();
  await populateProfile();
}

init();