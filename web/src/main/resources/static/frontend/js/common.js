// // =============================================
// // common.js — shared state & helpers
// // =============================================

// const API = "http://localhost:3000";

// // Global state
// let currentRole   = null;
// let currentUserId = null;
// let currentName   = null;   // holds the display username
// let toastTimer    = null;

// /**
//  * Load session from localStorage / sessionStorage.
//  * Populates currentRole, currentUserId, currentName, window.currentUserAvatar.
//  * If expectedRole is provided and doesn't match, redirects to login.
//  */
// function loadSession(expectedRole) {
//   const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
//   if (!raw) {
//     window.location.href = '../login.html';
//     return false;
//   }

//   const user = JSON.parse(raw);

//   currentUserId = user.user_id || user.admin_id || user.mod_id;
//   currentRole   = user.role;

//   // Display name: prefer username, fall back to full name / role-specific name
//   currentName =
//     user.username ||
//     `${user.first_name || user.admin_name || user.mod_name || ''}${user.last_name ? ' ' + user.last_name : ''}`.trim() ||
//     'User';

//   // Avatar stored as base64 data URL or null
//   window.currentUserAvatar = user.avatar || null;

//   if (expectedRole && currentRole !== expectedRole) {
//     alert("You do not have permission to access this page.");
//     window.location.href = '../login.html';
//     return false;
//   }

//   return true;
// }

// /** Logout — clears session and redirects */
// function doLogout() {
//   localStorage.removeItem('currentUser');
//   sessionStorage.removeItem('currentUser');
//   window.location.href = '../login.html';
// }

// /**
//  * Render the topbar chip.
//  * Shows avatar image if available, otherwise initials.
//  */
// function renderTopbar() {
//   const roleLabel = { admin: 'Admin', moderator: 'Moderator', user: 'User' }[currentRole] || 'User';

//   const av = document.getElementById('chipAvatar');
//   if (av) {
//     av.className = 'chip-avatar ' + currentRole;

//     if (window.currentUserAvatar) {
//       av.innerHTML = `<img src="${window.currentUserAvatar}"
//                            alt="Avatar"
//                            style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
//     } else {
//       const initials = currentName
//         .split(' ')
//         .filter(Boolean)
//         .map(w => w[0])
//         .join('')
//         .slice(0, 2)
//         .toUpperCase();
//       av.innerHTML  = '';
//       av.textContent = initials;
//     }
//   }

//   const nameEl = document.getElementById('chipName');
//   if (nameEl) nameEl.textContent = currentName;

//   const badge = document.getElementById('chipRole');
//   if (badge) {
//     badge.className  = 'role-tag ' + currentRole;
//     badge.textContent = roleLabel;
//   }
// }

// /** Toast notification */
// function showToast(msg) {
//   const el = document.getElementById('toast');
//   if (!el) return;
//   el.textContent = msg;
//   el.classList.add('show');
//   clearTimeout(toastTimer);
//   toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
// }

//code mới để test
// =============================================
// common.js — shared state & helpers
// =============================================

const API = "http://localhost:3000";

// Global state
let currentRole   = null;
let currentUserId = null;
let currentName   = null;
let toastTimer    = null;

/**
 * Load session then fetch the latest profile from DB
 * so avatar / username are always up-to-date regardless
 * of which account was last active or what was cached.
 *
 * expectedRole (optional): 'user' | 'admin' | 'moderator'
 * Returns true on success, false (and redirects) on failure.
 */
async function loadSession(expectedRole) {
  const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  if (!raw) {
    window.location.href = '../login.html';
    return false;
  }

  let session;
  try { session = JSON.parse(raw); } catch (_) {
    window.location.href = '../login.html';
    return false;
  }

  currentUserId = session.user_id || session.admin_id || session.mod_id;
  currentRole   = session.role;

  if (expectedRole && currentRole !== expectedRole) {
    alert("You do not have permission to access this page.");
    window.location.href = '../login.html';
    return false;
  }

  // Bootstrap from cached session first so the page renders instantly
  currentName              = session.username || _fallbackName(session);
  window.currentUserAvatar = session.avatar   || null;

  // Then fetch the freshest data from DB and update both globals + session cache
  // This ensures that after a profile update or switching accounts the data is correct
  try {
    let endpoint = '';
    if (currentRole === 'admin')          endpoint = `/admins/${currentUserId}`;
    else if (currentRole === 'moderator') endpoint = `/moderators/${currentUserId}`;
    else                                  endpoint = `/users/${currentUserId}`;

    const freshData = await fetch(`${API}${endpoint}`).then(r => r.json());

    // Resolve the display name for each role
    let freshUsername = freshData.username || null;
    let freshAvatar   = freshData.avatar   || null;

    if (freshUsername) currentName = freshUsername;
    window.currentUserAvatar = freshAvatar;

    // Sync the fields that may have changed back into the session cache
    // so the next page load starts with correct data immediately
    const updatedSession = {
      ...session,
      username: freshUsername || session.username,
      avatar:   freshAvatar,
      gender:   freshData.gender        || session.gender,
      date_of_birth: freshData.date_of_birth || session.date_of_birth,
    };

    if (currentRole === 'user') {
      updatedSession.first_name = freshData.first_name || session.first_name;
      updatedSession.last_name  = freshData.last_name  || session.last_name;
    } else if (currentRole === 'admin') {
      updatedSession.admin_name = freshData.admin_name || session.admin_name;
    } else if (currentRole === 'moderator') {
      updatedSession.mod_name   = freshData.mod_name   || session.mod_name;
    }

    const storage = localStorage.getItem('currentUser') ? localStorage : sessionStorage;
    storage.setItem('currentUser', JSON.stringify(updatedSession));

  } catch (err) {
    // Network error: fall back to cached session values — already set above
    console.warn('Could not refresh profile from server, using cached session.', err);
  }

  return true;
}

/** Fallback display name when username is not set */
function _fallbackName(session) {
  if (session.admin_name) return session.admin_name;
  if (session.mod_name)   return session.mod_name;
  return `${session.first_name || ''} ${session.last_name || ''}`.trim() || 'User';
}

/** Logout — clears session and redirects */
function doLogout() {
  localStorage.removeItem('currentUser');
  sessionStorage.removeItem('currentUser');
  window.location.href = '../login.html';
}

/**
 * Render the topbar chip.
 * Shows avatar image if available, otherwise initials.
 */
function renderTopbar() {
  const roleLabel = { admin: 'Admin', moderator: 'Moderator', user: 'User' }[currentRole] || 'User';

  const av = document.getElementById('chipAvatar');
  if (av) {
    av.className = 'chip-avatar ' + currentRole;

    if (window.currentUserAvatar) {
      av.innerHTML = `<img src="${window.currentUserAvatar}"
                          alt="Avatar"
                          style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      const initials = (currentName || 'U')
        .split(' ').filter(Boolean)
        .map(w => w[0]).join('').slice(0, 2).toUpperCase();
      av.innerHTML   = '';
      av.textContent = initials || 'U';
    }
  }

  const nameEl = document.getElementById('chipName');
  if (nameEl) nameEl.textContent = currentName || '';

  const badge = document.getElementById('chipRole');
  if (badge) {
    badge.className   = 'role-tag ' + currentRole;
    badge.textContent = roleLabel;
  }
}

/** Toast notification */
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}