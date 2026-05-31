let CATEGORIES = [];
let THREADS = [];
let MESSAGES = [];
let REPORTS = [];

function getAuthHeaders() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

async function loadData() {
    // gọi độc lập hoặc bắt lỗi từng cái để tránh 1 api chết kéo theo toàn bộ
    const [cats, threads, messages] = await Promise.all([
        fetch(`${API}/categories`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API}/threads`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API}/messages`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []).catch(() => [])
    ]);

    CATEGORIES = Array.isArray(cats) ? cats : [];
    THREADS = Array.isArray(threads) ? threads : [];
    MESSAGES = Array.isArray(messages) ? messages : [];

    // gọi báo cáo an toàn
    const reportsRes = await fetch(`${API}/api/moderator/reports`, { headers: getAuthHeaders() }).catch(() => null);
    if (reportsRes && reportsRes.ok) {
        REPORTS = await reportsRes.json();
    } else {
        REPORTS = [];
    }
}

function getCategoryName(id) { return (CATEGORIES.find(c => c.category_id === id) || {}).name || ''; }
function countMsgs(tid)      { return MESSAGES.filter(m => m.thread_id === tid && !m.is_deleted).length; }
function getActiveThreads()  { return THREADS.filter(t => !t.is_deleted); }

function renderEmpty(container, icon, text) {
    container.innerHTML = '';
    const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
    tpl.querySelector('.empty-icon').textContent = icon;
    tpl.querySelector('.empty-text').textContent = text;
    container.appendChild(tpl);
}

function updateReportIndicator() {
    const reportNav = document.querySelector('[data-tab="reports"]');
    if (reportNav && REPORTS.length > 0) {
        if (!reportNav.querySelector('.report-indicator')) {
            let dot = document.createElement('span');
            dot.className = 'report-indicator';
            dot.style.cssText = 'background: #e74c3c; border-radius: 50%; width: 8px; height: 8px; margin-left: auto; display: inline-block;';
            reportNav.appendChild(dot);
        }
    }
}

function populateThreads() {
    const container = document.getElementById('modThreadsList');
    container.innerHTML = '';
    const threads = getActiveThreads();
    if (threads.length === 0) {
        renderEmpty(container, ' ', 'No threads available');
        return;
    }
    const tpl = document.getElementById('tpl-thread-mod');
    threads.forEach(t => {
        const clone = tpl.content.cloneNode(true);
        clone.querySelector('.thread-title').textContent = t.title;
        clone.querySelector('.meta-cat').textContent = getCategoryName(t.category_id);
        clone.querySelector('.meta-posts').textContent = `${countMsgs(t.thread_id)} posts`;
        
        const statusEl = clone.querySelector('.meta-status');
        statusEl.className = t.is_locked ? 'tag-locked' : 'tag-open';
        statusEl.textContent = t.is_locked ? 'Locked' : 'Open';
        
        const messagesInThread = MESSAGES.filter(m => m.thread_id === t.thread_id).map(m => m.message_id);
        const hasReport = Array.isArray(REPORTS) && REPORTS.some(r => messagesInThread.includes(r.message_id));
        
        const btnReportLink = clone.querySelector('.btn-report-link');
        if (btnReportLink) {
            btnReportLink.style.display = hasReport ? 'inline-block' : 'none';
            btnReportLink.textContent = 'Review Report';
            btnReportLink.onclick = () => window.location.href = 'mod_reports.html';
        }
        
        const btnLock = clone.querySelector('.btn-lock');
        btnLock.textContent = t.is_locked ? 'Unlock' : 'Lock';
        btnLock.onclick = () => lockThread(t.thread_id, t.is_locked ? 0 : 1);
        clone.querySelector('.btn-delete').onclick = () => deleteThread(t.thread_id);
        container.appendChild(clone);
    });
}

function createThread() {
    const title = prompt('Enter new thread title:');
    if (!title || !title.trim()) return;
    fetch(`${API}/threads`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: title.trim(), category_id: 1, created_by: currentUserId }),
    }).then(async () => {
        showToast('Thread created');
        THREADS = await fetch(`${API}/threads`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []);
        populateThreads();
    });
}

function lockThread(tid, state) {
    fetch(`${API}/threads/${tid}/lock`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_locked: state }),
    }).then(async () => {
        showToast('Updated successfully');
        THREADS = await fetch(`${API}/threads`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []);
        populateThreads();
    });
}

function deleteThread(tid) {
    if (!confirm('Are you sure you want to delete this thread?')) return;
    fetch(`${API}/threads/${tid}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ deleted_by: currentUserId }),
    }).then(async () => {
        THREADS = await fetch(`${API}/threads`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []);
        populateThreads();
    });
}

// sửa mất avatar: bắt buộc phải await loadSession
async function init() {
    if (!(await loadSession('moderator'))) return;
    renderTopbar();
    await loadData();
    updateReportIndicator();
    populateThreads();
}

init();