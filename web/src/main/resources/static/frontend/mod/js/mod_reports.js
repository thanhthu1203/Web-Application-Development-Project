// mod_reports.js — logic cho trang Manage Reports của moderator

let ALL_REPORTS  = [];
let activeFilter = 'all';

// ── Load dữ liệu ─────────────────────────────────────

// Tải danh sách report từ server
async function loadReports() {
  const container = document.getElementById('reportsList');
  if (!container) return;

  try {
    const res = await fetch(`${API}/api/moderator/reports`, {
      method:  'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error('Failed to load reports');
    }

    ALL_REPORTS = await res.json();

  } catch (err) {
    console.error('Error loading reports:', err);
    ALL_REPORTS = [];
  }
}

// ── Format date ───────────────────────────────────────

function formatDate(raw) {
  if (!raw) return '';
  const date = new Date(raw);
  if (isNaN(date)) return raw;

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

// ── Cập nhật số lượng trên các filter buttons ─────────

function updateFilterCounts() {
  const total     = ALL_REPORTS.length;
  const pending   = ALL_REPORTS.filter(r => r.status === 'pending').length;
  const resolved  = ALL_REPORTS.filter(r => r.status === 'resolved').length;
  const dismissed = ALL_REPORTS.filter(r => r.status === 'ignored').length;

  const elAll       = document.getElementById('count-all');
  const elPending   = document.getElementById('count-pending');
  const elResolved  = document.getElementById('count-resolved');
  const elDismissed = document.getElementById('count-dismissed');

  if (elAll)       elAll.textContent       = total;
  if (elPending)   elPending.textContent   = pending;
  if (elResolved)  elResolved.textContent  = resolved;
  if (elDismissed) elDismissed.textContent = dismissed;
}

// ── Xử lý click filter button ─────────────────────────

function filterReports(filter) {
  activeFilter = filter;

  document.querySelectorAll('.report-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  populateReports();
}

// ── Render trạng thái rỗng ────────────────────────────

function renderEmpty(container, icon, text) {
  container.innerHTML = '';
  const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
  tpl.querySelector('.empty-icon').textContent = icon;
  tpl.querySelector('.empty-text').textContent = text;
  container.appendChild(tpl);
}

// ── Render danh sách report ───────────────────────────

function populateReports() {
  const container = document.getElementById('reportsList');
  if (!container) return;
  container.innerHTML = '';

  // Lọc theo filter đang active
  // HTML gửi 'Pending'/'Resolved'/'Dismissed', DB lưu 'pending'/'resolved'/'ignored'
  const filtered = activeFilter === 'all'
    ? ALL_REPORTS
    : ALL_REPORTS.filter(r => {
        if (activeFilter === 'Pending')   return r.status === 'pending';
        if (activeFilter === 'Resolved')  return r.status === 'resolved';
        if (activeFilter === 'Dismissed') return r.status === 'ignored';
        return true;
      });

  if (filtered.length === 0) {
    const emptyMsg = activeFilter === 'all'
      ? 'No reports yet.'
      : `No ${activeFilter.toLowerCase()} reports.`;
    renderEmpty(container, '📋', emptyMsg);
    return;
  }

  const tpl = document.getElementById('tpl-report-card');

  filtered.forEach(r => {
    const clone = tpl.content.cloneNode(true);
    const card  = clone.querySelector('.report-card');

    // Làm mờ card đã được xử lý
    if (r.status === 'resolved') card.classList.add('is-resolved');
    if (r.status === 'ignored')  card.classList.add('is-dismissed');

    // Header: ID và ngày tạo report
    card.querySelector('.report-id').textContent   = `#${r.report_id}`;
    card.querySelector('.report-date').textContent = formatDate(r.created_at);

    // Badge trạng thái
    const badge = card.querySelector('.report-status-badge');
    const statusLabel = { pending: 'Pending', resolved: 'Resolved', ignored: 'Dismissed' }[r.status] || r.status;
    badge.textContent = statusLabel;
    badge.classList.add(r.status);

    // Thông tin bài bị report
    const authorName = r.author_username || r.author_name || 'Unknown user';
    card.querySelector('.report-post-author').textContent = `👤 ${authorName}`;
    card.querySelector('.report-post-thread').textContent = `📌 ${r.thread_title || 'Unknown thread'}`;

    const contentEl = card.querySelector('.report-post-content');
    // Ưu tiên hiện nội dung gốc, fallback về snapshot lúc bị report
    const displayContent = r.message_content || r.message_content_snapshot;
    if (r.message_is_deleted || !displayContent) {
      contentEl.textContent = '(This post has been deleted)';
      contentEl.classList.add('is-deleted');
    } else {
      contentEl.textContent = displayContent;
    }

    // Lý do report — nếu là "Other" thì hiện custom_reason
    const reasonText = (r.reason === 'Other' && r.custom_reason)
      ? r.custom_reason
      : r.reason || '(no reason provided)';
    card.querySelector('.report-reason').textContent = reasonText;

    // Người đã report
    const reporterName = r.reporter_username || r.reporter_email || 'Unknown';
    card.querySelector('.report-reporter').textContent = reporterName;

    // Thông tin mod đã xử lý — chỉ hiện khi không phải pending
    if (r.status !== 'pending') {
      const resolverRow   = card.querySelector('.report-resolver-row');
      const resolvedAtRow = card.querySelector('.report-resolved-at-row');
      if (resolverRow)   resolverRow.style.display   = 'flex';
      if (resolvedAtRow) resolvedAtRow.style.display = 'flex';

      card.querySelector('.report-resolver').textContent    = r.resolved_by_name || 'Unknown mod';
      card.querySelector('.report-resolved-at').textContent = formatDate(r.resolved_at);
    }

    // Nút hành động — chỉ hiện khi đang Pending
    if (r.status === 'pending') {
      const actionsEl = card.querySelector('.report-actions');
      actionsEl.style.display = 'flex';

      const btnDelete  = card.querySelector('.btn-resolve-delete');
      const btnDismiss = card.querySelector('.btn-resolve-dismiss');

      // Gửi 'delete' hoặc 'ignore' — đúng với backend reportRoutes.js
      if (btnDelete)  btnDelete.onclick  = () => handleResolve(r.report_id, r.message_id, 'delete');
      if (btnDismiss) btnDismiss.onclick = () => handleResolve(r.report_id, r.message_id, 'ignore');
    }

    container.appendChild(clone);
  });
}

// ── Xử lý hành động của mod trên report ──────────────

async function handleResolve(reportId, messageId, action) {
  if (action === 'delete') {
    if (!confirm('Delete this post? This action cannot be undone.')) return;
  }

  try {
    const res = await fetch(`${API}/api/moderator/resolve-report`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        report_id:  reportId,
        message_id: messageId,
        action:     action,
        mod_id:     currentUserId
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast('❌ ' + (data.message || 'Server error'));
      return;
    }

    showToast(action === 'delete'
      ? '✓ Post deleted and report resolved.'
      : '✓ Report dismissed.'
    );

    // Reload lại để cập nhật danh sách
    await loadReports();
    updateFilterCounts();
    populateReports();

  } catch (err) {
    console.error('Error resolving report:', err);
    showToast('❌ Cannot connect to server.');
  }
}

// ── Init ──────────────────────────────────────────────

async function init() {
  if (!loadSession('moderator')) return;
  renderTopbar();

  await loadReports();
  updateFilterCounts();
  populateReports();
}

init();