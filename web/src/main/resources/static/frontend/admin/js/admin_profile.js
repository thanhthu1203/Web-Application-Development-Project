/* =============================================
   admin_profile.js
   ============================================= */

let currentAvatarBase64 = null;

async function populateProfile() {
  try {
    const adminData = await fetch(`${API}/admins/${currentUserId}`).then(r => r.json());

    const usernameField = document.getElementById('pf-username');
    if (usernameField) usernameField.value = adminData.username || '';

    const nameParts = (adminData.admin_name || '').split(' ');
    const firstField = document.getElementById('pf-first');
    const lastField  = document.getElementById('pf-last');
    if (firstField) firstField.value = nameParts[0]              || '';
    if (lastField)  lastField.value  = nameParts.slice(1).join(' ') || '';

    const emailField = document.getElementById('pf-email');
    if (emailField) emailField.value = adminData.email || '';

    const genderField = document.getElementById('pf-gender');
    if (genderField) genderField.value = adminData.gender || '';

    const dobField = document.getElementById('pf-dob');
    if (dobField) {
      if (adminData.date_of_birth) {
        const d = new Date(adminData.date_of_birth);
        dobField.value = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                           .toISOString()
                           .slice(0, 10);
      } else {
        dobField.value = '';
      }
    }

    currentAvatarBase64 = adminData.avatar || null;
    const avPreview = document.getElementById('pf-avatarPreview');
    if (avPreview) {
      if (currentAvatarBase64) {
        avPreview.innerHTML = `<img src="${currentAvatarBase64}" alt="Avatar">`;
      } else {
        const initial = (adminData.username || nameParts[0] || 'A').charAt(0).toUpperCase();
        avPreview.textContent = initial;
      }
    }
  } catch (err) {
    console.error('Error loading profile:', err);
    showToast('❌ Could not load profile information.');
  }
}

document.getElementById('pf-avatarInput')?.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast('❌ Image too large! Please choose an image under 2 MB.');
    this.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function (event) {
    currentAvatarBase64 = event.target.result;
    const avPreview = document.getElementById('pf-avatarPreview');
    if (avPreview) avPreview.innerHTML = `<img src="${currentAvatarBase64}" alt="Avatar">`;
  };
  reader.readAsDataURL(file);
});

async function saveProfile() {
  const username = document.getElementById('pf-username')?.value.trim();
  const first    = document.getElementById('pf-first')?.value.trim();
  const last     = document.getElementById('pf-last')?.value.trim();
  const gender   = document.getElementById('pf-gender')?.value;
  const dob      = document.getElementById('pf-dob')?.value || null;
  const fullName = `${first} ${last}`.trim();

  if (!username || !first || !last) {
    showToast('⚠ Please enter your Username, First Name, and Last Name.');
    return;
  }

  const bodyData = { username, name: fullName, gender, date_of_birth: dob, avatar: currentAvatarBase64 };

  try {
    const res = await fetch(`${API}/admins/${currentUserId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(bodyData)
    });

    if (res.ok) {
      showToast('✅ Profile saved successfully!');

      // Update globals so topbar refreshes immediately
      currentName              = username;
      window.currentUserAvatar = currentAvatarBase64;
      renderTopbar();

      // Persist into session so avatar/username survive page navigation and re-login
      const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
      if (raw) {
        const session = JSON.parse(raw);
        const updated = { ...session, ...bodyData, username, admin_name: fullName };
        const storage = localStorage.getItem('currentUser') ? localStorage : sessionStorage;
        storage.setItem('currentUser', JSON.stringify(updated));
      }
    } else {
      const errData = await res.json();
      showToast('❌ Error: ' + (errData.message || 'Unknown error'));
    }
  } catch (err) {
    console.error(err);
    showToast('❌ Could not connect to the server.');
  }
}

async function init() {
  if (!loadSession('admin')) return;
  renderTopbar();
  await populateProfile();
}

init();