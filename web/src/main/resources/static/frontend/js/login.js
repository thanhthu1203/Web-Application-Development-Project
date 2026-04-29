/* ─────────────────────────────────────────
   login.js  –  logic cho trang đăng nhập
   Gọi POST /login thật thay vì alert() demo
   ─────────────────────────────────────────  */

const API = 'http://localhost:3000';

/* ── Toggle hiện / ẩn mật khẩu ── */
const togglePwBtn = document.getElementById('togglePw');
const pwInput     = document.getElementById('password');

togglePwBtn.addEventListener('click', () => {
  const isHidden = pwInput.type === 'password';
  pwInput.type            = isHidden ? 'text' : 'password';
  togglePwBtn.textContent = isHidden ? '🙈' : '👁';
});

/* ── Helpers validation ── */
function showError(inputId, errId) {
  document.getElementById(inputId).classList.add('invalid');
  document.getElementById(errId).style.display = 'block';
}

function clearError(inputId, errId) {
  document.getElementById(inputId).classList.remove('invalid');
  document.getElementById(errId).style.display = 'none';
}

/* Xóa lỗi ngay khi người dùng bắt đầu gõ lại */
const fieldErrMap = {
  email:    'emailErr',
  password: 'pwErr',
};

Object.keys(fieldErrMap).forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    clearError(id, fieldErrMap[id]);
    hideBanner();
  });
});

/* ── Error banner từ server ── */
function showBanner(msg) {
  const banner = document.getElementById('errorBanner');
  document.getElementById('errorMsg').textContent = msg;
  banner.classList.remove('visible');
  void banner.offsetWidth; // reset animation
  banner.classList.add('visible');
}

function hideBanner() {
  document.getElementById('errorBanner').classList.remove('visible');
}

/* ── Xử lý submit form ── */
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const emailVal = document.getElementById('email').value.trim();
  const pwVal    = document.getElementById('password').value;
  const remember = document.getElementById('remember').checked;
  let valid = true;

  // Validate phía client trước
  if (!emailVal) { showError('email', 'emailErr'); valid = false; }
  else            { clearError('email', 'emailErr'); }

  if (!pwVal)    { showError('password', 'pwErr'); valid = false; }
  else            { clearError('password', 'pwErr'); }

  if (!valid) return;

  // Loading state
  const btn = document.getElementById('submitBtn');
  btn.textContent = 'Logging in...';
  btn.disabled    = true;

  try {
    const res = await fetch(`${API}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: emailVal, password: pwVal }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Sai email / mật khẩu hoặc bị ban
      showBanner(data.message || 'Incorrect email or password.');
      showError('email', 'emailErr');
      showError('password', 'pwErr');
      btn.textContent = 'Login';
      btn.disabled    = false;
      return;
    }

    // Đăng nhập thành công — lưu session
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('currentUser', JSON.stringify(data));

    // Redirect về trang chính
    window.location.href = 'index.html';

  } catch (err) {
    // Không kết nối được server
    showBanner('Cannot connect to server. Please try again.');
    btn.textContent = 'Login';
    btn.disabled    = false;
  }
});

/* ── Đăng nhập bằng mạng xã hội (chưa triển khai) ── */
function socialLogin(provider) {
  showBanner(`${provider} login is not yet available.`);
}

/* ── Nếu đã login rồi thì redirect luôn ── */
(function checkSession() {
  const user = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  if (user) window.location.href = 'index.html';
})();