const API = 'http://localhost:3000';

(function checkSession() {
  const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.role === 'admin') window.location.href = 'admin/system_settings.html';
    else if (user.role === 'moderator') window.location.href = 'mod/mod_threads.html';
    else window.location.href = 'user/user_threads.html';
  }
})();

document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const first = document.getElementById('first_name').value.trim();
  const last = document.getElementById('last_name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const gender = document.getElementById('gender').value;
  const dob = document.getElementById('dob').value;

  const btn = document.getElementById('submitBtn');
  btn.textContent = 'Creating...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, first_name: first, last_name: last, gender, date_of_birth: dob }),
    });
    const data = await res.json();

    if (!res.ok) {
      const toast = document.getElementById('toast');
      toast.textContent = data.message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
      btn.textContent = 'Create Account';
      btn.disabled = false;
      return;
    }

    alert('Đăng ký thành công! Chuyển về trang đăng nhập.');
    window.location.href = 'login.html';
  } catch (err) {
    alert('Server error.');
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
});