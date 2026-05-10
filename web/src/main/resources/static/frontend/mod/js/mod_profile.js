async function populateProfile() {
  try {
    const modData = await fetch(`${API}/moderators/${currentUserId}`).then(r => r.json());
    
    const nameParts = (modData.mod_name || '').split(' ');
    document.getElementById('pf-first').value = nameParts[0] || '';
    document.getElementById('pf-last').value = nameParts.slice(1).join(' ') || '';

    const emailField = document.getElementById('pf-email');
    if (emailField) emailField.value = modData.email || '';

    document.getElementById('pf-gender').value = modData.gender || '';
    if (modData.date_of_birth) {
      document.getElementById('pf-dob').value = modData.date_of_birth.slice(0, 10);
    } else {
      document.getElementById('pf-dob').value = '';
    }
  } catch (err) {
    console.error('Error loading profile:', err);
    showToast('❌ cannot load profile');
  }
}

function saveProfile() {
  const first = document.getElementById('pf-first').value.trim();
  const last  = document.getElementById('pf-last').value.trim();
  const gender = document.getElementById('pf-gender').value;
  const date_of_birth = document.getElementById('pf-dob').value || null;
  const fullName = `${first} ${last}`;

  fetch(`${API}/moderators/${currentUserId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fullName, gender, date_of_birth }),
  }).then(() => {
    showToast('✓ Profile saved');
    currentName = fullName;
    renderTopbar();
    
    const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (raw) {
      const user = { ...JSON.parse(raw), mod_name: fullName };
      const storage = localStorage.getItem('currentUser') ? localStorage : sessionStorage;
      storage.setItem('currentUser', JSON.stringify(user));
    }
  });
}

async function init() {
  if (!loadSession('moderator')) return; 
  renderTopbar();
  await populateProfile();
}
init();