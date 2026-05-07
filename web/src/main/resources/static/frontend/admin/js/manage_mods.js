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
    clone.querySelector('.mod-email').textContent = `mod${m.mod_id}@mail.com`;
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
  .catch(() => showToast('❌ Server error'));
}

function addMod() {
  showToast('⚠ The "Add Mod" feature requires creating an account first (use the Sign Up page).');
}

async function init() {
  if (!loadSession('admin')) return;   
  renderTopbar();
  await loadData();
  populateManageMods();
}

init();