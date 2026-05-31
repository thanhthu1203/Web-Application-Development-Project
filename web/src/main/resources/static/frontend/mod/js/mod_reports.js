// mod_reports.js — logic cho trang Manage Reports của moderator

let ALL_REPORTS  = [];
let activeFilter = 'all';

// ── Load dữ liệu ─────────────────────────────────────

async function loadReports() {
  try {
    const res = await fetch('/api/moderator/reports');
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

// ── Cập nhật số lượng trên filter buttons ─────────────

function updateFilterCounts() {
  const total     = ALL_REPORTS.length;
  const pending   = ALL_REPORTS.filter(r => r.status === 'Pending').length;
  const resolved  = ALL_REPORTS.filter(r => r.status === 'Resolved').length;
  const dismissed = ALL_REPORTS.filter(r => r.status === 'Dismissed').length;

  document.getElementById('count-all').textContent       = total;
  document.getElementById('count-pending').textContent   = pending;
  document.getElementById('count-resolved').textContent  = resolved;
  document.getElementById('count-dismissed').textContent = dismissed;
}

// ── Filter reports theo trạng thái ───────────────────

function filterReports(filter) {
  activeFilter = filter;

  // Cập nhật active class cho buttons
  document.querySelectorAll('.report-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  // Render lại danh sách
  populateReports();
}

// ── Render empty state ────────────────────────────────

function renderEmpty(container, icon, text) {
  container.innerHTML = '';
  const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
  tpl.querySelector('.empty-icon').textContent = icon;
  tpl.querySelector('.empty-text').textContent = text;
  container.appendChild(tpl);
}

// ── Render danh sách reports ──────────────────────────

function populateReports() {
  const container = document.getElementById('reportsList');
  container.innerHTML = '';

  // Lọc theo filter hiện tại
  const filtered = activeFilter === 'all'
    ? ALL_REPORTS
    : ALL_REPORTS.filter(r => r.status === activeFilter);

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

    // Thêm class để mờ bớt card đã xử lý
    if (r.status === 'Resolved')  card.classList.add('is-resolved');
    if (r.status === 'Dismissed') card.classList.add('is-dismissed');

    // Header
    card.querySelector('.report-id').textContent   = `#${r.report_id}`;
    card.querySelector('.report-date').textContent = formatDate(r.created_at);

    // Badge trạng thái
    const badge = card.querySelector('.report-status-badge');
    badge.textContent = r.status;
    badge.classList.add(r.status.toLowerCase());

    // Thông tin bài viết bị report
    const authorName = r.author_username || r.author_name || 'Unknown user';
    card.querySelector('.report-post-author').textContent = `👤 ${authorName}`;
    card.querySelector('.report-post-thread').textContent = `📌 ${r.thread_title || 'Unknown thread'}`;

    const contentEl = card.querySelector('.report-post-content');
    if (r.message_is_deleted) {
      contentEl.textContent = '(This post has been deleted)';
      contentEl.classList.add('is-deleted');
    } else {
      contentEl.textContent = r.message_content || '(content unavailable)';
    }

    // Lý do và người report
    card.querySelector('.report-reason').textContent = r.reason;
    const reporterName = r.reporter_username || r.reporter_email || 'Unknown';
    card.querySelector('.report-reporter').textContent = reporterName;

    // Thông tin mod đã xử lý (chỉ hiện khi đã xử lý)
    if (r.status !== 'Pending') {
      const resolverRow   = card.querySelector('.report-resolver-row');
      const resolvedAtRow = card.querySelector('.report-resolved-at-row');
      if (resolverRow)   resolverRow.style.display   = 'flex';
      if (resolvedAtRow) resolvedAtRow.style.display = 'flex';

      card.querySelector('.report-resolver').textContent   = r.resolved_by_name || 'Unknown mod';
      card.querySelector('.report-resolved-at').textContent = formatDate(r.resolved_at);
    }

    // Nút hành động chỉ hiện khi Pending
    if (r.status === 'Pending') {
      const actionsEl = card.querySelector('.report-actions');
      actionsEl.style.display = 'flex';

      const btnDelete  = card.querySelector('.btn-resolve-delete');
      const btnDismiss = card.querySelector('.btn-resolve-dismiss');

      btnDelete.onclick  = () => handleResolve(r.report_id, r.message_id, 'delete');
      btnDismiss.onclick = () => handleResolve(r.report_id, r.message_id, 'dismiss');
    }

    container.appendChild(clone);
  });
}

// ── Xử lý report ─────────────────────────────────────

async function handleResolve(reportId, messageId, action) {
  if (action === 'delete') {
    if (!confirm('Delete this post? This action cannot be undone.')) return;
  }

  try {
    const res = await fetch('/api/moderator/resolve-report', {
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

    showToast(action === 'delete' ? '✓ Post deleted and report resolved.' : '✓ Report dismissed.');

    // Reload để cập nhật danh sách
    await loadReports();
    updateFilterCounts();
    populateReports();

  } catch (err) {
    console.error('Error resolving report:', err);
    showToast('❌ Cannot connect to server.');
  }
}

// ── Init ─────────────────────────────────────────────

async function init() {
  if (!loadSession('moderator')) return;
  renderTopbar();

  await loadReports();
  updateFilterCounts();
  populateReports();
}

init();