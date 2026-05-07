let THREADS = [];
let NOTIFICATIONS = [];

async function loadData() {
  const [threads, notifs] = await Promise.all([
    fetch(`${API}/threads`).then(r => r.json()),
    fetch(`${API}/notifications/${currentUserId}`).then(r => r.json())
  ]);
  THREADS = threads;
  NOTIFICATIONS = notifs;
}

function renderEmptyState(container, icon, text) {
  container.innerHTML = '';
  const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
  tpl.querySelector('.empty-icon').textContent = icon;
  tpl.querySelector('.empty-text').textContent = text;
  container.appendChild(tpl);
}

function populateNotifications() {
  const container = document.getElementById('notifList');
  container.innerHTML = '';
  const notifs = NOTIFICATIONS.filter(n => n.user_id === currentUserId);
  const unreadCount = notifs.filter(n => !n.is_read).length;
  document.getElementById('notifDesc').textContent = `${unreadCount} unread`;

  if (notifs.length === 0) {
    renderEmptyState(container, '◎', 'No notifications available');
    return;
  }

  const tpl = document.getElementById('tpl-notification');
  notifs.forEach(n => {
    const clone = tpl.content.cloneNode(true);
    const t = THREADS.find(th => th.thread_id === n.thread_id);
    
    if (n.is_read) {
      clone.querySelector('.notif-dot').classList.add('read');
      clone.querySelector('.notif-read-mark').style.display = 'inline';
    } else {
      const btnRead = clone.querySelector('.btn-read');
      btnRead.style.display = 'block';
      btnRead.onclick = () => markRead(n.notif_id);
    }

    clone.querySelector('.notif-thread').textContent = t ? t.title : '';
    clone.querySelector('.notif-time').textContent = n.created_at;

    container.appendChild(clone);
  });
}

function markRead(nid) {
  fetch(`${API}/notifications/read/${nid}`, { method: 'PUT' })
  .then(() => {
    const n = NOTIFICATIONS.find(n => n.notif_id === nid);
    if (n) n.is_read = 1;
    showToast('✓ Marked as read');
    populateNotifications();
  });
}

async function init() {
  if (!loadSession('user')) return; 
  renderTopbar();
  await loadData();
  populateNotifications();
}
init();