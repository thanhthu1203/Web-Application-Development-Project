let SYSTEM_SETTINGS = [];

async function loadData() {
  const settings = await fetch(`${API}/system-settings`).then(r => r.json());
  SYSTEM_SETTINGS = settings;
}

function populateSystemSettings() {
  const container = document.getElementById('settingsList');
  container.innerHTML = '';
  const tpl = document.getElementById('tpl-setting-row');

  SYSTEM_SETTINGS.forEach((s, i) => {
    const clone = tpl.content.cloneNode(true);
    clone.querySelector('.setting-desc').textContent = s.description || s.setting_key;
    clone.querySelector('.setting-code').textContent = s.setting_key;
    clone.querySelector('.setting-val').textContent = s.setting_value;
    
    clone.querySelector('.btn-edit').onclick = () => editSetting(i);
    container.appendChild(clone);
  });
}

function editSetting(i) {
  const s = SYSTEM_SETTINGS[i];
  const val = prompt(`Giá trị mới cho "${s.setting_key}":`, s.setting_value);
  if (!val || !val.trim()) return;

  fetch(`${API}/system-settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setting_key: s.setting_key, setting_value: val.trim() }),
  })
  .then(r => r.json())
  .then(() => {
    s.setting_value = val.trim();
    showToast(`✓ Updated ${s.setting_key} = ${val.trim()}`);
    populateSystemSettings(); 
  })
  .catch(() => showToast('❌ Server error'));
}

async function init() {
  if (!loadSession('admin')) return;   
  renderTopbar();
  await loadData();
  populateSystemSettings();
}

init();