// ─────────────────────────────────────────
//  sign_up.js  –  logic cho trang đăng ký
//  Kết nối thật với POST /signup
// ─────────────────────────────────────────

const API = 'http://localhost:3000';

// ── Nếu đã đăng nhập rồi thì redirect luôn ──
(function checkSession() {
  const user = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  if (user) window.location.href = 'index.html';
})();

// ── Toggle hiện / ẩn mật khẩu ──
function makeToggle(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const inp = document.getElementById(inputId);
  btn.addEventListener('click', () => {
    const isHidden  = inp.type === 'password';
    inp.type        = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? '🙈' : '👁';
  });
}
makeToggle('togglePw',      'password');
makeToggle('toggleConfirm', 'confirmPw');

// ── Preview ảnh đại diện ──
document.getElementById('avatarInput').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    alert('Ảnh vượt quá 2MB, vui lòng chọn ảnh nhỏ hơn.');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('avatarPreview');
    document.getElementById('avatarEmoji').style.display = 'none';
    let img = preview.querySelector('img');
    if (!img) { img = document.createElement('img'); preview.appendChild(img); }
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// ── Thanh đo độ mạnh mật khẩu ──
document.getElementById('password').addEventListener('input', function () {
  const val = this.value;
  let score = 0;
  if (val.length >= 8)          score++;
  if (/[A-Z]/.test(val))        score++;
  if (/[0-9]/.test(val))        score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
  const labels = ['', 'Yếu', 'Trung bình', 'Khá tốt', 'Mạnh'];

  for (let i = 1; i <= 4; i++) {
    document.getElementById('s' + i).style.background =
      i <= score ? colors[score] : 'var(--border)';
  }
  const labelEl = document.getElementById('strengthLabel');
  labelEl.textContent = val ? labels[score] : '';
  labelEl.style.color = colors[score] || 'var(--muted)';

  clearError('password', 'pwErr');
});

// ── Helpers validation ──
function showError(inputId, errId) {
  document.getElementById(inputId).classList.add('invalid');
  document.getElementById(errId).style.display = 'block';
}
function clearError(inputId, errId) {
  document.getElementById(inputId).classList.remove('invalid');
  document.getElementById(errId).style.display = 'none';
}

// Xóa lỗi ngay khi người dùng gõ lại
const fieldErrMap = {
  firstName: 'firstNameErr',
  lastName:  'lastNameErr',
  username:  'usernameErr',
  email:     'emailErr',
  password:  'pwErr',
  confirmPw: 'confirmErr',
};
Object.keys(fieldErrMap).forEach(id => {
  document.getElementById(id).addEventListener('input', () =>
    clearError(id, fieldErrMap[id])
  );
});

// ── Xử lý submit form ──
document.getElementById('signupForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const first = document.getElementById('firstName').value.trim();
  const last  = document.getElementById('lastName').value.trim();
  const uname = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const pw    = document.getElementById('password').value;
  const cpw   = document.getElementById('confirmPw').value;
  const terms = document.getElementById('terms').checked;
  let valid   = true;

  // Validate phía client
  if (!first) { showError('firstName', 'firstNameErr'); valid = false; }
  if (!last)  { showError('lastName',  'lastNameErr');  valid = false; }

  if (!uname || /\s/.test(uname)) {
    showError('username', 'usernameErr');
    valid = false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) { showError('email', 'emailErr'); valid = false; }

  if (pw.length < 8) { showError('password', 'pwErr'); valid = false; }

  if (pw !== cpw) { showError('confirmPw', 'confirmErr'); valid = false; }

  const termsErr = document.getElementById('termsErr');
  if (!terms) { termsErr.style.display = 'block'; valid = false; }
  else          termsErr.style.display = 'none';

  if (!valid) return;

  // Loading state
  const btn = document.getElementById('submitBtn');
  btn.textContent = 'Đang tạo tài khoản...';
  btn.disabled    = true;

  try {
    const res = await fetch(`${API}/signup`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: pw,
        username: uname,
        first_name: first,
        last_name:  last,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Email đã tồn tại hoặc lỗi server
      const banner = document.getElementById('toast');
      banner.textContent = '❌ ' + (data.message || 'Đăng ký thất bại.');
      banner.style.background = 'var(--red)';
      banner.classList.add('show');
      setTimeout(() => banner.classList.remove('show'), 3500);
      btn.textContent = 'Create Account';
      btn.disabled    = false;
      return;
    }

    // Đăng ký thành công — hiện toast rồi redirect về login
    const toast = document.getElementById('toast');
    toast.textContent   = '✓ Đăng ký thành công! Đang chuyển đến trang đăng nhập...';
    toast.style.background = '';   // reset về màu xanh mặc định của CSS
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      window.location.href = 'login.html';
    }, 2000);

  } catch (err) {
    const toast = document.getElementById('toast');
    toast.textContent  = '❌ Không kết nối được server.';
    toast.style.background = 'var(--red)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
    btn.textContent = 'Create Account';
    btn.disabled    = false;
  }
});

// ── Đăng ký bằng mạng xã hội (chưa triển khai) ──
function socialSignup(provider) {
  alert(`Đăng ký với ${provider} (chưa hỗ trợ)`);
}