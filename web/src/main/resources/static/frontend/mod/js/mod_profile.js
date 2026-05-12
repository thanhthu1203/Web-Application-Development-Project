// 

//---- code mới để test ----
/* =============================================
   mod_profile.js
   ============================================= */

let currentAvatarBase64 = null;

async function populateProfile() {
  try {
    const data = await fetch(`${API}/moderators/${currentUserId}`).then(r => r.json());

    const f = id => document.getElementById(id);

    if (f('pf-username')) f('pf-username').value = data.username || '';

    const nameParts = (data.mod_name || '').split(' ');
    if (f('pf-first')) f('pf-first').value = nameParts[0]              || '';
    if (f('pf-last'))  f('pf-last').value  = nameParts.slice(1).join(' ') || '';

    if (f('pf-email'))  f('pf-email').value  = data.email  || '';
    if (f('pf-gender')) f('pf-gender').value = data.gender || '';

    if (f('pf-dob') && data.date_of_birth) {
      const d = new Date(data.date_of_birth);
      f('pf-dob').value = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                            .toISOString().slice(0, 10);
    }

    currentAvatarBase64 = data.avatar || null;
    _renderAvatarPreview(data.username || nameParts[0] || 'M');

  } catch (err) {
    console.error('Error loading profile:', err);
    showToast('❌ Could not load profile information.');
  }
}

function _renderAvatarPreview(fallbackLetter) {
  const avPreview = document.getElementById('pf-avatarPreview');
  if (!avPreview) return;
  if (currentAvatarBase64) {
    avPreview.innerHTML = `<img src="${currentAvatarBase64}" alt="Avatar">`;
  } else {
    avPreview.textContent = (fallbackLetter || 'M').charAt(0).toUpperCase();
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
    _renderAvatarPreview();
  };
  reader.readAsDataURL(file);
});

async function saveProfile() {
  const f = id => document.getElementById(id)?.value.trim();

  const username = f('pf-username');
  const first    = f('pf-first');
  const last     = f('pf-last');
  const gender   = document.getElementById('pf-gender')?.value || '';
  const dob      = document.getElementById('pf-dob')?.value    || null;
  const fullName = `${first} ${last}`.trim();

  if (!username || !first || !last) {
    showToast('⚠ Please enter your Username, First Name, and Last Name.');
    return;
  }

  const body = { username, name: fullName, gender, date_of_birth: dob, avatar: currentAvatarBase64 };

  try {
    const res = await fetch(`${API}/moderators/${currentUserId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      showToast('❌ Error: ' + (err.message || 'Unknown error'));
      return;
    }

    showToast('✅ Profile saved successfully!');

    currentName              = username;
    window.currentUserAvatar = currentAvatarBase64;
    renderTopbar();

    const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (raw) {
      const updated = { ...JSON.parse(raw), ...body, username, mod_name: fullName };
      const storage = localStorage.getItem('currentUser') ? localStorage : sessionStorage;
      storage.setItem('currentUser', JSON.stringify(updated));
    }

  } catch (err) {
    console.error(err);
    showToast('❌ Could not connect to the server.');
  }
}

async function init() {
  if (!await loadSession('moderator')) return;
  renderTopbar();
  await populateProfile();
}

init();