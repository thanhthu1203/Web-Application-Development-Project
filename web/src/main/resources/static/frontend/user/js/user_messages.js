// user_messages.js — DOM manipulation & logic

let ALL_MESSAGES      = [];
let THREADS           = [];
let currentThreadId   = null;

// Lưu các message_id mà user hiện tại đã report
let REPORTED_POST_IDS = new Set();

// Lưu state của report modal
let reportTargetMessageId      = null;
let reportTargetMessageContent = null;

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
        // THÊM DÒNG NÀY ĐỂ BỎ QUA THREAD ĐÃ KHÓA
        if (t.is_locked) return; 

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

// Lấy danh sách các post mà user hiện tại đã report
async function loadMyReportedPosts() {
  try {
    const ids = await fetch(`${API}/api/user/my-reports?user_id=${currentUserId}`)
      .then(r => r.json());

    if (Array.isArray(ids)) {
      REPORTED_POST_IDS = new Set(ids);
    }
  } catch (err) {
    // Không critical, trang vẫn hoạt động được
    console.warn('Could not load reported posts:', err);
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
  const avatarEl   = card.querySelector('.post-avatar');
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
  dateEl.textContent    = postedText + editedText;
  dateEl.style.fontSize = '0.85em';

  card.querySelector('.thread-badge').textContent = `📌 ${threadTitle}`;
  card.querySelector('.post-content').textContent = msg.content;

  if (msg.is_own_message) {
    // Bài của mình: hiện Edit + Delete, ẩn Report
    const ownerActions = card.querySelector('.post-owner-actions');
    if (ownerActions) {
      ownerActions.style.display = 'flex';
      const btnEdit   = ownerActions.querySelector('.btn-edit');
      const btnDelete = ownerActions.querySelector('.btn-delete');
      if (btnEdit)   btnEdit.onclick   = () => handleEditPost(msg.message_id, msg.content);
      if (btnDelete) btnDelete.onclick = () => handleDeletePost(msg.message_id);
    }
  } else {
    // Bài của người khác: hiện Report, ẩn Edit + Delete
    const reportAction = card.querySelector('.post-report-action');
    if (reportAction) {
      reportAction.style.display = 'flex';
      const btnReport = reportAction.querySelector('.btn-report');
      if (btnReport) {
        if (REPORTED_POST_IDS.has(msg.message_id)) {
          // Đã report rồi: hiện trạng thái "Reported"
          setReportedState(btnReport);
        } else {
          // Chưa report: gắn onclick
          btnReport.onclick = () => openReportModal(msg.message_id, msg.content);
        }
      }
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

// ── Hàm đổi nút Report thành trạng thái đã reported ──

function setReportedState(btnEl) {
  btnEl.textContent  = '✓ Reported';
  btnEl.disabled     = true;
  btnEl.classList.add('reported');
  btnEl.onclick      = null;
}

// ── Report modal ──────────────────────────────────────

function openReportModal(messageId, messageContent) {
  reportTargetMessageId      = messageId;
  reportTargetMessageContent = messageContent;

  // Hiện preview bài bị report
  const previewEl = document.getElementById('reportPostPreview');
  if (previewEl) previewEl.textContent = messageContent || '';

  // Reset form
  document.querySelectorAll('input[name="reportReason"]').forEach(r => {
    r.checked = false;
  });
  document.querySelectorAll('.reason-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  const otherInput = document.getElementById('reportOtherInput');
  if (otherInput) {
    otherInput.value = '';
    otherInput.classList.remove('show');
  }

  // Gắn sự kiện cho radio buttons
  document.querySelectorAll('input[name="reportReason"]').forEach(radio => {
    radio.onchange = () => {
      document.querySelectorAll('.reason-option').forEach(opt => opt.classList.remove('selected'));
      radio.closest('.reason-option').classList.add('selected');

      const otherEl = document.getElementById('reportOtherInput');
      if (radio.value === 'Other') {
        otherEl.classList.add('show');
        otherEl.focus();
      } else {
        otherEl.classList.remove('show');
        otherEl.value = '';
      }
    };
  });

  document.getElementById('reportModalOverlay').classList.add('show');
}

function closeReportModal() {
  document.getElementById('reportModalOverlay').classList.remove('show');
  reportTargetMessageId      = null;
  reportTargetMessageContent = null;
}

async function submitReport() {
  const selectedRadio = document.querySelector('input[name="reportReason"]:checked');
  if (!selectedRadio) {
    showToast('Vui lòng chọn một lý do báo cáo.');
    return;
  }

  let reason = selectedRadio.value;
  let custom_reason = null;

  // Nếu chọn Other, tách riêng nội dung tự gõ vào custom_reason
  if (reason === 'Other') {
    const otherText = document.getElementById('reportOtherInput')?.value.trim();
    if (!otherText) {
      showToast('Vui lòng mô tả chi tiết vấn đề.');
      return;
    }
    custom_reason = otherText;
  }

  try { 
    const res = await fetch(`${API}/api/report`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        reporter_id: currentUserId,
        message_id:  reportTargetMessageId,
        reason:      reason,
        custom_reason: custom_reason // Truyền rõ ràng custom_reason cho Backend
      })
    });
    
    const data = await res.json();
    if (!res.ok) {
      showToast(data.message || 'Failed to submit report.');
      closeReportModal();
      return;
    }

    // Đánh dấu bài viết đã bị report ở phía User
    REPORTED_POST_IDS.add(reportTargetMessageId);
    
    const card = document.querySelector(`.post-card[data-msg-id="${reportTargetMessageId}"]`);
    if (card) {
      const btnReport = card.querySelector('.btn-report');
      if (btnReport) setReportedState(btnReport);
    }
    
    showToast('Report submitted!');
    closeReportModal();
  } catch (err) {
    console.error('Error submitting report:', err);
    showToast('Cannot connect to server.');
  }
}

// Đóng modal khi click ra ngoài
document.getElementById('reportModalOverlay')?.addEventListener('click', function (e) {
  if (e.target === this) closeReportModal();
});

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

function renderNestedComments(parentEl, comments, rootPostId) {
  parentEl.innerHTML = '';

  if (comments.length === 0) {
    parentEl.innerHTML = '<div class="loading-comments">No comments yet</div>';
    return;
  }

  const topLevelComments = comments.filter(c => c.parent_id === rootPostId);
  const tpl = document.getElementById('tpl-comment-item');
  if (!tpl) {
    console.error('Template tpl-comment-item not found');
    return;
  }

  topLevelComments.forEach(c => {
    const commentEl = buildCommentItem(c, comments, rootPostId);
    if (commentEl) parentEl.appendChild(commentEl);
  });
}

function buildCommentItem(c, allComments, rootPostId) {
  const tpl   = document.getElementById('tpl-comment-item');
  const clone = tpl.content.cloneNode(true);
  const commentId = c.message_id;

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

  const authorEl = clone.querySelector('.comment-author');
  if (authorEl) authorEl.textContent = c.author_name;

  const textEl = clone.querySelector('.comment-text');
  if (textEl) textEl.textContent = c.content;

  const timeEl = clone.querySelector('.comment-time');
  if (timeEl) {
    const postedText = formatDate(new Date(c.posted_date));
    const editedText = c.last_edited_at ? ` ${formatEditedTime(c.last_edited_at)}` : '';
    timeEl.textContent    = postedText + editedText;
    timeEl.style.fontSize = '0.8em';
    if (c.last_edited_at) timeEl.style.color = 'var(--text-dim)';
  }

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

  // Chỉ hiện Edit + Delete nếu là comment của mình
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

  const replyBox = clone.querySelector('.reply-box');
  if (replyBox) {
    replyBox.id = `reply-box-${commentId}`;

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
    if (replyBtn) replyBtn.onclick = () => submitReply(commentId, rootPostId);
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
    const res = await fetch(`${API}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content, user_id: currentUserId, thread_id: parseInt(threadId), parent_id: null })
    });

    // THÊM ĐOẠN CHECK NÀY ĐỂ BẮT LỖI TỪ BACKEND
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Cannot post message');
    }

    showToast('✓ Post submitted!');
    if (input) input.value = '';
    await loadMessages();
    populateMessages();
  } catch (err) {
    // SẼ HIỆN THÔNG BÁO LỖI (VÍ DỤ: THIS THREAD IS LOCKED) TỪ BACKEND
    showToast('❌ ' + err.message);
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

  const counts      = {};
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

  // Load song song để nhanh hơn
  await Promise.all([
    loadThreads(),
    loadMessages(),
    loadMyReportedPosts()
  ]);

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