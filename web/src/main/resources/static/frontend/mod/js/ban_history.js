let APP_USERS = [];
let MODERATORS = [];
let BAN_HISTORY = [];

async function loadData() {
  const [users, mods, banHistory] = await Promise.all([
    fetch(`${API}/users`).then(r => r.json()),
    fetch(`${API}/manages`).then(r => r.json()),
    fetch(`${API}/ban-history`).then(r => r.json()),
  ]);
  APP_USERS = users;
  MODERATORS = mods;
  BAN_HISTORY = banHistory;
}

function getUserName(id) {
  const u = APP_USERS.find(u => u.user_id === id);
  return u ? `${u.first_name} ${u.last_name}` : 'Unknown';
}
function getModName(id) { 
  return (MODERATORS.find(m => m.mod_id === id) || {}).mod_name || 'Unknown'; 
}

function populateBanHistory() {
  const container = document.getElementById('banTableBody');
  container.innerHTML = '';

  if (BAN_HISTORY.length === 0) {
    container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1rem;">No records</td></tr>';
    return;
  }

  const tpl = document.getElementById('tpl-ban-row');
  BAN_HISTORY.forEach(b => {
    const clone = tpl.content.cloneNode(true);
    clone.querySelector('.b-id').textContent = `#${b.ban_id}`;
    clone.querySelector('.b-user').textContent = getUserName(b.user_id);
    clone.querySelector('.b-mod').textContent = getModName(b.mod_id);
    clone.querySelector('.b-reason').textContent = b.reason;
    clone.querySelector('.b-date').textContent = new Date(b.ban_date).toLocaleString();
    container.appendChild(clone);
  });
}

async function init() {
  if (!loadSession('moderator')) return; 
  renderTopbar();
  await loadData();
  populateBanHistory();
}
init();