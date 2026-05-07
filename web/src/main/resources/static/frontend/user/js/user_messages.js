let APP_USERS = [];
let THREADS = [];
let MESSAGES = [];
let currentCommentMessageId = null; 

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
function getActiveThreads() { return THREADS.filter(t => !t.is_deleted); }

function renderEmptyState(container, icon, text) {
  container.innerHTML = '';
  const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
  tpl.querySelector('.empty-icon').textContent = icon;
  tpl.querySelector('.empty-text').textContent = text;
  container.appendChild(tpl);
}

function populateMessages() {
  const container = document.getElementById('messagesList');
  container.innerHTML = '';
  const msgs = MESSAGES.filter(m => !m.is_deleted);

  if (msgs.length === 0) {
    renderEmptyState(container, '✉', 'No posts available');
  } else {
    const tpl = document.getElementById('tpl-message');
    msgs.forEach(m => {
      const clone = tpl.content.cloneNode(true);
      const thread = THREADS.find(t => t.thread_id === m.thread_id);
      
      clone.querySelector('.thread-icon-box').textContent = `#${m.message_id}`;
      clone.querySelector('.thread-title').textContent = m.content;
      clone.querySelector('.meta-user').textContent = getUserName(m.user_id);
      clone.querySelector('.meta-thread').textContent = thread ? thread.title : '';
      clone.querySelector('.meta-date').textContent = m.posted_date || '';

      const btnComments = clone.querySelector('.btn-comments');
      if (btnComments) btnComments.onclick = () => openCommentModal(m);
      
      container.appendChild(clone);
    });
  }

  const threadSelect = document.getElementById('threadSelect');
  threadSelect.innerHTML = '';
  const openThreads = getActiveThreads().filter(t => !t.is_locked);
  openThreads.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.thread_id;
    opt.textContent = t.title;
    threadSelect.appendChild(opt);
  });
}

function postMessage() {
  const input = document.getElementById('msgInput');
  const sel = document.getElementById('threadSelect');
  const content = input.value.trim();
  if (!content) { showToast('⚠ Please enter a message'); return; }

  fetch(`${API}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, user_id: currentUserId, thread_id: parseInt(sel.value) }),
  })
  .then(r => r.json())
  .then(async () => {
    showToast('✓ Message posted');
    MESSAGES = await fetch(`${API}/messages`).then(r => r.json());
    input.value = '';
    populateMessages(); 
  })
  .catch(() => showToast('❌ Server error'));
}

// Modal Logic
function openCommentModal(message) {
  currentCommentMessageId = message.message_id;
  const modal = document.getElementById('commentModal');
  modal.style.display = 'flex';

  const thread = THREADS.find(t => t.thread_id === message.thread_id);
  const originalDiv = document.getElementById('modalOriginalPost');
  originalDiv.innerHTML = `
    <div style="font-weight:600; font-size:13px; margin-bottom:4px;">${getUserName(message.user_id)}</div>
    <div style="font-size:14px; color:var(--text); margin-bottom:6px;">${message.content}</div>
    <div style="font-size:11px; color:var(--text-muted);">in <strong>${thread ? thread.title : ''}</strong> · ${message.posted_date || ''}</div>
  `;

  loadComments(message.message_id);
}

function closeCommentModal() {
  document.getElementById('commentModal').style.display = 'none';
  document.getElementById('commentInput').value = '';
  currentCommentMessageId = null;
}

async function loadComments(messageId) {
  const container = document.getElementById('modalCommentsList');
  container.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">Loading...</div>';
  
  try {
    const comments = await fetch(`${API}/messages/${messageId}/comments`).then(r => r.json());
    container.innerHTML = '';

    if (comments.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:13px;padding:1rem;">No comments yet. Be the first!</div>';
      return;
    }

    const tpl = document.getElementById('tpl-comment');
    comments.forEach(c => {
      const clone = tpl.content.cloneNode(true);
      const initials = (c.author_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      clone.querySelector('.comment-avatar').textContent = initials;
      clone.querySelector('.comment-author').textContent = c.author_name || getUserName(c.user_id);
      clone.querySelector('.comment-content').textContent = c.content;
      clone.querySelector('.comment-date').textContent = c.posted_date || '';
      container.appendChild(clone);
    });
  } catch {
    container.innerHTML = '<div style="color:var(--danger);font-size:13px;">Failed to load comments.</div>';
  }
}

function submitComment() {
  const input = document.getElementById('commentInput');
  const content = input.value.trim();
  if (!content) { showToast('⚠ Please enter a comment'); return; }
  if (!currentCommentMessageId) return;

  const parentMsg = MESSAGES.find(m => m.message_id === currentCommentMessageId);
  if (!parentMsg) return;

  fetch(`${API}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      user_id: currentUserId,
      thread_id: parentMsg.thread_id,
      parent_id: currentCommentMessageId,
    }),
  })
  .then(r => r.json())
  .then(() => {
    input.value = '';
    showToast('✓ Comment posted');
    loadComments(currentCommentMessageId);
  })
  .catch(() => showToast('❌ Server error'));
}

document.getElementById('commentModal').addEventListener('click', function(e) {
  if (e.target === this) closeCommentModal();
});

async function init() {
  if (!loadSession('user')) return; 
  renderTopbar();
  await loadData();
  populateMessages();
}
init();