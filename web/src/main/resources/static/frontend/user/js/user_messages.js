// ===================================================
// user_messages.js - DOM manipulation & logic
// ===================================================

let ALL_MESSAGES      = [];
let THREADS           = [];
let currentDetailMessageId = null;
let currentThreadId   = null;

const EMOJI_LIST = ['👍', '❤️', '😂', '😢', '😡'];

// ── Helpers ──────────────────────────────────────────

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

// Hàm hiển thị "Edited at [time]" nếu message được edit
function formatEditedTime(lastEditedAt) {
  if (!lastEditedAt || lastEditedAt === 'null' || lastEditedAt === '') return '';
  try {
    const date = new Date(lastEditedAt);
    if (isNaN(date.getTime())) return '';
    const hours  = String(date.getHours()).padStart(2, '0');
    const mins   = String(date.getMinutes()).padStart(2, '0');
    const day    = String(date.getDate()).padStart(2, '0');
    const month  = String(date.getMonth() + 1).padStart(2, '0');
    const year   = date.getFullYear();
    return `(Edited at ${hours}:${mins} on ${month}/${day}/${year})`;
  } catch (e) {
    return '';
  }
}

// Hàm lấy tên hiển thị của người dùng hiện tại
function getCurrentUserDisplayName() {
  try {
    const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.username) return u.username;
      const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
      if (full) return full;
    }
  } catch (e) {
    console.error('Error reading session:', e);
  }
  return currentName || 'User';
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'U';
  return name.trim().charAt(0).toUpperCase() || 'U';
}

// ── Data loading ──────────────────────────────────────

async function loadMessages() {
  try {
    const [messages, users] = await Promise.all([
      fetch(`${API}/messages`).then(r => r.json()),
      fetch(`${API}/users`).then(r => r.json())
    ]);

    const userMap = {};
    users.forEach(u => {
      userMap[u.user_id] = {
        name:   u.username || `${u.first_name} ${u.last_name}`.trim(),
        avatar: u.avatar || null
      };
    });

    ALL_MESSAGES = messages.map(m => ({
      ...m,
      author_name:    userMap[m.user_id]?.name   || 'Unknown',
      author_avatar:  userMap[m.user_id]?.avatar || null,
      is_own_message: m.user_id === currentUserId
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

// ── Feed rendering ────────────────────────────────────

function populateMessages() {
  const container = document.getElementById('messagesList');
  if (!container) return;
  container.innerHTML = '';

  const mainPosts = ALL_MESSAGES.filter(m => !m.parent_id && !m.is_deleted);

  if (mainPosts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">No posts yet. Be the first to post!</div>
      </div>`;
    return;
  }

  mainPosts.forEach(msg => container.appendChild(buildPostCard(msg)));
}

function buildPostCard(msg) {
  const tpl  = document.getElementById('tpl-post-card').content.cloneNode(true);
  const card = tpl.querySelector('.post-card');
  card.dataset.msgId = msg.message_id;

  const thread      = THREADS.find(t => t.thread_id === msg.thread_id);
  const threadTitle = thread ? thread.title : 'General Thread';

  // Hiển thị avatar tác giả
  const avatarEl  = card.querySelector('.post-avatar');
  const postAvatar = msg.is_own_message ? window.currentUserAvatar : msg.author_avatar;
  if (postAvatar) {
    avatarEl.innerHTML = `<img src="${postAvatar}" alt="Avatar"
                               style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    avatarEl.textContent = getInitials(msg.author_name);
  }

  card.querySelector('.post-author').textContent = msg.author_name;

  const dateEl     = card.querySelector('.meta-date');
  const postedText = formatDate(new Date(msg.posted_date));
  const editedText = msg.last_edited_at ? ` ${formatEditedTime(msg.last_edited_at)}` : '';
  dateEl.textContent  = postedText + editedText;
  dateEl.style.fontSize = '0.85em';

  card.querySelector('.thread-badge').textContent = `📌 ${threadTitle}`;
  card.querySelector('.post-content').textContent = msg.content;

  // Chỉ hiển thị nút edit/delete nếu là bài của mình
  if (msg.is_own_message) {
    const ownerActions = card.querySelector('.post-owner-actions');
    if (ownerActions) {
      ownerActions.style.display = 'flex';
      const btnEdit   = ownerActions.querySelector('.btn-edit');
      const btnDelete = ownerActions.querySelector('.btn-delete');
      if (btnEdit)   btnEdit.onclick   = () => handleEditPost(msg.message_id, msg.content);
      if (btnDelete) btnDelete.onclick = () => handleDeletePost(msg.message_id);
    }
  }

  // Gán id cho các element cần tìm lại sau
  card.querySelector('.reaction-summary').id    = `reaction-summary-${msg.message_id}`;
  card.querySelector('.comment-count-label').id = `comment-count-${msg.message_id}`;
  card.querySelector('.comments-section').id    = `comments-section-${msg.message_id}`;
  card.querySelector('.comments-list').id       = `comments-list-${msg.message_id}`;

  const emojiRow = card.querySelector('.emoji-row');
  emojiRow.id    = `emoji-row-${msg.message_id}`;

  // Tạo các nút emoji reaction
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

  // Hiển thị avatar người dùng hiện tại trong ô comment
  const composeAvatar = card.querySelector('.current-user-avatar');
  if (window.currentUserAvatar) {
    composeAvatar.innerHTML = `<img src="${window.currentUserAvatar}" alt="Avatar"
                                    style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    composeAvatar.textContent = getInitials(getCurrentUserDisplayName());
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
  if (!section) {
    console.error('Cannot find section comments-section-' + messageId);
    return;
  }

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
      countEl.textContent = n > 0 ? `${n} comment${n !== 1 ? 's' : ''}` : '';
    }

    renderNestedComments(listEl, data.comments || [], messageId);
  } catch (err) {
    listEl.innerHTML = '<div class="loading-comments">❌ Cannot load comments</div>';
    console.error('Error loading comments:', err);
  }
}

// Hàm render comment - dùng đúng template tpl-comment-item trong HTML
function renderNestedComments(parentEl, comments, rootPostId) {
  parentEl.innerHTML = '';

  if (comments.length === 0) {
    parentEl.innerHTML = '<div class="loading-comments">No comments yet</div>';
    return;
  }

  // Lấy các comment cấp 1 (trực tiếp reply post gốc)
  const topLevelComments = comments.filter(c => c.parent_id === rootPostId);

  const tpl = document.getElementById('tpl-comment-item');
  if (!tpl) {
    console.error('Template tpl-comment-item not found');
    parentEl.innerHTML = '<div class="loading-comments">❌ Template error</div>';
    return;
  }

  topLevelComments.forEach(c => {
    const commentEl = buildCommentItem(c, comments, rootPostId);
    if (commentEl) parentEl.appendChild(commentEl);
  });
}

// Hàm tạo 1 comment item từ template tpl-comment-item
function buildCommentItem(c, allComments, rootPostId) {
  const tpl   = document.getElementById('tpl-comment-item');
  const clone = tpl.content.cloneNode(true);
  const commentId = c.message_id;

  // Tìm wrapper chính
  const wrapper = clone.querySelector('.comment-thread-item');
  if (!wrapper) return null;

  // Hiển thị avatar tác giả comment
  const avatar = clone.querySelector('.author-avatar');
  if (avatar) {
    if (c.author_avatar) {
      avatar.innerHTML = `<img src="${c.author_avatar}" alt="Avatar"
                               style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      avatar.textContent = getInitials(c.author_name);
    }
  }

  // Gán tên tác giả
  const authorEl = clone.querySelector('.comment-author');
  if (authorEl) authorEl.textContent = c.author_name;

  // Gán nội dung comment
  const textEl = clone.querySelector('.comment-text');
  if (textEl) textEl.textContent = c.content;

  // Gán thời gian (kèm edited nếu có)
  const timeEl = clone.querySelector('.comment-time');
  if (timeEl) {
    const postedText = formatDate(new Date(c.posted_date));
    const editedText = c.last_edited_at ? ` ${formatEditedTime(c.last_edited_at)}` : '';
    timeEl.textContent    = postedText + editedText;
    timeEl.style.fontSize = '0.8em';
    if (c.last_edited_at) timeEl.style.color = 'var(--text-dim)';
  }

  // Hiện nút Reply
  const btnReply = clone.querySelector('.btn-reply-toggle');
  if (btnReply) {
    btnReply.style.display = 'inline-block';
    btnReply.onclick = () => {
      const box = document.getElementById(`reply-box-${commentId}`);
      if (!box) return;
      const isOpen = box.style.display !== 'none';
      box.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen) {
        const inp = box.querySelector('.comment-input');
        if (inp) inp.focus();
      }
    };
  }

  // Hiện nút Edit/Delete nếu là comment của mình
  const btnEdit   = clone.querySelector('.btn-edit-comment');
  const btnDelete = clone.querySelector('.btn-delete-comment');
  if (c.user_id === currentUserId) {
    if (btnEdit) {
      btnEdit.style.display = 'inline-block';
      btnEdit.onclick = () => handleEditComment(commentId, c.content, rootPostId);
    }
    if (btnDelete) {
      btnDelete.style.display = 'inline-block';
      btnDelete.onclick = () => handleDeleteComment(commentId, rootPostId);
    }
  }

  // Thiết lập reply box
  const replyBox = clone.querySelector('.reply-box');
  if (replyBox) {
    replyBox.id = `reply-box-${commentId}`;

    // Hiển thị avatar người dùng hiện tại trong reply box
    const replyAvatar = replyBox.querySelector('.current-user-avatar');
    if (replyAvatar) {
      if (window.currentUserAvatar) {
        replyAvatar.innerHTML = `<img src="${window.currentUserAvatar}" alt="Avatar"
                                      style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        replyAvatar.textContent = getInitials(getCurrentUserDisplayName());
      }
    }

    const replyInput = replyBox.querySelector('.comment-input');
    if (replyInput) {
      replyInput.id        = `reply-input-${commentId}`;
      replyInput.onkeydown = (e) => { if (e.key === 'Enter') submitReply(commentId, rootPostId); };
    }

    const replyBtn = replyBox.querySelector('.btn-send');
    if (replyBtn) {
      replyBtn.onclick = () => submitReply(commentId, rootPostId);
    }
  }

  // Render các reply lồng nhau (cấp 2)
  const nestedContainer = clone.querySelector('.nested-comments-container');
  if (nestedContainer) {
    const childComments = allComments.filter(child => child.parent_id === commentId);
    childComments.forEach(child => {
      const childEl = buildCommentItem(child, allComments, rootPostId);
      if (childEl) nestedContainer.appendChild(childEl);
    });
  }

  return wrapper;
}

// ── Submit actions ────────────────────────────────────

async function submitComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  if (!input) return;
  const content = input.value.trim();
  if (!content) { showToast('⚠️ Content cannot be empty'); return; }

  try {
    await fetch(`${API}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content, user_id: currentUserId, thread_id: currentThreadId, parent_id: postId })
    });
    input.value = '';
    await loadAndRenderComments(postId);
    showToast('✓ Comment posted!');
  } catch (err) {
    showToast('❌ Cannot submit comment');
  }
}

async function submitReply(parentCommentId, rootPostId) {
  const input = document.getElementById(`reply-input-${parentCommentId}`);
  if (!input) return;
  const content = input.value.trim();
  if (!content) { showToast('⚠️ Content cannot be empty'); return; }

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
    showToast('✓ Replied!');
  } catch (err) {
    showToast('❌ Cannot submit reply');
  }
}

async function postMessage() {
  const select   = document.getElementById('threadSelect');
  const input    = document.getElementById('msgInput');
  const threadId = select ? select.value : null;
  const content  = input  ? input.value.trim() : '';

  if (!threadId) { showToast('⚠️ Please select a thread'); return; }
  if (!content)  { showToast('⚠️ Content cannot be empty'); return; }

  try {
    await fetch(`${API}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content, user_id: currentUserId, thread_id: parseInt(threadId), parent_id: null })
    });
    showToast('✓ Post submitted!');
    if (input) input.value = '';
    await loadMessages();
    populateMessages();
  } catch (err) {
    showToast('❌ Cannot post message');
  }
}

// ── Edit / Delete ─────────────────────────────────────

async function handleEditPost(messageId, originalContent) {
  const newContent = prompt('Edit post:', originalContent);
  if (!newContent || newContent === originalContent) return;
  try {
    await fetch(`${API}/messages/${messageId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content: newContent, user_id: currentUserId })
    });
    showToast('✓ Post updated');
    await loadMessages();
    populateMessages();
  } catch (err) {
    showToast('❌ Cannot edit post');
  }
}

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
  } catch (err) {
    showToast('❌ Cannot delete post');
  }
}

async function handleEditComment(commentId, originalContent, rootPostId) {
  const newContent = prompt('Edit comment:', originalContent);
  if (!newContent || newContent === originalContent) return;
  try {
    await fetch(`${API}/messages/${commentId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content: newContent, user_id: currentUserId })
    });
    showToast('✓ Comment updated');
    await loadAndRenderComments(rootPostId);
  } catch (err) {
    showToast('❌ Cannot edit comment');
  }
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
  } catch (err) {
    showToast('❌ Cannot delete comment');
  }
}

// ── Reactions ─────────────────────────────────────────

async function toggleReaction(messageId, emoji) {
  try {
    await fetch(`${API}/reactions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message_id: messageId, user_id: currentUserId, emoji })
    });
    const reactions = await fetch(`${API}/messages/${messageId}/reactions`).then(r => r.json());
    updateReactionCounts(messageId, reactions);
  } catch (err) {
    showToast('❌ Cannot react');
  }
}

function updateReactionCounts(messageId, reactions) {
  const row = document.getElementById(`emoji-row-${messageId}`);
  if (!row) return;

  const counts     = {};
  const userReacted = {};

  reactions.forEach(r => {
    counts[r.emoji] = r.count;
    if (r.user_ids) {
      const ids = r.user_ids.toString().split(',');
      userReacted[r.emoji] = ids.includes(currentUserId.toString());
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
  if (!loadSession('user')) return;
  renderTopbar();

  await loadThreads();
  await loadMessages();
  populateMessages();

  const urlParams    = new URLSearchParams(window.location.search);
  const targetPostId = urlParams.get('postId');
  if (targetPostId) {
    window.history.replaceState({}, document.title, window.location.pathname);
    const section = document.getElementById(`comments-section-${targetPostId}`);
    if (section) {
      await toggleComments(parseInt(targetPostId));
      section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

init();