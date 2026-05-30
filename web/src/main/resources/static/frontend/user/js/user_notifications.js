//  logic only no html or css
let THREADS = [];
let NOTIFICATIONS = [];
let MESSAGES = [];

async function loadData() {
  const [threads, notifs, messages] = await Promise.all([
    fetch(`${API}/threads`).then(r => r.json()),
    fetch(`${API}/notifications/${currentUserId}`).then(r => r.json()),
    fetch(`${API}/messages`).then(r => r.json())
  ]);
  THREADS = threads;
  NOTIFICATIONS = notifs;
  MESSAGES = messages;
}

function renderEmptyState(container, icon, text) {
  container.innerHTML = '';
  const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
  tpl.querySelector('.empty-icon').textContent = icon;
  tpl.querySelector('.empty-text').textContent = text;
  container.appendChild(tpl);
}

function getMessagePreview(messageId) {
  if (!messageId) return null;
  return MESSAGES.find(m => m.message_id === messageId || m.message_id === parseInt(messageId)) || null;
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
    const thread = THREADS.find(th => th.thread_id === n.thread_id);
    const msgPreview = getMessagePreview(n.message_id);

    // Unread dot / read mark
    if (n.is_read) {
      clone.querySelector('.notif-dot').classList.add('read');
      clone.querySelector('.notif-read-mark').style.display = 'inline';
    } else {
      const btnRead = clone.querySelector('.btn-read');
      btnRead.style.display = 'block';
      btnRead.onclick = (e) => {
        e.stopPropagation();
        markRead(n.notif_id);
      };
    }

    // Thread name
    clone.querySelector('.notif-thread').textContent = thread ? thread.title : '(unknown thread)';

    // Time
    clone.querySelector('.notif-time').textContent = formatNotifDate(n.created_at);

    // Post preview
    const previewEl = clone.querySelector('.notif-preview');
    if (previewEl && msgPreview) {
      const preview = msgPreview.content
        ? (msgPreview.content.length > 80 ? msgPreview.content.slice(0, 80) + '…' : msgPreview.content)
        : '';
      previewEl.textContent = preview;
      previewEl.style.display = preview ? 'block' : 'none';
    }

    // Click whole item → go to post
    const notifItem = clone.querySelector('.notif-item');
    notifItem.style.cursor = 'pointer';
    notifItem.onclick = (e) => {
      if (e.target.classList.contains('btn-read')) return;
      if (n.message_id) {
        window.location.href = `user_messages.html?postId=${n.message_id}`;
      }
    };

    container.appendChild(clone);
  });
}

function formatNotifDate(raw) {
  if (!raw) return '';
  const date = new Date(raw);
  if (isNaN(date)) return raw;
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('vi-VN');
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