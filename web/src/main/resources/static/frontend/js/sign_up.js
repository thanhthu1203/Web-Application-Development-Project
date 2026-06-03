const API = 'http://localhost:3000';

// Redirect if already logged in
(function checkSession() {
  const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.role === 'admin')          window.location.href = 'admin/system_settings.html';
    else if (user.role === 'moderator') window.location.href = 'mod/mod_threads.html';
    else                                window.location.href = 'user/user_threads.html';
  }
})();

//  Avatar preview 

let avatarBase64 = null; // store the base64 string to send to server on signup

const avatarInput   = document.getElementById('avatarInput');
const avatarPreview = document.getElementById('avatarPreview');

avatarInput?.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    alert('Image too large! Please choose an image under 2 MB.');
    avatarInput.value = '';
    avatarBase64      = null;
    return;
  }

  const reader = new FileReader();
  reader.onload = function (event) {
    avatarBase64 = event.target.result; // save base64 for upload
    avatarPreview.innerHTML = `<img src="${avatarBase64}" alt="Avatar"
                                    style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  };
  reader.readAsDataURL(file);
});

// ── Password strength meter 

document.getElementById('password')?.addEventListener('input', function () {
  const val = this.value;
  let strength = 0;
  if (val.length >= 8)           strength++;
  if (/[A-Z]/.test(val))         strength++;
  if (/[0-9]/.test(val))         strength++;
  if (/[^A-Za-z0-9]/.test(val)) strength++;

  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  for (let i = 1; i <= 4; i++) {
    const seg = document.getElementById(`s${i}`);
    if (seg) seg.style.background = i <= strength ? colors[strength] : '#e5e7ef';
  }

  const label = document.getElementById('strengthLabel');
  if (label) label.textContent = val.length > 0 ? labels[strength] : '';
});

// Toggle password visibility
document.getElementById('togglePw')?.addEventListener('click', () => {
  const pw = document.getElementById('password');
  pw.type = pw.type === 'password' ? 'text' : 'password';
});

document.getElementById('toggleConfirm')?.addEventListener('click', () => {
  const pw = document.getElementById('confirmPw');
  pw.type = pw.type === 'password' ? 'text' : 'password';
});

// ── Form submission  

document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const first     = document.getElementById('firstName').value.trim();
  const last      = document.getElementById('lastName').value.trim();
  const username  = document.getElementById('username').value.trim();
  const email     = document.getElementById('email').value.trim();
  const password  = document.getElementById('password').value;
  const confirmPw = document.getElementById('confirmPw').value;
  const dob       = document.getElementById('dob').value;
  const isTerms   = document.getElementById('terms').checked;

  // Gender radio
  const genderChecked = document.querySelector('input[name="gender"]:checked');
  let gender = '';
  if (genderChecked) {
    const v = genderChecked.value;
    gender = v.charAt(0).toUpperCase() + v.slice(1); // e.g. "Male"
  }

  // Validation
  let hasError = false;

  function showErr(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'block' : 'none';
  }

  showErr('firstNameErr',  !first);
  showErr('lastNameErr',   !last);
  showErr('usernameErr',   !username || /\s/.test(username));
  showErr('emailErr',      !email || !/\S+@\S+\.\S+/.test(email));
  showErr('pwErr',         password.length < 8);
  showErr('confirmErr',    password !== confirmPw);
  showErr('termsErr',      !isTerms);

  if (!first || !last || !username || /\s/.test(username) ||
      !email || !/\S+@\S+\.\S+/.test(email) ||
      password.length < 8 || password !== confirmPw || !isTerms) {
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.textContent = 'Creating...';
  btn.disabled    = true;

  try {
    const res = await fetch(`${API}/signup`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        confirmPassword: confirmPw,
        first_name:    first,
        last_name:     last,
        gender:        gender || null,
        date_of_birth: dob    || null,
        avatar:        avatarBase64 || null   // send base64 avatar
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = data.message || 'Registration error';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      }
      btn.textContent = 'Create Account';
      btn.disabled    = false;
      return;
    }

    // Success
    alert('Account created successfully! Please log in.');
    window.location.href = 'login.html';

  } catch (err) {
    alert('Could not connect to the server. Please try again.');
    btn.textContent = 'Create Account';
    btn.disabled    = false;
  }
});