let APP_USERS = [];
let THREADS = [];
let MESSAGES = [];

async function loadData() {
  const [users, threads, messages] = await Promise.all([
    fetch(`${API}/users`).then(r => r.json()),
    fetch(`${API}/threads`).then(r => r.json()),
    fetch(`${API}/messages`).then(r => r.json())
  ]);
  APP_USERS = users;
  THREADS = threads;
  MESSAGES = messages;
}

function getUserName(id) {
  const u = APP_USERS.find(u => u.user_id === id);
  return u ? `${u.first_name} ${u.last_name}` : 'Unknown';
}

function renderEmpty(container, icon, text) {
  container.innerHTML = '';
  const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
  tpl.querySelector('.empty-icon').textContent = icon;
  tpl.querySelector('.empty-text').textContent = text;
  container.appendChild(tpl);
}

function populateMessages() {
  const container = document.getElementById('modMessagesList');
  container.innerHTML = '';
  const msgs = MESSAGES.filter(m => !m.is_deleted);

  if (msgs.length === 0) {
    renderEmpty(container, '✉', 'No posts available');
    return;
  }

  const tpl = document.getElementById('tpl-message-mod');
  msgs.forEach(m => {
    const clone = tpl.content.cloneNode(true);
    const thread = THREADS.find(t => t.thread_id === m.thread_id);
    
    clone.querySelector('.thread-icon-box').textContent = `#${m.message_id}`;
    clone.querySelector('.thread-title').textContent = m.content;
    clone.querySelector('.meta-user').textContent = getUserName(m.user_id);
    clone.querySelector('.meta-thread').textContent = thread ? thread.title : '';
    clone.querySelector('.meta-date').textContent = m.posted_date || '';
    
    clone.querySelector('.btn-edit').onclick = () => editMessage(m.message_id);
    clone.querySelector('.btn-delete').onclick = () => deleteMessage(m.message_id);
    
    container.appendChild(clone);
  });
}

function editMessage(mid) {
    const m = MESSAGES.find(msg => msg.message_id === mid);
    const val = prompt('Edit:', m.content);
    if (!val) return;
    fetch(`${API}/messages/${mid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: val, mod_id: currentUserId }),
    }).then(async () => {
        MESSAGES = await fetch(`${API}/messages`).then(r => r.json());
        populateMessages();
    });
}

function deleteMessage(mid) {
    if (!confirm('Delete?')) return;
    fetch(`${API}/messages/${mid}`, { method: 'DELETE' }).then(async () => {
        MESSAGES = await fetch(`${API}/messages`).then(r => r.json());
        populateMessages();
    });
}

async function init() {
  if (!loadSession('moderator')) return; 
  renderTopbar();
  await loadData();
  populateMessages();
}
init();