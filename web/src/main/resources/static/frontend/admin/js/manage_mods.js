let MANAGES_MODS = [];

async function loadData() {
  const mods = await fetch(`${API}/manages`).then(r => r.json());
  MANAGES_MODS = mods;
}

function populateManageMods() {
  const container = document.getElementById('modTableBody');
  container.innerHTML = '';

  if (MANAGES_MODS.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4" style="text-align:center; color:var(--text-dim); padding:1rem;">No moderators found</td>`;
    container.appendChild(tr);
    return;
  }

  const tpl = document.getElementById('tpl-mod-row');
  MANAGES_MODS.forEach(m => {
    const clone = tpl.content.cloneNode(true);
    clone.querySelector('.mod-name').textContent = m.mod_name;
    clone.querySelector('.mod-email').textContent = m.email || 'N/A';
    clone.querySelector('.btn-delete').onclick = () => removeMod(m.mod_id);
    container.appendChild(clone);
  });
}

function removeMod(mid) {
  if (!confirm('Delete this moderator?')) return;
  fetch(`${API}/manages/${mid}`, { method: 'DELETE' })
  .then(r => r.json())
  .then(() => {
    const idx = MANAGES_MODS.findIndex(m => m.mod_id === mid);
    if (idx >= 0) MANAGES_MODS.splice(idx, 1);
    showToast('✓ Moderator deleted');
    populateManageMods(); 
  })
  .catch(err => {
    console.error(err);
    showToast('❌ Server error');
  });
}

function openAddModModal() {
  const modal = document.getElementById('addModModal');
  if (modal) modal.style.display = 'flex';
}

function closeAddModModal() {
  const modal = document.getElementById('addModModal');
  if (modal) modal.style.display = 'none';
  // Reset form
  document.getElementById('modEmail').value = '';
  document.getElementById('modUsername').value = '';
  document.getElementById('modName').value = '';
  document.getElementById('modPassword').value = '';
}

async function submitAddMod() {
  const email = document.getElementById('modEmail')?.value.trim();
  const username = document.getElementById('modUsername')?.value.trim();
  const mod_name = document.getElementById('modName')?.value.trim();
  const password = document.getElementById('modPassword')?.value.trim();

  // Validation
  if (!email) {
    showToast('⚠️ Email is required');
    return;
  }
  if (!username) {
    showToast('⚠️ Username is required');
    return;
  }
  if (!mod_name) {
    showToast('⚠️ Moderator name is required');
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('⚠️ Invalid email format');
    return;
  }

  // Username validation (3-20 chars, no spaces)
  if (username.length < 3 || username.length > 20 || /\s/.test(username)) {
    showToast('⚠️ Username must be 3-20 characters, no spaces');
    return;
  }

  try {
    const res = await fetch(`${API}/moderators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        username,
        mod_name,
        password: password || null,
        admin_id: currentUserId   
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast('❌ Error: ' + data.message);
      return;
    }

    showToast('✅ Moderator created successfully!');
    
    if (data.temp_password && !password) {
      alert(`⚠️ Temporary password: ${data.temp_password}\nPlease share this with the moderator.`);
    }

    closeAddModModal();
    await loadData();
    populateManageMods();
  } catch (err) {
    console.error(err);
    showToast('❌ Cannot connect to server');
  }
}

async function init() {
  if (!loadSession('admin')) return;   
  renderTopbar();
  await loadData();
  populateManageMods();
}

init();