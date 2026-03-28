/* Admin Dashboard JS */

requireAuth();
const u = getUser();
if (u && u.role !== 'admin') {
  if (u.role === 'student') location.href = '../Students/student-dashboard.html';
  else if (u.role === 'facilitator') location.href = '../Facilitators/facilitator-dashboard.html';
}

// ---- INIT ----
let allUsers = [];

document.addEventListener('DOMContentLoaded', () => {
  fillUser();
  initNav();
  loadDashboard();
});

function fillUser() {
  const u = getUser();
  if (!u) return;
  const name = u.first_name + ' ' + u.last_name;
  const initials = (u.first_name[0] + u.last_name[0]).toUpperCase();
  document.getElementById('sbName').textContent = name;
  document.getElementById('sbSub').textContent = 'Administrator';
  document.getElementById('sbInitials').textContent = initials;
  document.getElementById('tbName').textContent = name;
  document.getElementById('tbInitials').textContent = initials;

  document.getElementById('setFirstName').value = u.first_name || '';
  document.getElementById('setLastName').value  = u.last_name  || '';
  document.getElementById('setEmail').value      = u.email     || '';
  document.getElementById('setSchool').value     = u.school    || '';
  document.getElementById('setBio').value        = u.bio       || '';
}

// ---- NAVIGATION ----
function initNav() {
  document.querySelectorAll('.menu li').forEach(li => {
    li.addEventListener('click', () => goTo(li.dataset.sec));
  });
  document.getElementById('toggleSidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });
  document.getElementById('logoutBtn').addEventListener('click', () => {
    logoutWithToast('../Logins/login.html');
  });
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn));
  });
}

function goTo(sec) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.menu li').forEach(l => l.classList.remove('active'));
  const s = document.getElementById('sec-' + sec);
  const l = document.querySelector(`.menu li[data-sec="${sec}"]`);
  if (s) s.classList.add('active');
  if (l) l.classList.add('active');
  const lbl = l ? l.querySelector('.lbl').textContent : sec;
  document.getElementById('pageTitle').textContent = lbl;

  if (sec === 'dashboard')    loadDashboard();
  else if (sec === 'users')   loadUsers();
  else if (sec === 'courses') loadAdminCourses();
  else if (sec === 'assignments') loadAdminAssignments();
  else if (sec === 'resources')   loadResources();
  else if (sec === 'messages')    { loadInbox(); loadSent(); }
  else if (sec === 'notifications') loadNotifications();
}

function activateTab(btn) {
  const container = btn.closest('.sec') || document;
  container.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const t = document.getElementById(btn.dataset.tab);
  if (t) t.classList.add('active');
}

// ---- DASHBOARD ----
async function loadDashboard() {
  try {
    const stats = await apiGet('/admin/stats');
    document.getElementById('statUsers').textContent        = stats.total_users        || 0;
    document.getElementById('statStudents').textContent     = stats.students            || 0;
    document.getElementById('statFacilitators').textContent = stats.facilitators        || 0;
    document.getElementById('statCourses').textContent      = stats.total_courses       || 0;
    document.getElementById('statAssignments').textContent  = stats.total_assignments   || 0;
    document.getElementById('statSubmissions').textContent  = stats.total_submissions   || 0;
  } catch(e) { console.error('Stats error:', e); }

  // Pending courses
  try {
    const courses = await apiGet('/admin/courses');
    const pending = (Array.isArray(courses) ? courses : []).filter(c => !c.is_approved);
    const el = document.getElementById('pendingCourses');
    el.innerHTML = pending.length
      ? pending.slice(0, 5).map(c => `
          <li>${esc(c.title)}
            <button class="btn-sm success" style="float:right;margin-left:8px" onclick="approveCourse(${c.id})">Approve</button>
          </li>`).join('')
      : '<li class="empty">No pending approvals.</li>';
  } catch(e) {}

  // Recent users
  try {
    const users = await apiGet('/admin/users');
    const el = document.getElementById('recentUsers');
    const list = Array.isArray(users) ? users.slice(0, 5) : [];
    el.innerHTML = list.length
      ? list.map(u => `<li>${esc(u.first_name)} ${esc(u.last_name)} <span style="float:right"><span class="pill ${u.role}">${u.role}</span></span></li>`).join('')
      : '<li class="empty">No users.</li>';
  } catch(e) {}
}

// ---- USERS ----
async function loadUsers() {
  const tbody = document.getElementById('usersBody');
  tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Loading…</td></tr>';
  try {
    const role = document.getElementById('userRoleFilter').value;
    const url  = role ? `/admin/users?role=${role}` : '/admin/users';
    const data = await apiGet(url);
    allUsers = Array.isArray(data) ? data : [];
    renderUsers(allUsers);
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Could not load users.</td></tr>';
  }
}

function renderUsers(users) {
  const tbody = document.getElementById('usersBody');
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No users found.</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${esc(u.first_name)} ${esc(u.last_name)}</td>
      <td>${esc(u.email)}</td>
      <td><span class="pill ${u.role}">${u.role}</span></td>
      <td>${esc(u.school || '—')}</td>
      <td><span class="pill ${u.is_active ? 'active' : 'inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <button class="btn-sm" onclick="openEditUser(${u.id})">Edit</button>
        <button class="btn-sm ${u.is_active ? 'danger' : 'success'}" onclick="toggleUser(${u.id}, ${u.is_active})" style="margin-left:4px">
          ${u.is_active ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    </tr>`).join('');
}

function filterUsers() {
  const q = document.getElementById('userSearch').value.toLowerCase();
  const filtered = allUsers.filter(u =>
    (u.first_name + ' ' + u.last_name).toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q)
  );
  renderUsers(filtered);
}

function openEditUser(id) {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;
  document.getElementById('editUserId').value   = user.id;
  document.getElementById('euFirstName').value  = user.first_name || '';
  document.getElementById('euLastName').value   = user.last_name  || '';
  document.getElementById('euEmail').value      = user.email      || '';
  document.getElementById('euRole').value       = user.role       || 'student';
  document.getElementById('euSchool').value     = user.school     || '';
  document.getElementById('modalEditUser').classList.remove('hidden');
}

async function submitEditUser() {
  const id = parseInt(document.getElementById('editUserId').value);
  const payload = {
    first_name: document.getElementById('euFirstName').value.trim(),
    last_name:  document.getElementById('euLastName').value.trim(),
    email:      document.getElementById('euEmail').value.trim(),
    role:       document.getElementById('euRole').value,
    school:     document.getElementById('euSchool').value.trim(),
  };
  try {
    await apiPut(`/admin/users/${id}`, payload);
    closeModal('modalEditUser');
    loadUsers();
  } catch(e) { alert('Could not update user.'); }
}

async function toggleUser(id, isActive) {
  try {
    await apiPut(`/admin/users/${id}/toggle`, { is_active: !isActive });
    loadUsers();
  } catch(e) { alert('Could not toggle user status.'); }
}

// ---- COURSES ----
async function loadAdminCourses() {
  const tbody = document.getElementById('coursesBody');
  tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Loading…</td></tr>';
  try {
    const status = document.getElementById('courseStatusFilter').value;
    const data = await apiGet('/admin/courses');
    let courses = Array.isArray(data) ? data : [];
    if (status === 'pending')  courses = courses.filter(c => !c.is_approved);
    if (status === 'approved') courses = courses.filter(c => c.is_approved);

    tbody.innerHTML = courses.length
      ? courses.map(c => `
          <tr>
            <td>${esc(c.title)}</td>
            <td>${c.facilitator ? esc(c.facilitator.first_name + ' ' + c.facilitator.last_name) : '—'}</td>
            <td>${esc(c.subject || '—')}</td>
            <td>${esc(c.grade_level || '—')}</td>
            <td>${c.enrollment_count || 0}</td>
            <td><span class="pill ${c.is_approved ? 'approved' : 'pending'}">${c.is_approved ? 'Approved' : 'Pending'}</span></td>
            <td>
              ${!c.is_approved ? `<button class="btn-sm success" onclick="approveCourse(${c.id})">Approve</button>` : '<span style="color:var(--text-sub);font-size:12px">Approved</span>'}
            </td>
          </tr>`).join('')
      : '<tr><td colspan="7" class="empty-state">No courses found.</td></tr>';
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Could not load courses.</td></tr>';
  }
}

async function approveCourse(id) {
  try {
    await apiPut(`/admin/courses/${id}/approve`, { is_approved: true });
    loadAdminCourses();
    loadDashboard();
  } catch(e) { alert('Could not approve course.'); }
}

// ---- ASSIGNMENTS ----
async function loadAdminAssignments() {
  const el = document.getElementById('adminAssignments');
  el.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    const courses = await apiGet('/admin/courses');
    const all = Array.isArray(courses) ? courses : [];
    let html = '';
    for (const c of all.slice(0, 20)) {
      try {
        const asgns = await apiGet(`/assignments/?course_id=${c.id}`);
        if (Array.isArray(asgns)) {
          asgns.forEach(a => {
            html += `
              <div class="asgn-card">
                <div class="asgn-left">
                  <h3>${esc(a.title)}</h3>
                  <p>${esc(c.title)} • ${esc(a.description || '')}</p>
                  <div class="asgn-meta">
                    <span class="asgn-tag type">${a.assignment_type}</span>
                    ${a.due_date ? `<span class="asgn-tag due">Due: ${fmtDate(a.due_date)}</span>` : ''}
                  </div>
                </div>
              </div>`;
          });
        }
      } catch(e) {}
    }
    el.innerHTML = html || '<div class="empty-state">No assignments found.</div>';
  } catch(e) { el.innerHTML = '<div class="empty-state">Could not load assignments.</div>'; }
}

// ---- RESOURCES ----
async function loadResources() {
  const tGrid = document.getElementById('textbookGrid');
  const pGrid = document.getElementById('paperGrid');
  tGrid.innerHTML = '<div class="empty-state">Loading…</div>';
  pGrid.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    const data = await apiGet('/resources/');
    const textbooks = data.textbooks   || [];
    const papers    = data.past_papers || [];
    tGrid.innerHTML = textbooks.length ? textbooks.map(r => resCard(r)).join('') : '<div class="empty-state">No textbooks.</div>';
    pGrid.innerHTML = papers.length    ? papers.map(r => resCard(r)).join('')    : '<div class="empty-state">No past papers.</div>';
  } catch(e) { tGrid.innerHTML = '<div class="empty-state">Could not load resources.</div>'; }
}

function resCard(r) {
  return `
    <div class="resource-card">
      <div class="res-icon">📄</div>
      <div class="res-title">${esc(r.title)}</div>
      <div class="res-sub">${esc(r.subject || '')} ${r.year ? '• ' + r.year : ''}</div>
      <button class="res-dl" onclick="downloadResource('${esc(r.path)}')">Download PDF</button>
    </div>`;
}

async function downloadResource(path) {
  try {
    const token = getToken();
    const url = `/api/resources/download?path=${encodeURIComponent(path)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = path.split('/').pop();
    a.click();
  } catch(e) { alert('Could not download file.'); }
}

// ---- MESSAGES ----
async function loadInbox() {
  const el = document.getElementById('inboxList');
  el.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    const msgs = await apiGet('/messages/inbox');
    el.innerHTML = Array.isArray(msgs) && msgs.length
      ? msgs.map(m => `
          <div class="msg-card ${m.is_read ? '' : 'unread'}">
            <div class="msg-card-left">
              <h4>${esc(m.subject || '(no subject)')}</h4>
              <p>${esc(m.content || '')}</p>
            </div>
            <span class="msg-date">${fmtDate(m.created_at)}</span>
          </div>`).join('')
      : '<div class="empty-state">No messages.</div>';
  } catch(e) { el.innerHTML = '<div class="empty-state">Could not load inbox.</div>'; }
}

async function loadSent() {
  const el = document.getElementById('sentList');
  el.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    const msgs = await apiGet('/messages/sent');
    el.innerHTML = Array.isArray(msgs) && msgs.length
      ? msgs.map(m => `
          <div class="msg-card">
            <div class="msg-card-left">
              <h4>${esc(m.subject || '(no subject)')}</h4>
              <p>${esc(m.content || '')}</p>
            </div>
            <span class="msg-date">${fmtDate(m.created_at)}</span>
          </div>`).join('')
      : '<div class="empty-state">No sent messages.</div>';
  } catch(e) { el.innerHTML = '<div class="empty-state">Could not load sent.</div>'; }
}

function openCompose() {
  document.getElementById('modalCompose').classList.remove('hidden');
}

async function sendMessage() {
  const recipientId = parseInt(document.getElementById('compRecipient').value);
  const subject = document.getElementById('compSubject').value.trim();
  const content = document.getElementById('compBody').value.trim();
  if (!recipientId || !content) { alert('Recipient and message required'); return; }
  try {
    await apiPost('/messages', { recipient_id: recipientId, subject, content });
    closeModal('modalCompose');
    loadSent();
  } catch(e) { alert('Could not send message.'); }
}

// ---- NOTIFICATIONS ----
async function loadNotifications() {
  const el = document.getElementById('notifList');
  el.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    const notifs = await apiGet('/notifications');
    const list = Array.isArray(notifs) ? notifs : [];
    const unread = list.filter(n => !n.is_read).length;
    const badge = document.getElementById('notifBadge');
    badge.textContent = unread > 0 ? unread : '';
    badge.style.display = unread > 0 ? 'inline' : 'none';

    el.innerHTML = list.length
      ? list.map(n => `
          <div class="notif-card ${n.is_read ? '' : 'unread'}">
            <div class="notif-card-left">
              <h4 style="font-size:14px;margin-bottom:3px">${esc(n.title || 'Notification')}</h4>
              <p>${esc(n.message || '')}</p>
              <small>${fmtDate(n.created_at)}</small>
            </div>
            ${!n.is_read ? `<button class="notif-mark" onclick="markRead(${n.id})">Mark Read</button>` : ''}
          </div>`).join('')
      : '<div class="empty-state">No notifications.</div>';
  } catch(e) { el.innerHTML = '<div class="empty-state">Could not load notifications.</div>'; }
}

async function markRead(id) {
  try { await apiPut(`/notifications/${id}/read`, {}); loadNotifications(); } catch(e) {}
}

async function markAllRead() {
  try { await apiPut('/notifications/read-all', {}); loadNotifications(); } catch(e) {}
}

// ---- SETTINGS ----
async function saveProfile(e) {
  e.preventDefault();
  const payload = {
    first_name: document.getElementById('setFirstName').value.trim(),
    last_name:  document.getElementById('setLastName').value.trim(),
    email:      document.getElementById('setEmail').value.trim(),
    school:     document.getElementById('setSchool').value.trim(),
    bio:        document.getElementById('setBio').value.trim(),
  };
  try {
    const updated = await apiPut('/auth/me', payload);
    const stored = getUser();
    Object.assign(stored, updated);
    localStorage.setItem('hw_user', JSON.stringify(stored));
    fillUser();
    const msg = document.getElementById('saveMsg');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);
  } catch(e) { alert('Could not save profile.'); }
}

// ---- MODALS ----
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
});

// ---- UTILS ----
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
