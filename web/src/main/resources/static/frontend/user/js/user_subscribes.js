let CATEGORIES = [];
let THREADS = [];
let SUBSCRIBES = [];

async function loadData() {
  const [cats, threads, subs] = await Promise.all([
    fetch(`${API}/categories`).then(r => r.json()),
    fetch(`${API}/threads`).then(r => r.json()),
    fetch(`${API}/subscribes/${currentUserId}`).then(r => r.json())
  ]);
  CATEGORIES = cats;
  THREADS = threads;
  SUBSCRIBES = subs;
}

function getCategoryName(id) { return (CATEGORIES.find(c => c.category_id === id) || {}).name || ''; }

function renderEmptyState(container, icon, text) {
  container.innerHTML = '';
  const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
  tpl.querySelector('.empty-icon').textContent = icon;
  tpl.querySelector('.empty-text').textContent = text;
  container.appendChild(tpl);
}

function populateSubscribes() {
  const container = document.getElementById('subsList');
  container.innerHTML = '';
  const subs = SUBSCRIBES.filter(s => s.user_id === currentUserId);

  if (subs.length === 0) {
    renderEmptyState(container, '★', 'You are not subscribed to any threads');
    return;
  }

  const tpl = document.getElementById('tpl-thread');
  subs.forEach(s => {
    const t = THREADS.find(th => th.thread_id === s.thread_id);
    if (!t) return;

    const clone = tpl.content.cloneNode(true);
    clone.querySelector('.thread-title').textContent = t.title;
    clone.querySelector('.meta-cat').textContent = getCategoryName(t.category_id);
    
    clone.querySelector('.meta-posts').style.display = 'none';
    clone.querySelector('.meta-status').style.display = 'none';
    const dots = clone.querySelectorAll('.meta-dot');
    if(dots[0]) dots[0].style.display = 'none';
    if(dots[1]) dots[1].style.display = 'none';

    const btnAction = clone.querySelector('.btn-action');
    btnAction.textContent = 'Unsubscribe';
    btnAction.classList.add('danger');
    btnAction.onclick = () => unsubscribe(s.thread_id);

    container.appendChild(clone);
  });
}

function unsubscribe(tid) {
  fetch(`${API}/subscribe`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUserId, thread_id: tid }),
  }).then(async () => {
    SUBSCRIBES = await fetch(`${API}/subscribes/${currentUserId}`).then(r => r.json());
    showToast('✓ Thread unsubscribed');
    populateSubscribes();
  });
}

async function init() {
  if (!loadSession('user')) return; 
  renderTopbar();
  await loadData();
  populateSubscribes();
}
init();