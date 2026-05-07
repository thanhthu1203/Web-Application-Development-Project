const API = 'http://localhost:3000';

/* -- Helpers -- */
function showError(inputId, errId) {
  document.getElementById(inputId).classList.add('invalid');
  document.getElementById(errId).style.display = 'block';
}
function clearError(inputId, errId) {
  document.getElementById(inputId).classList.remove('invalid');
  document.getElementById(errId).style.display = 'none';
}

/* -- Login Logic -- */
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const remember = document.getElementById('remember')?.checked;

  if (!email) return showError('email', 'emailErr');
  if (!password) return showError('password', 'pwErr');

  const btn = e.target.querySelector('button');
  btn.textContent = 'Logging in...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      document.getElementById('errorBanner').style.display = 'block';
      document.getElementById('errorMsg').textContent = data.message;
      btn.textContent = 'Login';
      btn.disabled = false;
      return;
    }

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('currentUser', JSON.stringify(data));

    // ĐIỀU HƯỚNG ĐÚNG ĐẾN CÁC FILE ĐÃ TÁCH
    if (data.role === 'admin') {
      window.location.href = 'admin/system_settings.html';
    } else if (data.role === 'moderator') {
      window.location.href = 'mod/mod_threads.html';
    } else {
      window.location.href = 'user/user_threads.html';
    }

  } catch (err) {
    alert('Cannot connect to server.');
    btn.textContent = 'Login';
    btn.disabled = false;
  }
});

// Check session nếu đã login thì vào thẳng
(function checkSession() {
  const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.role === 'admin') window.location.href = 'admin/system_settings.html';
    else if (user.role === 'moderator') window.location.href = 'mod/mod_threads.html';
    else window.location.href = 'user/user_threads.html';
  }
})();