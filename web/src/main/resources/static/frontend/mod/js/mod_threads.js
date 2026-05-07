let CATEGORIES = [];
let THREADS = [];
let MESSAGES = [];

async function loadData() {
  const [cats, threads, messages] = await Promise.all([
    fetch(`${API}/categories`).then(r => r.json()),
    fetch(`${API}/threads`).then(r => r.json()),
    fetch(`${API}/messages`).then(r => r.json())
  ]);
  CATEGORIES = cats;
  THREADS = threads;
  MESSAGES = messages;
}

function getCategoryName(id) { return (CATEGORIES.find(c => c.category_id === id) || {}).name || ''; }
function countMsgs(tid)      { return MESSAGES.filter(m => m.thread_id === tid && !m.is_deleted).length; }
function getActiveThreads()  { return THREADS.filter(t => !t.is_deleted); }

function renderEmpty(container, icon, text) {
  container.innerHTML = '';
  const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
  tpl.querySelector('.empty-icon').textContent = icon;
  tpl.querySelector('.empty-text').textContent = text;
  container.appendChild(tpl);
}

function populateThreads() {
  const container = document.getElementById('modThreadsList');
  container.innerHTML = '';
  const threads = getActiveThreads();

  if (threads.length === 0) {
    renderEmpty(container, '◫', 'No threads available');
    return;
  }

  const tpl = document.getElementById('tpl-thread-mod');
  threads.forEach(t => {
    const clone = tpl.content.cloneNode(true);
    clone.querySelector('.thread-title').textContent = t.title;
    clone.querySelector('.meta-cat').textContent = getCategoryName(t.category_id);
    clone.querySelector('.meta-posts').textContent = `${countMsgs(t.thread_id)} posts`;
    
    const statusEl = clone.querySelector('.meta-status');
    statusEl.className = t.is_locked ? 'tag-locked' : 'tag-open';
    statusEl.textContent = t.is_locked ? 'Locked' : 'Open';

    const btnLock = clone.querySelector('.btn-lock');
    btnLock.textContent = t.is_locked ? 'Unlock' : 'Lock';
    btnLock.onclick = () => lockThread(t.thread_id, t.is_locked ? 0 : 1);

    clone.querySelector('.btn-delete').onclick = () => deleteThread(t.thread_id);
    container.appendChild(clone);
  });
}

function createThread() {
  const title = prompt('Enter new thread title:');
  if (!title || !title.trim()) return;
  fetch(`${API}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title.trim(), category_id: 1, created_by: currentUserId }),
  }).then(async () => {
    showToast('✓ Thread created');
    THREADS = await fetch(`${API}/threads`).then(r => r.json());
    populateThreads();
  });
}

function lockThread(tid, state) {
  fetch(`${API}/threads/${tid}/lock`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_locked: state }),
  }).then(async () => {
    showToast('✓ Updated');
    THREADS = await fetch(`${API}/threads`).then(r => r.json());
    populateThreads();
  });
}

function deleteThread(tid) {
  if (!confirm('Delete?')) return;
  fetch(`${API}/threads/${tid}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deleted_by: currentUserId }),
  }).then(async () => {
    THREADS = await fetch(`${API}/threads`).then(r => r.json());
    populateThreads();
  });
}

async function init() {
  if (!loadSession('moderator')) return; 
  renderTopbar();
  await loadData();
  populateThreads();
}
init();