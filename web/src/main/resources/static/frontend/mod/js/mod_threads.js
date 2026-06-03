// let CATEGORIES = [];
// let THREADS = [];
// let MESSAGES = [];
// let REPORTS = [];

// function getAuthHeaders() {
//     const token = localStorage.getItem('token') || sessionStorage.getItem('token');
//     return {
//         'Content-Type': 'application/json',
//         'Authorization': token ? `Bearer ${token}` : ''
//     };
// }

// async function loadData() {
//     // gọi độc lập hoặc bắt lỗi từng cái để tránh 1 api chết kéo theo toàn bộ
//     const [cats, threads, messages] = await Promise.all([
//         fetch(`${API}/categories`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []).catch(() => []),
//         fetch(`${API}/threads`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []).catch(() => []),
//         fetch(`${API}/messages`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []).catch(() => [])
//     ]);

//     CATEGORIES = Array.isArray(cats) ? cats : [];
//     THREADS = Array.isArray(threads) ? threads : [];
//     MESSAGES = Array.isArray(messages) ? messages : [];

//     // gọi báo cáo an toàn
//     const reportsRes = await fetch(`${API}/api/moderator/reports`, { headers: getAuthHeaders() }).catch(() => null);
//     if (reportsRes && reportsRes.ok) {
//         REPORTS = await reportsRes.json();
//     } else {
//         REPORTS = [];
//     }
// }

// function getCategoryName(id) { return (CATEGORIES.find(c => c.category_id === id) || {}).name || ''; }
// function countMsgs(tid)      { return MESSAGES.filter(m => m.thread_id === tid && !m.is_deleted).length; }
// function getActiveThreads()  { return THREADS.filter(t => !t.is_deleted); }

// function renderEmpty(container, icon, text) {
//     container.innerHTML = '';
//     const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
//     tpl.querySelector('.empty-icon').textContent = icon;
//     tpl.querySelector('.empty-text').textContent = text;
//     container.appendChild(tpl);
// }

// function updateReportIndicator() {
//     const reportNav = document.querySelector('[data-tab="reports"]');
//     if (reportNav && REPORTS.length > 0) {
//         if (!reportNav.querySelector('.report-indicator')) {
//             let dot = document.createElement('span');
//             dot.className = 'report-indicator';
//             dot.style.cssText = 'background: #e74c3c; border-radius: 50%; width: 8px; height: 8px; margin-left: auto; display: inline-block;';
//             reportNav.appendChild(dot);
//         }
//     }
// }

// function populateThreads() {
//     const container = document.getElementById('modThreadsList');
//     container.innerHTML = '';
//     const threads = getActiveThreads();
//     if (threads.length === 0) {
//         renderEmpty(container, ' ', 'No threads available');
//         return;
//     }
//     const tpl = document.getElementById('tpl-thread-mod');
//     threads.forEach(t => {
//         const clone = tpl.content.cloneNode(true);
//         clone.querySelector('.thread-title').textContent = t.title;
//         clone.querySelector('.meta-cat').textContent = getCategoryName(t.category_id);
//         clone.querySelector('.meta-posts').textContent = `${countMsgs(t.thread_id)} posts`;
        
//         const statusEl = clone.querySelector('.meta-status');
//         statusEl.className = t.is_locked ? 'tag-locked' : 'tag-open';
//         statusEl.textContent = t.is_locked ? 'Locked' : 'Open';
        
//         const messagesInThread = MESSAGES.filter(m => m.thread_id === t.thread_id).map(m => m.message_id);
//         const hasReport = Array.isArray(REPORTS) && REPORTS.some(r => messagesInThread.includes(r.message_id));
        
//         const btnReportLink = clone.querySelector('.btn-report-link');
//         if (btnReportLink) {
//             btnReportLink.style.display = hasReport ? 'inline-block' : 'none';
//             btnReportLink.textContent = 'Review Report';
//             btnReportLink.onclick = () => window.location.href = 'mod_reports.html';
//         }
        
//         const btnLock = clone.querySelector('.btn-lock');
//         btnLock.textContent = t.is_locked ? 'Unlock' : 'Lock';
//         btnLock.onclick = () => lockThread(t.thread_id, t.is_locked ? 0 : 1);
//         clone.querySelector('.btn-delete').onclick = () => deleteThread(t.thread_id);
//         container.appendChild(clone);
//     });
// }

// function createThread() {
//     const title = prompt('Enter new thread title:');
//     if (!title || !title.trim()) return;
//     fetch(`${API}/threads`, {
//         method: 'POST',
//         headers: getAuthHeaders(),
//         body: JSON.stringify({ title: title.trim(), category_id: 1, created_by: currentUserId }),
//     }).then(async () => {
//         showToast('Thread created');
//         THREADS = await fetch(`${API}/threads`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []);
//         populateThreads();
//     });
// }

// function lockThread(tid, state) {
//     fetch(`${API}/threads/${tid}/lock`, {
//         method: 'PUT',
//         headers: getAuthHeaders(),
//         body: JSON.stringify({ is_locked: state }),
//     }).then(async () => {
//         showToast('Updated successfully');
//         THREADS = await fetch(`${API}/threads`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []);
//         populateThreads();
//     });
// }

// function deleteThread(tid) {
//     if (!confirm('Are you sure you want to delete this thread?')) return;
//     fetch(`${API}/threads/${tid}`, {
//         method: 'DELETE',
//         headers: getAuthHeaders(),
//         body: JSON.stringify({ deleted_by: currentUserId }),
//     }).then(async () => {
//         THREADS = await fetch(`${API}/threads`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []);
//         populateThreads();
//     });
// }

// // sửa mất avatar: bắt buộc phải await loadSession
// async function init() {
//     if (!(await loadSession('moderator'))) return;
//     renderTopbar();
//     await loadData();
//     updateReportIndicator();
//     populateThreads();
// }

// init();

let CATEGORIES = [];
let THREADS = [];
let MESSAGES = [];
let REPORTS = [];

// Các biến phục vụ chức năng search
let searchTimer = null;
let currentKeyword = '';
let currentCategoryId = '';

function getAuthHeaders() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

async function loadData() {
    const [cats, threads, messages] = await Promise.all([
        fetch(`${API}/categories`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API}/threads`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API}/messages`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []).catch(() => [])
    ]);

    CATEGORIES = Array.isArray(cats) ? cats : [];
    THREADS = Array.isArray(threads) ? threads : [];
    MESSAGES = Array.isArray(messages) ? messages : [];

    const reportsRes = await fetch(`${API}/api/moderator/reports`, { headers: getAuthHeaders() }).catch(() => null);
    if (reportsRes && reportsRes.ok) {
        REPORTS = await reportsRes.json();
    } else {
        REPORTS = [];
    }
}

function getCategoryName(id) { return (CATEGORIES.find(c => c.category_id === id) || {}).name || ''; }
function countMsgs(tid)      { return MESSAGES.filter(m => m.thread_id === tid && !m.is_deleted).length; }

function renderEmpty(container, icon, text) {
    container.innerHTML = '';
    const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
    tpl.querySelector('.empty-icon').textContent = icon;
    tpl.querySelector('.empty-text').textContent = text;
    container.appendChild(tpl);
}

function updateReportIndicator() {
    const reportNav = document.querySelector('[data-tab="manage-reports"]');
    if (!reportNav) return;

    const pendingReports = REPORTS.filter(report => report.status === 'pending');
    const existingIndicator = reportNav.querySelector('.report-indicator');

    if (pendingReports.length > 0) {
        if (!existingIndicator) {
            let dot = document.createElement('span');
            dot.className = 'report-indicator';
            dot.style.cssText = 'background: #e74c3c; border-radius: 50%; inline-size: 8px; block-size: 8px; margin-inline-start: auto; display: inline-block;';
            reportNav.appendChild(dot);
        }
    } else {
        if (existingIndicator) {
            existingIndicator.remove();
        }
    }
}

function highlightText(text, keyword) {
    if (!keyword) return text;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

function updateSearchStatus(count, keyword, categoryId) {
    const statusEl = document.getElementById('searchStatus');
    if (!statusEl) return;
  
    if (!keyword && !categoryId) {
      statusEl.textContent = '';
      return;
    }
     let parts = [];
    if (keyword) parts.push(`"${keyword}"`);
    if (categoryId) {
      const cat = CATEGORIES.find(c => c.category_id == categoryId);
      if (cat) parts.push(`category: ${cat.name}`);
    }
     statusEl.textContent = `${count} result${count !== 1 ? 's' : ''} for ${parts.join(', ')}`;
}

async function performSearch() {
    const keyword = currentKeyword.trim();
    const categoryId = currentCategoryId;
    if (!keyword && !categoryId) {
      const active = THREADS.filter(t => !t.is_deleted);
      populateThreads(active);
      updateSearchStatus(0, '', '');
      return;
    }
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('q', keyword);
      if (categoryId) params.set('category_id', categoryId);
       const res = await fetch(`${API}/threads/search?${params.toString()}`);
      const results = await res.json();
       populateThreads(results);
      updateSearchStatus(results.length, keyword, categoryId);
    } catch (err) {
      console.error('Search failed:', err);
      let filtered = THREADS.filter(t => !t.is_deleted);
      if (keyword) {
        const kw = keyword.toLowerCase();
        filtered = filtered.filter(t => t.title.toLowerCase().includes(kw));
      }
      if (categoryId) {
        filtered = filtered.filter(t => t.category_id == categoryId);
      }
      populateThreads(filtered);
      updateSearchStatus(filtered.length, keyword, categoryId);
    }
}

function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if(!select) return;
    CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.category_id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
}

function initSearchUI() {
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClear');
    const catFilter = document.getElementById('categoryFilter');
    if(input) {
        input.addEventListener('input', () => {
            currentKeyword = input.value;
            if(clearBtn) clearBtn.style.display = currentKeyword ? 'flex' : 'none';
            clearTimeout(searchTimer);
            searchTimer = setTimeout(performSearch, 300);
        });
    }
    if(clearBtn) {
        clearBtn.addEventListener('click', () => {
            input.value = '';
            currentKeyword = '';
            clearBtn.style.display = 'none';
            input.focus();
            performSearch();
        });
    }
    if(catFilter) {
        catFilter.addEventListener('change', () => {
            currentCategoryId = catFilter.value;
            performSearch();
        });
    }
}

function populateThreads(threadsArray) {
    const container = document.getElementById('modThreadsList');
    container.innerHTML = '';
  
    const threads = threadsArray || THREADS.filter(t => !t.is_deleted);

    if (threads.length === 0) {
        renderEmpty(container, '🔍', currentKeyword
        ? `No threads found for "${currentKeyword}"`
        : 'No threads available');
        return;
    }

    const tpl = document.getElementById('tpl-thread-mod');
    threads.forEach(t => {
        const clone = tpl.content.cloneNode(true);
      
        const threadItem = clone.querySelector('.thread-item');
        threadItem.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('.btn-report-link')) return;
            window.location.href = `mod_messages.html?threadId=${t.thread_id}`;
        });
      
        const titleEl = clone.querySelector('.thread-title');
        titleEl.innerHTML = highlightText(t.title, currentKeyword);

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

    // Kiểm tra đã load categories chưa
    if (!Array.isArray(CATEGORIES) || CATEGORIES.length === 0) {
        showToast('⚠️ No categories available. Please refresh and try again.');
        return;
    }

    // Hiển thị danh sách category để mod chọn
    const catList = CATEGORIES.map(c => `${c.category_id}. ${c.name}`).join('\n');
    const catInput = prompt(`Select a category:\n\n${catList}\n\nEnter the category number:`);

    // Mod bấm Cancel
    if (catInput === null) return;

    const categoryId = parseInt(catInput);
    const validCategory = CATEGORIES.find(c => c.category_id === categoryId);

    if (!validCategory) {
        showToast('⚠️ Invalid category. Thread was not created.');
        return;
    }

    fetch(`${API}/threads`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: title.trim(), category_id: categoryId, created_by: currentUserId }),
    }).then(async (res) => {
        if (!res || !res.ok) {
            showToast('❌ Error creating thread');
            return;
        }
        showToast('✓ Thread created');
        THREADS = await fetch(`${API}/threads`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []);
        populateThreads();
    }).catch(() => {
        showToast('❌ Cannot connect to server');
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
        performSearch(); 
    });
}

//just incase the not comment out function deleteThread(tid)  is not functioning correctly, we can use the comment out function

// function deleteThread(tid) {
//     if (!confirm('Are you sure you want to delete this thread?')) return;
//     fetch(`${API}/threads/${tid}`, {
//         method: 'DELETE',
//         headers: getAuthHeaders(),
//         body: JSON.stringify({ deleted_by: currentUserId }),
//     }).then(async () => {
//         THREADS = await fetch(`${API}/threads`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []);
//         performSearch(); 
//     });
// }

function deleteThread(tid) {
    if (!confirm('Are you sure you want to delete this thread and ALL its messages?')) return;
    
    fetch(`${API}/threads/${tid}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ deleted_by: typeof currentUserId !== 'undefined' ? currentUserId : null }),
    }).then(async (res) => {
        if (!res.ok) {
            // Đọc lỗi từ backend và báo cho Mod
            const errorData = await res.json();
            alert("Error: " + (errorData.error || "Cannot delete thread"));
            return;
        }
        
        // Nếu thành công thì tải lại danh sách
        showToast('✓ Thread and all messages deleted successfully');
        THREADS = await fetch(`${API}/threads`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : []);
        performSearch(); 
    }).catch(err => {
        console.error("Connection error:", err);
        alert("❌ Cannot connect to server");
    });
}

async function init() {
    if (!(await loadSession('moderator'))) return;
    renderTopbar();
    await loadData();
  
    populateCategoryFilter();
    initSearchUI();
  
    updateReportIndicator();
    populateThreads();
}

init();
