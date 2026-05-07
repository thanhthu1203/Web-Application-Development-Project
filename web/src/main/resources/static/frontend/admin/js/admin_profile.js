async function populateProfile() {
  try {
    const adminData = await fetch(`${API}/admins/${currentUserId}`).then(r => r.json());
    
    const nameParts = (adminData.admin_name || '').split(' ');
    document.getElementById('pf-first').value = nameParts[0] || '';
    document.getElementById('pf-last').value = nameParts.slice(1).join(' ') || '';

    const emailField = document.getElementById('pf-email');
    if (emailField) emailField.value = adminData.email || '';

    document.getElementById('pf-gender').value = adminData.gender || '';
    if (adminData.date_of_birth) {
      document.getElementById('pf-dob').value = adminData.date_of_birth.slice(0, 10);
    } else {
      document.getElementById('pf-dob').value = '';
    }
  } catch (err) {
    console.error('Error loading profile:', err);
    showToast('❌ Không thể tải thông tin profile');
  }
}

function saveProfile() {
  const first = document.getElementById('pf-first').value.trim();
  const last  = document.getElementById('pf-last').value.trim();
  const fullName = (first + ' ' + last).trim();
  const gender = document.getElementById('pf-gender').value;
  const date_of_birth = document.getElementById('pf-dob').value || null;

  fetch(`${API}/admins/${currentUserId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fullName, gender, date_of_birth }),
  })
  .then(r => r.json())
  .then(() => {
    showToast('✓ Admin profile saved');
    currentName = fullName;
    renderTopbar(); 
    
    const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (raw) {
      const user = { ...JSON.parse(raw), admin_name: fullName };
      const storage = localStorage.getItem('currentUser') ? localStorage : sessionStorage;
      storage.setItem('currentUser', JSON.stringify(user));
    }
  })
  .catch(() => showToast('❌ Server error'));
}

async function init() {
  if (!loadSession('admin')) return;   
  renderTopbar();
  await populateProfile();
}

init();