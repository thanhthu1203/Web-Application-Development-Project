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

// --- ĐOẠN CODE XỬ LÝ HIỂN THỊ ẢNH PREVIEW ---
const avatarInput = document.getElementById('avatarInput');
const avatarPreview = document.getElementById('avatarPreview');

avatarInput?.addEventListener('change', function(e) {
  const file = e.target.files[0]; // Lấy file người dùng vừa chọn
  
  if (file) {
    // Tùy chọn: Kiểm tra dung lượng file (giới hạn 2MB như giao diện yêu cầu)
    if (file.size > 2 * 1024 * 1024) {
      alert('Kích thước ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.');
      avatarInput.value = ''; // Reset lại input
      return;
    }

    // Tạo một URL tạm thời cho bức ảnh
    const imageUrl = URL.createObjectURL(file);
    
    // Gắn thẻ img chứa ảnh vào trong khung preview
    avatarPreview.innerHTML = `<img src="${imageUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
  }
});

document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // 1. SỬA ID CHO KHỚP VỚI HTML
  const first = document.getElementById('firstName').value.trim();
  const last = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const dob = document.getElementById('dob').value;

  // 2. SỬA CÁCH LẤY GIÁ TRỊ RADIO BUTTON (GENDER)
  const genderChecked = document.querySelector('input[name="gender"]:checked');
  const gender = genderChecked ? genderChecked.value : '';

  const btn = document.getElementById('submitBtn');
  btn.textContent = 'Creating...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: email, 
        password: password, 
        first_name: first, 
        last_name: last, 
        gender: gender, 
        date_of_birth: dob 
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      const toast = document.getElementById('toast');
      toast.textContent = data.message || "Lỗi đăng ký";
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