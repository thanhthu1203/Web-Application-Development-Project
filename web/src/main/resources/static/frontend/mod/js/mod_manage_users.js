let APP_USERS = [];

async function loadData() {
  APP_USERS = await fetch(`${API}/users`).then(r => r.json());
}

function populateUsers() {
  const container = document.getElementById('userTableBody');
  container.innerHTML = '';
  
  const tpl = document.getElementById('tpl-user-row');
  APP_USERS.forEach(u => {
    const clone = tpl.content.cloneNode(true);
    clone.querySelector('.u-name').textContent = `${u.first_name} ${u.last_name}`;
    clone.querySelector('.u-email').textContent = u.email || '';
    
    const statusTd = clone.querySelector('.u-status');
    statusTd.innerHTML = u.is_banned 
      ? '<span class="status-badge banned"><span class="status-dot"></span>Banned</span>'
      : '<span class="status-badge active"><span class="status-dot"></span>Active</span>';

    const btn = clone.querySelector('.btn-ban-action');
    btn.textContent = u.is_banned ? 'Unban' : 'Ban';
    btn.className = `btn ${u.is_banned ? 'success' : 'danger'}`;
    btn.onclick = () => u.is_banned ? unbanUser(u.user_id) : banUser(u.user_id);

    container.appendChild(clone);
  });
}

function banUser(uid) {
  const reason = prompt('Reason:') || 'Violation';
  fetch(`${API}/ban`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: uid, mod_id: currentUserId, reason }),
  }).then(async () => {
    APP_USERS = await fetch(`${API}/users`).then(r => r.json());
    populateUsers();
  });
}

function unbanUser(uid) {
  fetch(`${API}/unban`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: uid }),
  }).then(async () => {
    APP_USERS = await fetch(`${API}/users`).then(r => r.json());
    populateUsers();
  });
}

async function init() {
  if (!loadSession('moderator')) return; 
  renderTopbar();
  await loadData();
  populateUsers();
}
init();