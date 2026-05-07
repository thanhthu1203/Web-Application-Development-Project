let CATEGORIES = [];
let THREADS = [];
let MESSAGES = [];
let SUBSCRIBES = [];

async function loadData() {
  const [cats, threads, messages, subs] = await Promise.all([
    fetch(`${API}/categories`).then(r => r.json()),
    fetch(`${API}/threads`).then(r => r.json()),
    fetch(`${API}/messages`).then(r => r.json()),
    fetch(`${API}/subscribes/${currentUserId}`).then(r => r.json())
  ]);
  CATEGORIES = cats;
  THREADS = threads;
  MESSAGES = messages;
  SUBSCRIBES = subs;
}

function getCategoryName(id) { return (CATEGORIES.find(c => c.category_id === id) || {}).name || ''; }
function countMsgs(tid) { return MESSAGES.filter(m => m.thread_id === tid && !m.is_deleted).length; }
function getActiveThreads() { return THREADS.filter(t => !t.is_deleted); }
function isSubscribed(uid, tid) { return SUBSCRIBES.some(s => s.user_id === uid && s.thread_id === tid); }

function renderEmptyState(container, icon, text) {
  container.innerHTML = '';
  const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
  tpl.querySelector('.empty-icon').textContent = icon;
  tpl.querySelector('.empty-text').textContent = text;
  container.appendChild(tpl);
}

function populateThreads() {
  const container = document.getElementById('threadsList');
  container.innerHTML = '';
  const threads = getActiveThreads();

  if (threads.length === 0) {
    renderEmptyState(container, '◫', 'No threads available');
    return;
  }

  const tpl = document.getElementById('tpl-thread');
  threads.forEach(t => {
    const clone = tpl.content.cloneNode(true);
    clone.querySelector('.thread-title').textContent = t.title;
    clone.querySelector('.meta-cat').textContent = getCategoryName(t.category_id);
    clone.querySelector('.meta-posts').textContent = `${countMsgs(t.thread_id)} posts`;
    
    const statusEl = clone.querySelector('.meta-status');
    if (t.is_locked) {
      statusEl.className = 'tag-locked';
      statusEl.textContent = 'Locked';
    } else {
      statusEl.className = 'tag-open';
      statusEl.textContent = 'Open';
    }

    const sub = isSubscribed(currentUserId, t.thread_id);
    const btnAction = clone.querySelector('.btn-action');
    btnAction.textContent = sub ? '★ Following' : '☆ Subscribe';
    if (!sub) btnAction.classList.add('success');
    btnAction.onclick = () => toggleSubscribe(t.thread_id);

    container.appendChild(clone);
  });
}

function toggleSubscribe(tid) {
  const idx = SUBSCRIBES.findIndex(s => s.user_id === currentUserId && s.thread_id === tid);
  if (idx >= 0) {
    fetch(`${API}/subscribe`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId, thread_id: tid }),
    }).then(() => {
      SUBSCRIBES.splice(idx, 1);
      showToast('✓ Thread unsubscribed');
      populateThreads();
    });
  } else {
    fetch(`${API}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId, thread_id: tid }),
    }).then(() => {
      SUBSCRIBES.push({ user_id: currentUserId, thread_id: tid });
      showToast('✓ Thread subscribed');
      populateThreads();
    });
  }
}

async function init() {
  if (!loadSession('user')) return; 
  renderTopbar();
  await loadData();
  populateThreads();
}
init();