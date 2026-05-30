let ALL_MESSAGES = [];
let THREADS = []; 
let currentThreadId = null;

const EMOJI_LIST = ['👍', '❤️', '😂', '😢', '😡'];

// Hàm lấy ID chuẩn xác cho Moderator/Admin
function getModUserId() {
  try {
    const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    const u = JSON.parse(raw || '{}');
    // Trả về account_id hoặc mod_id
    return u.account_id || u.mod_id || u.admin_id || null;
  } catch(e) {
    return null;
  }
}
// ── Helpers  
function formatDate(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1)  return 'just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7)  return `${diffDays} days ago`;
  return date.toLocaleDateString('vi-VN');
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'M';
  return name.trim().charAt(0).toUpperCase() || 'M';
}

function getCurrentModFullName() {
  try {
    const sessionData = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (sessionData) {
      const u = JSON.parse(sessionData);
      if (u.mod_name) return u.mod_name;
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
      if (fullName) return fullName;
    }
  } catch (e) {
    console.error("Error reading Mod session:", e);
  }
  return window.currentName || 'Moderator';
}

// ── Data loading  ──
async function loadMessages() {
  try {
    // Đã xóa việc gọi và map thủ công danh sách user, dùng trực tiếp thông tin từ backend
    const messages = await fetch(`${API}/messages`).then(r => r.json());

    ALL_MESSAGES = messages.map(m => ({
      ...m,
      author_name: m.author_name || 'Unknown',
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
        const opt = document.createElement('option');
        opt.value = t.thread_id;
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

// ── Feed rendering  
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
      console.error("Error rendering post ID", msg.message_id, e);
    }
  });
}

function buildPostCard(msg) {
  const tpl = document.getElementById('tpl-post-card').content.cloneNode(true);
  const card = tpl.querySelector('.post-card');
  card.dataset.msgId = msg.message_id;

  const thread = THREADS.find(t => t.thread_id === msg.thread_id);
  const threadTitle = thread ? thread.title : 'General';

  // Hiển thị Avatar tác giả (nếu có ảnh thì dùng thẻ img, không thì dùng chữ cái)
  const avatarEl = card.querySelector('.post-avatar');
  if (msg.author_avatar) {
    avatarEl.innerHTML = `<img src="${msg.author_avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    avatarEl.textContent = getInitials(msg.author_name);
  }

  card.querySelector('.post-author').textContent = msg.author_name;
  card.querySelector('.meta-date').textContent = formatDate(new Date(msg.posted_date));
  card.querySelector('.thread-badge').textContent = `📌 ${threadTitle}`;
  card.querySelector('.post-content').textContent = msg.content;

  // Quyền Moderator: Luôn hiển thị nút Sửa / Xóa cho mọi bài viết
  const ownerActions = card.querySelector('.post-owner-actions');
  ownerActions.style.display = 'flex';
  ownerActions.querySelector('.btn-edit').onclick = () => handleEditPost(msg.message_id, msg.content);
  ownerActions.querySelector('.btn-delete').onclick = () => handleDeletePost(msg.message_id);

  card.querySelector('.reaction-summary').id = `reaction-summary-${msg.message_id}`;
  card.querySelector('.comment-count-label').id = `comment-count-${msg.message_id}`;
  card.querySelector('.comments-section').id = `comments-section-${msg.message_id}`;
  card.querySelector('.comments-list').id = `comments-list-${msg.message_id}`;
  
  const emojiRow = card.querySelector('.emoji-row');
  emojiRow.id = `emoji-row-${msg.message_id}`;

  const reactTpl = document.getElementById('tpl-reaction-btn');
  EMOJI_LIST.forEach(emoji => {
    const rClone = reactTpl.content.cloneNode(true);
    const rBtn = rClone.querySelector('.reaction-btn');
    rBtn.dataset.emoji = emoji;
    rBtn.querySelector('.emoji-icon').textContent = emoji;
    rBtn.onclick = () => toggleReaction(msg.message_id, emoji);
    emojiRow.appendChild(rClone);
  });

  card.querySelector('.btn-action-comment').onclick = () => toggleComments(msg.message_id);
  
  // Hiển thị avatar của Mod đang đăng nhập ở khung bình luận
  const composeAvatar = card.querySelector('.current-user-avatar');
  if (window.currentUserAvatar) {
    composeAvatar.innerHTML = `<img src="${window.currentUserAvatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    composeAvatar.textContent = getInitials(getCurrentModFullName());
  }
  
  const inputComment = card.querySelector('.comment-input');
  inputComment.id = `comment-input-${msg.message_id}`;
  inputComment.onkeydown = (e) => { if(e.key === 'Enter') submitComment(msg.message_id); };
  card.querySelector('.btn-send').onclick = () => submitComment(msg.message_id);

  return card;
}

// ── Comments (nested) 
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
    const res = await fetch(`${API}/messages/${messageId}/full`);
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

function renderNestedComments(container, comments, rootPostId, depth = 0, parentId = null) {
  container.innerHTML = '';

  const levelComments = parentId === null
    ? comments.filter(c => !c.parent_id || c.parent_id === rootPostId)
    : comments.filter(c => c.parent_id === parentId);

  if (levelComments.length === 0) {
    if (depth === 0) container.innerHTML = '<div class="no-comments">No comments yet.</div>';
    return;
  }

  const tpl = document.getElementById('tpl-comment-item');

  levelComments.forEach(comment => {
    try {
      const clone = tpl.content.cloneNode(true);
      const wrapper = clone.querySelector('.comment-thread-item');
      if (depth > 0) wrapper.classList.add('comment-nested');

      // Hiển thị avatar của người bình luận
      const avatar = wrapper.querySelector('.author-avatar');
      if (depth > 0) avatar.classList.add('nested');
      if (comment.author_avatar) {
        avatar.innerHTML = `<img src="${comment.author_avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        avatar.textContent = getInitials(comment.author_name);
      }

      wrapper.querySelector('.comment-author').textContent = comment.author_name;
      wrapper.querySelector('.comment-text').textContent = comment.content;
      wrapper.querySelector('.comment-time').textContent = formatDate(new Date(comment.posted_date));

      if (depth < 2) {
        const replyToggleBtn = wrapper.querySelector('.btn-reply-toggle');
        replyToggleBtn.style.display = 'inline-block';
        replyToggleBtn.onclick = () => toggleReplyBox(comment.message_id, rootPostId);
      }

      // Quyền Moderator: Luôn hiện nút sửa/xóa cho mọi bình luận
      const btnEdit = wrapper.querySelector('.btn-edit-comment');
      const btnDel = wrapper.querySelector('.btn-delete-comment');
      btnEdit.style.display = 'inline-block';
      btnDel.style.display = 'inline-block';
      btnEdit.onclick = () => handleEditComment(comment.message_id, comment.content, rootPostId);
      btnDel.onclick = () => handleDeleteComment(comment.message_id, rootPostId);

      const replyBox = wrapper.querySelector('.reply-box');
      replyBox.id = `reply-box-${comment.message_id}`;
      
      const replyAvatar = wrapper.querySelector('.current-user-avatar');
      if (window.currentUserAvatar) {
        replyAvatar.innerHTML = `<img src="${window.currentUserAvatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        replyAvatar.textContent = getInitials(getCurrentModFullName());
      }
      
      const replyInput = wrapper.querySelector('.comment-input');
      replyInput.id = `reply-input-${comment.message_id}`;
      replyInput.placeholder = `Reply to ${comment.author_name}...`;
      replyInput.onkeydown = (e) => { if(e.key === 'Enter') submitReply(comment.message_id, rootPostId); };
      
      wrapper.querySelector('.reply-box .btn-send').onclick = () => submitReply(comment.message_id, rootPostId);

      const nestedContainer = wrapper.querySelector('.nested-comments-container');
      nestedContainer.id = `nested-${comment.message_id}`;

      container.appendChild(clone);

      const appendedNested = container.querySelector(`#nested-${comment.message_id}`);
      const childComments = comments.filter(c => c.parent_id === comment.message_id);
      if (childComments.length > 0 && appendedNested) {
        renderNestedComments(appendedNested, comments, rootPostId, depth + 1, comment.message_id);
      }
    } catch (e) {
      console.error("Error rendering comment ID", comment.message_id, e);
    }
  });
}

function toggleReplyBox(commentId, rootPostId) {
  const box = document.getElementById(`reply-box-${commentId}`);
  if (!box) return;
  const isVisible = box.style.display !== 'none';
  box.style.display = isVisible ? 'none' : 'flex';
  if (!isVisible) {
    const input = document.getElementById(`reply-input-${commentId}`);
    if (input) input.focus();
  }
}

// ── Submit actions  
async function submitComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  if (!input) return;
  const content = input.value.trim();
  if (!content) { showToast('⚠️ Content is empty'); return; }

  try {
    await fetch(`${API}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, user_id: currentUserId, thread_id: currentThreadId, parent_id: postId })
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
      const data = await fetch(`${API}/messages/${rootPostId}/full`).then(r => r.json());
      currentThreadId = data.message.thread_id;
    } catch(e) {}
  }

  try {
    await fetch(`${API}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, user_id: currentUserId, thread_id: currentThreadId, parent_id: parentCommentId })
    });
    input.value = '';
    const box = document.getElementById(`reply-box-${parentCommentId}`);
    if (box) box.style.display = 'none';
    await loadAndRenderComments(rootPostId);
    showToast('✓ Reply posted!');
  } catch (err) { showToast('❌ Error replying'); }
}

async function postMessage() {
  const select = document.getElementById('threadSelect');
  const input  = document.getElementById('msgInput');
  const threadId = select ? select.value : null;
  const content  = input  ? input.value.trim() : '';

  if (!threadId) { showToast('⚠️ Please select a thread'); return; }
  if (!content)  { showToast('⚠️ Content is empty'); return; }

  try {
    await fetch(`${API}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, user_id: currentUserId, thread_id: parseInt(threadId), parent_id: null })
    });
    showToast('✓ Post created');
    if (input) input.value = '';
    await loadMessages();
    populateMessages();
  } catch (err) { showToast('❌ Error creating post'); }
}

// ── Edit / Delete  ─
async function handleEditPost(messageId, originalContent) {
  const newContent = prompt('Edit post content:', originalContent);
  if (!newContent || newContent === originalContent) return;
  try {
    await fetch(`${API}/messages/${messageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent, user_id: currentUserId })
    });
    showToast('✓ Update successful');
    await loadMessages();
    populateMessages();
  } catch (err) { showToast('❌ Error updating post'); }
}

async function handleDeletePost(messageId) {
  if (!confirm('Delete this post?')) return;
  try {
    await fetch(`${API}/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId })
    });
    showToast('✓ Post deleted');
    await loadMessages();
    populateMessages();
  } catch (err) { showToast('❌ Error deleting post'); }
}

async function handleEditComment(commentId, originalContent, rootPostId) {
  const newContent = prompt('Edit comment:', originalContent);
  if (!newContent || newContent === originalContent) return;
  try {
    await fetch(`${API}/messages/${commentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent, user_id: currentUserId })
    });
    showToast('✓ Comment updated');
    await loadAndRenderComments(rootPostId);
  } catch (err) { showToast('❌ Error updating comment'); }
}

async function handleDeleteComment(commentId, rootPostId) {
  if (!confirm('Delete this comment?')) return;
  try {
    await fetch(`${API}/messages/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId })
    });
    showToast('✓ Comment deleted');
    await loadAndRenderComments(rootPostId);
  } catch (err) { showToast('❌ Error deleting comment'); }
}

// ── Reactions  ─────
async function toggleReaction(messageId, emoji) {
  const myId = getModUserId();
  if (!myId) {
    showToast('⚠️ Lỗi: Không tìm thấy ID của Moderator trong bộ nhớ');
    return;
  }

  try {
    const res = await fetch(`${API}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: messageId, user_id: myId, emoji })
    });
    
    if (!res.ok) {
      showToast('❌ Server từ chối request (có thể do thiếu user_id)');
      return;
    }

    const reactions = await fetch(`${API}/messages/${messageId}/reactions`).then(r => r.json());
    updateReactionCounts(messageId, reactions);
  } catch (err) { 
    showToast('❌ Lỗi tương tác thả tim'); 
  }
}

function updateReactionCounts(messageId, reactions) {
  const row = document.getElementById(`emoji-row-${messageId}`);
  if (!row) return;

  const counts = {};
  const userReacted = {};
  
  // Lấy ID hiện tại ép sang chuỗi
  const myIdStr = getModUserId()?.toString();

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

async function init() {
  if (!loadSession('moderator')) return;
  renderTopbar();

  await loadThreads();
  await loadMessages();
  populateMessages();

  const urlParams = new URLSearchParams(window.location.search);
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