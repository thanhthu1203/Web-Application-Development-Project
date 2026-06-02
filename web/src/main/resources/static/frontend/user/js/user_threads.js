// let CATEGORIES = [];
// let THREADS = [];
// let MESSAGES = [];
// let SUBSCRIBES = [];

// async function loadData() {
//   const [cats, threads, messages, subs] = await Promise.all([
//     fetch(`${API}/categories`).then(r => r.json()),
//     fetch(`${API}/threads`).then(r => r.json()),
//     fetch(`${API}/messages`).then(r => r.json()),
//     fetch(`${API}/subscribes/${currentUserId}`).then(r => r.json())
//   ]);
//   CATEGORIES = cats;
//   THREADS = threads;
//   MESSAGES = messages;
//   SUBSCRIBES = subs;
// }

// function getCategoryName(id) { return (CATEGORIES.find(c => c.category_id === id) || {}).name || ''; }
// function countMsgs(tid) { return MESSAGES.filter(m => m.thread_id === tid && !m.is_deleted).length; }
// function getActiveThreads() { return THREADS.filter(t => !t.is_deleted); }
// function isSubscribed(uid, tid) { return SUBSCRIBES.some(s => s.user_id === uid && s.thread_id === tid); }

// function renderEmptyState(container, icon, text) {
//   container.innerHTML = '';
//   const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
//   tpl.querySelector('.empty-icon').textContent = icon;
//   tpl.querySelector('.empty-text').textContent = text;
//   container.appendChild(tpl);
// }

// function populateThreads() {
//   const container = document.getElementById('threadsList');
//   container.innerHTML = '';
//   const threads = getActiveThreads();
//   if (threads.length === 0) {
//     renderEmptyState(container, '🗂', 'No threads available');
//     return;
//   }
  
//   const tpl = document.getElementById('tpl-thread');
//   threads.forEach(t => {
//     const clone = tpl.content.cloneNode(true);
//     clone.querySelector('.thread-title').textContent = t.title;
//     clone.querySelector('.meta-cat').textContent = getCategoryName(t.category_id);
//     clone.querySelector('.meta-posts').textContent = `${countMsgs(t.thread_id)} posts`;
         
//     const statusEl = clone.querySelector('.meta-status');
//     if (t.is_locked) {
//       statusEl.className = 'tag-locked';
//       statusEl.textContent = 'Locked';
//     } else {
//       statusEl.className = 'tag-open';
//       statusEl.textContent = 'Open';
//     }
    
//     const sub = isSubscribed(currentUserId, t.thread_id);
//     const btnAction = clone.querySelector('.btn-action');
    
//     // Nếu thread đã bị khóa và user chưa subscribe thì disable nút
//     if (t.is_locked && !sub) {
//       btnAction.textContent = 'Cannot subscribe';
//       btnAction.disabled = true;
//       btnAction.style.opacity = '0.5';
//       btnAction.style.cursor = 'not-allowed';
//       btnAction.onclick = null; // Gỡ bỏ sự kiện click
//     } else {
//       // Logic bình thường
//       btnAction.textContent = sub ? 'Following' : 'Subscribe';
//       if (!sub) btnAction.classList.add('success');
//       btnAction.onclick = () => toggleSubscribe(t.thread_id);
//     }
    
//     container.appendChild(clone);
//   });
// }
// function toggleSubscribe(tid) {
//   const idx = SUBSCRIBES.findIndex(s => s.user_id === currentUserId && s.thread_id === tid);
  
//   if (idx >= 0) {
//     fetch(`${API}/subscribe`, {
//       method: 'DELETE',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ user_id: currentUserId, thread_id: tid }),
//     }).then(() => {
//       SUBSCRIBES.splice(idx, 1);
//       showToast('❌ Thread unsubscribed');
//       populateThreads();
//     });
//   } else {
//     fetch(`${API}/subscribe`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ user_id: currentUserId, thread_id: tid }),
//     })
//     .then(async (res) => {
//       const data = await res.json();
//       if (!res.ok) {
//         throw new Error(data.message || 'Error subscribing to thread');
//       }
//       SUBSCRIBES.push({ user_id: currentUserId, thread_id: tid });
//       showToast('✅ Thread subscribed');
//       populateThreads();
//     })
//     .catch(err => {
//       showToast('⚠️ ' + err.message);
//     });
//   }
// }

// async function init() {
//   if (!loadSession('user')) return; 
//   renderTopbar();
//   await loadData();
//   populateThreads();
// }
// init();

let CATEGORIES = [];
let THREADS = [];
let MESSAGES = [];
let SUBSCRIBES = [];


let searchTimer = null;
let currentKeyword = '';
let currentCategoryId = '';


async function loadData() {
 const [cats, threads, messages, subs] = await Promise.all([
   fetch(`${API}/categories`).then(r => r.json()),
   fetch(`${API}/threads`).then(r => r.json()),
   fetch(`${API}/messages`).then(r => r.json()),
   fetch(`${API}/subscribes/${currentUserId}`).then(r => r.json())
 ]);
 CATEGORIES = cats;
 THREADS = threads;
 MESSAGES = messages;
 SUBSCRIBES = subs;
}


function getCategoryName(id) { return (CATEGORIES.find(c => c.category_id === id) || {}).name || ''; }
function countMsgs(tid) { return MESSAGES.filter(m => m.thread_id === tid && !m.is_deleted).length; }
function isSubscribed(uid, tid) { return SUBSCRIBES.some(s => s.user_id === uid && s.thread_id === tid); }


function renderEmptyState(container, icon, text) {
 container.innerHTML = '';
 const tpl = document.getElementById('tpl-empty').content.cloneNode(true);
 tpl.querySelector('.empty-icon').textContent = icon;
 tpl.querySelector('.empty-text').textContent = text;
 container.appendChild(tpl);
}


function highlightText(text, keyword) {
 if (!keyword) return text;
 const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 const regex = new RegExp(`(${escaped})`, 'gi');
 return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}


/*function populateThreads(threads) {
 const container = document.getElementById('threadsList');
 container.innerHTML = '';


 if (threads.length === 0) {
   renderEmptyState(container, '🔍', currentKeyword
     ? `No threads found for "${currentKeyword}"`
     : 'No threads available');
   return;
 }


 const tpl = document.getElementById('tpl-thread');
 threads.forEach(t => {
   const clone = tpl.content.cloneNode(true);


   const titleEl = clone.querySelector('.thread-title');
   titleEl.innerHTML = highlightText(t.title, currentKeyword);


   clone.querySelector('.meta-cat').textContent = getCategoryName(t.category_id);
   clone.querySelector('.meta-posts').textContent = `${countMsgs(t.thread_id)} posts`;


   const statusEl = clone.querySelector('.meta-status');
   if (t.is_locked) {
     statusEl.className = 'tag-locked';
     statusEl.textContent = 'Locked';
   } else {
     statusEl.className = 'tag-open';
     statusEl.textContent = 'Open';
   }


   const sub = isSubscribed(currentUserId, t.thread_id);
   const btnAction = clone.querySelector('.btn-action');
   btnAction.textContent = sub ? '★ Following' : '☆ Subscribe';
   if (!sub) btnAction.classList.add('success');
   btnAction.onclick = () => toggleSubscribe(t.thread_id);


   container.appendChild(clone);
 });
}*/
function populateThreads(threads) {
 const container = document.getElementById('threadsList');
 container.innerHTML = '';


 if (threads.length === 0) {
   renderEmptyState(container, '🔍', currentKeyword
     ? `No threads found for "${currentKeyword}"`
     : 'No threads available');
   return;
 }


 const tpl = document.getElementById('tpl-thread');
 threads.forEach(t => {
   const clone = tpl.content.cloneNode(true);


   // ==========================================
   // THÊM MỚI: Bắt sự kiện click vào thread
   // ==========================================
   const threadItem = clone.querySelector('.thread-item');
   threadItem.addEventListener('click', (e) => {
     // Nếu người dùng click vào nút Subscribe, thì bỏ qua không chuyển trang
     if (e.target.closest('.btn-action')) return;
    
     // Chuyển sang trang messages và đính kèm ID của thread
     window.location.href = `user_messages.html?threadId=${t.thread_id}`;
   });
   // ==========================================


   const titleEl = clone.querySelector('.thread-title');
   titleEl.innerHTML = highlightText(t.title, currentKeyword);


   clone.querySelector('.meta-cat').textContent = getCategoryName(t.category_id);
   clone.querySelector('.meta-posts').textContent = `${countMsgs(t.thread_id)} posts`;


   const statusEl = clone.querySelector('.meta-status');
   if (t.is_locked) {
     statusEl.className = 'tag-locked';
     statusEl.textContent = 'Locked';
   } else {
     statusEl.className = 'tag-open';
     statusEl.textContent = 'Open';
   }


   const sub = isSubscribed(currentUserId, t.thread_id);
   const btnAction = clone.querySelector('.btn-action');
   btnAction.textContent = sub ? '★ Following' : '☆ Subscribe';
   if (!sub) btnAction.classList.add('success');
   btnAction.onclick = () => toggleSubscribe(t.thread_id);


   container.appendChild(clone);
 });
}




function updateSearchStatus(count, keyword, categoryId) {
 const statusEl = document.getElementById('searchStatus');
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


 // If no filters, use local data
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


   // Sync THREADS with search results so subscribe counts stay accurate
   populateThreads(results);
   updateSearchStatus(results.length, keyword, categoryId);
 } catch (err) {
   console.error('Search failed:', err);
   // Fallback: filter local data
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


 // Debounce search on typing
 input.addEventListener('input', () => {
   currentKeyword = input.value;
   clearBtn.style.display = currentKeyword ? 'flex' : 'none';


   clearTimeout(searchTimer);
   searchTimer = setTimeout(performSearch, 300);
 });


 // Clear button
 clearBtn.addEventListener('click', () => {
   input.value = '';
   currentKeyword = '';
   clearBtn.style.display = 'none';
   input.focus();
   performSearch();
 });


 // Category filter
 catFilter.addEventListener('change', () => {
   currentCategoryId = catFilter.value;
   performSearch();
 });
}


function toggleSubscribe(tid) {
 const idx = SUBSCRIBES.findIndex(s => s.user_id === currentUserId && s.thread_id === tid);
 if (idx >= 0) {
   fetch(`${API}/subscribe`, {
     method: 'DELETE',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ user_id: currentUserId, thread_id: tid }),
   }).then(() => {
     SUBSCRIBES.splice(idx, 1);
     showToast('✓ Thread unsubscribed');
     performSearch();
   });
 } else {
   fetch(`${API}/subscribe`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ user_id: currentUserId, thread_id: tid }),
   }).then(() => {
     SUBSCRIBES.push({ user_id: currentUserId, thread_id: tid });
     showToast('✓ Thread subscribed');
     performSearch();
   });
 }
}


async function init() {
 if (!loadSession('user')) return;
 renderTopbar();
 await loadData();
 populateCategoryFilter();
 initSearchUI();
 populateThreads(THREADS.filter(t => !t.is_deleted));
}
init();

