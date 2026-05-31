// mod_messages.js — quản lý bài viết cho moderator
// Mod chỉ có quyền DELETE bài và comment, không có quyền EDIT

let ALL_MESSAGES = [];
let THREADS      = [];
let currentThreadId = null;

const EMOJI_LIST = ['👍', '❤️', '😂', '😢', '😡'];

// ── Lấy user id chuẩn cho moderator ──────────────────

function getModUserId() {
  try {
    const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    const u   = JSON.parse(raw || '{}');
    return u.account_id || u.mod_id || u.admin_id || null;
  } catch (e) {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────

function formatDate(date) {
  const now      = new Date();
  const diffMs   = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs  = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1)  return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs  < 24) return `${diffHrs}h ago`;
  if (diffDays < 7)  return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US');
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'M';
  return name.trim().charAt(0).toUpperCase() || 'M';
}

function getCurrentModDisplayName() {
  try {
    const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.username)  return u.username;
      if (u.mod_name)  return u.mod_name;
      const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
      if (full) return full;
    }
  } catch (e) {
    console.error('Error reading mod session:', e);
  }
  return window.currentName || 'Moderator';
}

// ── Load dữ liệu ──────────────────────────────────────

async function loadMessages() {
  try {
    const messages = await fetch(`${API}/messages`).then(r => r.json());

    ALL_MESSAGES = messages.map(m => ({
      ...m,
      author_name:   m.author_name   || 'Unknown',
      author_avatar: m.author_avatar || null
    }));

    return ALL_MESSAGES;
  } catch (err) {
    console.error('Error loading messages:', err);
    return [];
  }
}

async function loadThreads() {
  try {
    THREADS = await fetch(`${API}/threads`).then(r => r.json());
    const select = document.getElementById('threadSelect');
    if (select) {
      select.innerHTML = '<option value="">-- Select Thread --</option>';
      THREADS.forEach(t => {
        const opt       = document.createElement('option');
        opt.value       = t.thread_id;
        opt.textContent = t.title;
        select.appendChild(opt);
      });
    }
    return THREADS;
  } catch (err) {
    console.error('Error loading threads:', err);
    return [];
  }
}

// ── Render feed ───────────────────────────────────────

function populateMessages() {
  const container = document.getElementById('messagesList');
  if (!container) return;
  container.innerHTML = '';

  const mainPosts = ALL_MESSAGES.filter(m => !m.parent_id && !m.is_deleted);

  if (mainPosts.length === 0) {
    const tplEmpty = document.getElementById('tpl-empty');
    if (tplEmpty) container.appendChild(tplEmpty.content.cloneNode(true));
    return;
  }

  mainPosts.forEach(msg => {
    try {
      container.appendChild(buildPostCard(msg));
    } catch (e) {
      console.error('Error rendering post ID', msg.message_id, e);
    }
  });
}

function buildPostCard(msg) {
  const tpl  = document.getElementById('tpl-post-card').content.cloneNode(true);
  const card = tpl.querySelector('.post-card');
  card.dataset.msgId = msg.message_id;

  const thread      = THREADS.find(t => t.thread_id === msg.thread_id);
  const threadTitle = thread ? thread.title : 'General';

  // Avatar tác giả
  const avatarEl = card.querySelector('.post-avatar');
  if (msg.author_avatar) {
    avatarEl.innerHTML = `<img src="${msg.author_avatar}" alt="Avatar"
                               style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    avatarEl.textContent = getInitials(msg.author_name);
  }

  card.querySelector('.post-author').textContent  = msg.author_name;
  card.querySelector('.meta-date').textContent    = formatDate(new Date(msg.posted_date));
  card.querySelector('.thread-badge').textContent = `📌 ${threadTitle}`;
  card.querySelector('.post-content').textContent = msg.content;

  // Mod chỉ có nút Delete
  const btnDelete = card.querySelector('.btn-delete');
  if (btnDelete) btnDelete.onclick = () => handleDeletePost(msg.message_id);

  // Gán id cho các element
  card.querySelector('.reaction-summary').id    = `reaction-summary-${msg.message_id}`;
  card.querySelector('.comment-count-label').id = `comment-count-${msg.message_id}`;
  card.querySelector('.comments-section').id    = `comments-section-${msg.message_id}`;
  card.querySelector('.comments-list').id       = `comments-list-${msg.message_id}`;

  const emojiRow = card.querySelector('.emoji-row');
  emojiRow.id    = `emoji-row-${msg.message_id}`;

  const reactTpl = document.getElementById('tpl-reaction-btn');
  EMOJI_LIST.forEach(emoji => {
    const rClone = reactTpl.content.cloneNode(true);
    const rBtn   = rClone.querySelector('.reaction-btn');
    rBtn.dataset.emoji = emoji;
    rBtn.querySelector('.emoji-icon').textContent = emoji;
    rBtn.onclick = () => toggleReaction(msg.message_id, emoji);
    emojiRow.appendChild(rClone);
  });

  card.querySelector('.btn-action-comment').onclick = () => toggleComments(msg.message_id);

  // Avatar mod trong ô compose comment
  const composeAvatar = card.querySelector('.current-user-avatar');
  if (window.currentUserAvatar) {
    composeAvatar.innerHTML = `<img src="${window.currentUserAvatar}" alt="Avatar"
                                    style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    composeAvatar.textContent = getInitials(getCurrentModDisplayName());
  }

  const inputComment     = card.querySelector('.comment-input');
  inputComment.id        = `comment-input-${msg.message_id}`;
  inputComment.onkeydown = (e) => { if (e.key === 'Enter') submitComment(msg.message_id); };
  card.querySelector('.btn-send').onclick = () => submitComment(msg.message_id);

  return card;
}

// ── Comments ──────────────────────────────────────────

async function toggleComments(messageId) {
  const section = document.getElementById(`comments-section-${messageId}`);
  if (!section) return;

  const isVisible = section.style.display !== 'none';
  if (isVisible) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  await loadAndRenderComments(messageId);
}

async function loadAndRenderComments(messageId) {
  const listEl = document.getElementById(`comments-list-${messageId}`);
  if (!listEl) return;
  listEl.innerHTML = '<div class="loading-comments">Loading comments...</div>';

  try {
    const res  = await fetch(`${API}/messages/${messageId}/full`);
    const data = await res.json();

    currentThreadId = data.message.thread_id;

    updateReactionCounts(messageId, data.reactions || []);

    const countEl = document.getElementById(`comment-count-${messageId}`);
    if (countEl) {
      const n = (data.comments || []).length;
      countEl.textContent = n > 0 ? `${n} comments` : '';
    }

    renderNestedComments(listEl, data.comments || [], messageId);
  } catch (err) {
    listEl.innerHTML = '<div class="loading-comments">❌ Error loading comments</div>';
  }
}

function renderNestedComments(container, comments, rootPostId) {
  container.innerHTML = '';

  const topLevel = comments.filter(c => c.parent_id === rootPostId);

  if (topLevel.length === 0) {
    container.innerHTML = '<div class="no-comments">No comments yet.</div>';
    return;
  }

  topLevel.forEach(c => {
    const el = buildCommentItem(c, comments, rootPostId);
    if (el) container.appendChild(el);
  });
}

function buildCommentItem(c, allComments, rootPostId) {
  const tpl   = document.getElementById('tpl-comment-item');
  const clone = tpl.content.cloneNode(true);
  const commentId = c.message_id;

  const wrapper = clone.querySelector('.comment-thread-item');
  if (!wrapper) return null;

  // Avatar tác giả comment
  const avatar = clone.querySelector('.author-avatar');
  if (avatar) {
    if (c.author_avatar) {
      avatar.innerHTML = `<img src="${c.author_avatar}" alt="Avatar"
                               style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      avatar.textContent = getInitials(c.author_name);
    }
  }

  const authorEl = clone.querySelector('.comment-author');
  if (authorEl) authorEl.textContent = c.author_name;

  const textEl = clone.querySelector('.comment-text');
  if (textEl) textEl.textContent = c.content;

  const timeEl = clone.querySelector('.comment-time');
  if (timeEl) timeEl.textContent = formatDate(new Date(c.posted_date));

  // Nút Reply
  const btnReply = clone.querySelector('.btn-reply-toggle');
  if (btnReply) {
    btnReply.style.display = 'inline-block';
    btnReply.onclick = () => {
      const box = document.getElementById(`reply-box-${commentId}`);
      if (!box) return;
      const isOpen = box.style.display !== 'none';
      box.style.display = isOpen ? 'none' : 'flex';
    };
  }

  // Mod chỉ có nút Delete comment, không có Edit
  const btnDel = clone.querySelector('.btn-delete-comment');
  if (btnDel) {
    btnDel.onclick = () => handleDeleteComment(commentId, rootPostId);
  }

  // Reply box
  const replyBox = clone.querySelector('.reply-box');
  if (replyBox) {
    replyBox.id = `reply-box-${commentId}`;

    const replyAvatar = replyBox.querySelector('.current-user-avatar');
    if (replyAvatar) {
      if (window.currentUserAvatar) {
        replyAvatar.innerHTML = `<img src="${window.currentUserAvatar}" alt="Avatar"
                                      style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        replyAvatar.textContent = getInitials(getCurrentModDisplayName());
      }
    }

    const replyInput = replyBox.querySelector('.comment-input');
    if (replyInput) {
      replyInput.id        = `reply-input-${commentId}`;
      replyInput.onkeydown = (e) => { if (e.key === 'Enter') submitReply(commentId, rootPostId); };
    }

    const replyBtn = replyBox.querySelector('.btn-send');
    if (replyBtn) replyBtn.onclick = () => submitReply(commentId, rootPostId);
  }

  // Render replies con
  const nestedContainer = clone.querySelector('.nested-comments-container');
  if (nestedContainer) {
    const children = allComments.filter(ch => ch.parent_id === commentId);
    children.forEach(child => {
      const childEl = buildCommentItem(child, allComments, rootPostId);
      if (childEl) nestedContainer.appendChild(childEl);
    });
  }

  return wrapper;
}

// ── Submit ────────────────────────────────────────────

async function submitComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  if (!input) return;
  const content = input.value.trim();
  if (!content) { showToast('⚠️ Content is empty'); return; }

  try {
    await fetch(`${API}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content, user_id: currentUserId, thread_id: currentThreadId, parent_id: postId })
    });
    input.value = '';
    await loadAndRenderComments(postId);
    showToast('✓ Comment posted!');
  } catch (err) { showToast('❌ Error posting comment'); }
}

async function submitReply(parentCommentId, rootPostId) {
  const input = document.getElementById(`reply-input-${parentCommentId}`);
  if (!input) return;
  const content = input.value.trim();
  if (!content) { showToast('⚠️ Content is empty'); return; }

  if (!currentThreadId) {
    try {
      const data  = await fetch(`${API}/messages/${rootPostId}/full`).then(r => r.json());
      currentThreadId = data.message.thread_id;
    } catch (e) { /* ignore */ }
  }

  try {
    await fetch(`${API}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content, user_id: currentUserId, thread_id: currentThreadId, parent_id: parentCommentId })
    });
    input.value = '';
    const box = document.getElementById(`reply-box-${parentCommentId}`);
    if (box) box.style.display = 'none';
    await loadAndRenderComments(rootPostId);
    showToast('✓ Reply posted!');
  } catch (err) { showToast('❌ Error replying'); }
}

async function postMessage() {
  const select   = document.getElementById('threadSelect');
  const input    = document.getElementById('msgInput');
  const threadId = select ? select.value : null;
  const content  = input  ? input.value.trim() : '';

  if (!threadId) { showToast('⚠️ Please select a thread'); return; }
  if (!content)  { showToast('⚠️ Content is empty'); return; }

  try {
    await fetch(`${API}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content, user_id: currentUserId, thread_id: parseInt(threadId), parent_id: null })
    });
    showToast('✓ Post created');
    if (input) input.value = '';
    await loadMessages();
    populateMessages();
  } catch (err) { showToast('❌ Error creating post'); }
}

// ── Delete ────────────────────────────────────────────

async function handleDeletePost(messageId) {
  if (!confirm('Delete this post?')) return;
  try {
    await fetch(`${API}/messages/${messageId}`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: currentUserId })
    });
    showToast('✓ Post deleted');
    await loadMessages();
    populateMessages();
  } catch (err) { showToast('❌ Error deleting post'); }
}

async function handleDeleteComment(commentId, rootPostId) {
  if (!confirm('Delete this comment?')) return;
  try {
    await fetch(`${API}/messages/${commentId}`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: currentUserId })
    });
    showToast('✓ Comment deleted');
    await loadAndRenderComments(rootPostId);
  } catch (err) { showToast('❌ Error deleting comment'); }
}

// ── Reactions ─────────────────────────────────────────

async function toggleReaction(messageId, emoji) {
  const myId = getModUserId();
  if (!myId) { showToast('⚠️ Cannot find moderator ID'); return; }

  try {
    await fetch(`${API}/reactions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message_id: messageId, user_id: myId, emoji })
    });
    const reactions = await fetch(`${API}/messages/${messageId}/reactions`).then(r => r.json());
    updateReactionCounts(messageId, reactions);
  } catch (err) { showToast('❌ Reaction error'); }
}

function updateReactionCounts(messageId, reactions) {
  const row = document.getElementById(`emoji-row-${messageId}`);
  if (!row) return;

  const counts      = {};
  const userReacted = {};
  const myIdStr     = getModUserId()?.toString();

  reactions.forEach(r => {
    counts[r.emoji] = r.count;
    if (r.user_ids && myIdStr) {
      const ids = r.user_ids.toString().split(',');
      userReacted[r.emoji] = ids.includes(myIdStr);
    } else {
      userReacted[r.emoji] = false;
    }
  });

  EMOJI_LIST.forEach(emoji => {
    const btn = row.querySelector(`[data-emoji="${emoji}"]`);
    if (!btn) return;
    const count = counts[emoji] || 0;
    btn.querySelector('.reaction-count').textContent = count > 0 ? count : '';
    btn.classList.toggle('active', !!userReacted[emoji]);
  });

  const summaryEl = document.getElementById(`reaction-summary-${messageId}`);
  if (summaryEl) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    summaryEl.textContent = total > 0
      ? Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join('  ')
      : '';
  }
}

// ── Init ──────────────────────────────────────────────

async function init() {
  if (!loadSession('moderator')) return;
  renderTopbar();

  await Promise.all([loadThreads(), loadMessages()]);
  populateMessages();
}

init();