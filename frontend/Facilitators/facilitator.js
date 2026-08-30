/* Facilitator Dashboard JS */

requireAuth();
const _u = getUser();
if (_u && _u.role !== 'facilitator') {
  if (_u.role === 'student') location.href = '../Students/student-dashboard.html';
  else if (_u.role === 'admin') location.href = '../Admins/admin-dashboard.html';
}

const COMMON_COUNTRIES = [
  "Rwanda", "Kenya", "Uganda", "Tanzania", "Burundi", "DR Congo", "Nigeria", "Ghana",
  "South Africa", "Ethiopia", "Egypt", "Morocco", "Senegal", "Zambia", "Zimbabwe",
  "Cameroon", "Ivory Coast", "United States", "United Kingdom", "France", "Canada",
  "Germany", "India", "China", "Belgium", "Netherlands", "Other",
];
const FACILITATOR_GOALS = [
  "Improve student engagement", "Build better course materials",
  "Track student progress more effectively", "Grade more efficiently",
  "Communicate better with students/parents", "Explore new teaching methods",
];
const LANGUAGES_PRESET = ["English", "French", "Kinyarwanda", "Kiswahili", "Portuguese", "Spanish", "Arabic"];

// ---- INIT ----
let myCourses = [];
let activeCourseId = null;
let _activeCourseDetail = null;
let _subjTab = 'active';
let _csCourseId = null;      // course currently open in the Course Setup wizard (null = creating)
let _csIsNewCourse = false;  // true only for the very first save of a brand-new course
let _csThumbFile = null;
let _csTeamMembers = [];
let _csAllFacilitators = [];
let allMsgPeople = [];

document.addEventListener('DOMContentLoaded', () => {
  fillUser();
  initNav();
  loadDashboard();
  // Poll for new messages every 30s
  setInterval(() => {
    const sec = document.querySelector('.sec.active');
    if (sec?.id === 'sec-messages') loadContacts();
    if (sec?.id === 'sec-notifications') loadNotifications();
  }, 30000);
});

function fillUser() {
  const u = getUser();
  if (!u) return;
  const name = u.first_name + ' ' + u.last_name;
  const initials = ((u.first_name||'?')[0] + (u.last_name||'?')[0]).toUpperCase();
  document.getElementById('sbName').textContent = name;
  document.getElementById('sbSub').textContent = u.school || 'Facilitator';
  document.getElementById('sbInitials').textContent = initials;
  document.getElementById('tbName').textContent = name;
  document.getElementById('tbInitials').textContent = initials;
  document.getElementById('welcomeName').textContent = u.first_name;

  document.getElementById('setFirstName').value = u.first_name || '';
  document.getElementById('setLastName').value = u.last_name || '';
  document.getElementById('setEmail').value = u.email || '';
  document.getElementById('setCountry').value = u.country || '';
  document.getElementById('setCity').value = u.city || '';
  document.getElementById('setNationality').value = u.nationality || '';
  document.getElementById('setBio').value = u.bio || '';
  document.getElementById('setCountryList').innerHTML = COMMON_COUNTRIES.map(c => `<option value="${c}">`).join('');
  initMultiPicker('setLanguages', LANGUAGES_PRESET, u.languages_spoken || []);
  initMultiPicker('setGoals', FACILITATOR_GOALS, u.goals || []);
  if (document.getElementById('fPwEmail')) {
    document.getElementById('fPwEmail').value = u.email || '';
  }
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
    btn.addEventListener('click', () => {
      activateTab(btn);
      const t = btn.dataset.tab;
      if (t === 'msg-people') loadMsgPeople();
      if (t === 'msg-inbox') loadInbox();
      if (t === 'msg-sent') loadSent();
    });
  });

  document.addEventListener('click', e => {
    const dd = document.getElementById('profileDropdown');
    if (dd && dd.classList.contains('open') && !dd.contains(e.target) && !e.target.closest('.profile-trigger')) {
      dd.classList.remove('open');
    }
  });
}

function goTo(sec) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.menu li').forEach(l => l.classList.remove('active'));
  const s = document.getElementById('sec-' + sec);
  const l = document.querySelector(`.menu li[data-sec="${sec}"]`);
  if (s) s.classList.add('active');
  if (l) l.classList.add('active');
  document.getElementById('pageTitle').textContent = l ? l.querySelector('.lbl').textContent : sec.charAt(0).toUpperCase() + sec.slice(1);

  if (sec === 'dashboard')     loadDashboard();
  else if (sec === 'subjects')     loadCourses();
  else if (sec === 'assignments')  loadAssignments();
  else if (sec === 'students')     loadStudents();
  else if (sec === 'progress')     loadProgress();
  else if (sec === 'resources')    loadResources();
  else if (sec === 'messages')     loadMessages();
  else if (sec === 'notifications') loadNotifications();
  else if (sec === 'settings')     {
    const u = getUser();
    if (u && document.getElementById('fPwEmail')) document.getElementById('fPwEmail').value = u.email || '';
  }
}

function activateTab(btn) {
  const parent = btn.closest('.tab-bar')?.parentElement || btn.closest('.sec') || document;
  const bar = btn.closest('.tab-bar');
  if (bar) {
    bar.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const section = bar.parentElement;
    section.querySelectorAll(':scope > .tab-content').forEach(c => c.classList.remove('active'));
    const target = section.querySelector('#' + btn.dataset.tab);
    if (target) target.classList.add('active');
  }
}

// ---- DASHBOARD ----
async function loadDashboard() {
  try {
    const [courses, assignments] = await Promise.all([
      apiGet('/courses/my').catch(() => []),
      apiGet('/assignments/').catch(() => [])
    ]);

    myCourses = Array.isArray(courses) ? courses : [];
    const asgnList = Array.isArray(assignments) ? assignments : [];
    _allAsgnData = asgnList;

    document.getElementById('statCourses').textContent = myCourses.length;

    let totalStudents = 0;
    myCourses.forEach(c => { totalStudents += (c.student_count || c.enrollment_count || 0); });
    document.getElementById('statStudents').textContent = totalStudents;

    // One pass over each assignment's submissions feeds Pending Grading, Avg.
    // Performance, the Recent Submissions table, and the Activity Timeline —
    // all real data, no placeholders.
    const asgnSubset = asgnList.slice(0, 10);
    const allSubs = [];
    for (const a of asgnSubset) {
      try {
        const subs = await apiGet(`/assignments/${a.id}/submissions`);
        if (Array.isArray(subs)) subs.forEach(s => allSubs.push(Object.assign({ _asgn: a }, s)));
      } catch (e) {}
    }

    const pending = allSubs.filter(s => s.grade === null || s.grade === undefined);
    document.getElementById('statPending').textContent = pending.length;
    document.getElementById('statPendingTrend').textContent = pending.length ? 'Requires attention' : 'All caught up';
    document.getElementById('statPendingTrend').className = 'stat-trend ' + (pending.length ? 'warn' : 'up');

    const graded = allSubs.filter(s => s.grade != null);
    const avgPerf = graded.length
      ? Math.round(graded.reduce((sum, s) => sum + (s.grade / (s._asgn.max_score || 100)), 0) / graded.length * 100)
      : null;
    document.getElementById('statPerformance').textContent = avgPerf != null ? avgPerf + '%' : '—';
    document.getElementById('statPerformanceTrend').textContent = graded.length ? `${graded.length} graded` : 'No grades yet';

    document.getElementById('statCoursesTrend').textContent = `${asgnList.length} assignment${asgnList.length===1?'':'s'} total`;
    document.getElementById('statStudentsTrend').textContent = `${myCourses.length} subject${myCourses.length===1?'':'s'}`;

    renderRecentSubmissions(allSubs);
    renderActivityTimeline(allSubs);
  } catch(e) { console.error(e); }
}

function renderRecentSubmissions(allSubs) {
  const el = document.getElementById('recentSubmissions');
  const sorted = [...allSubs].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)).slice(0, 6);
  if (!sorted.length) { el.innerHTML = '<tr><td colspan="5" class="empty">No submissions yet.</td></tr>'; return; }
  el.innerHTML = sorted.map(s => {
    _gradeContext[s.id] = { submission: s, assignment: s._asgn };
    const name = s.student_name || `Student #${s.student_id}`;
    const init = name.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
    const graded = s.grade != null;
    return `<tr onclick="openGradeModal(${s.id})" style="cursor:pointer">
      <td><span class="rs-avatar">${esc(init)}</span> ${esc(name)}</td>
      <td>${esc(s._asgn.course_title || '—')}</td>
      <td>${esc(s._asgn.title)}</td>
      <td><span class="status-pill ${graded ? 'graded' : 'urgent'}">${graded ? 'Graded' : 'Needs Grading'}</span></td>
      <td><a class="rs-action" onclick="event.stopPropagation();openGradeModal(${s.id})">${graded ? 'Review' : 'Grade'}</a></td>
    </tr>`;
  }).join('');
}

function renderActivityTimeline(allSubs) {
  const el = document.getElementById('activityTimeline');
  const graded = allSubs.filter(s => s.graded_at);
  if (!graded.length) { el.innerHTML = '<li class="empty">No recent grading activity.</li>'; return; }

  // Group same-assignment gradings on the same day into one line, mirroring how a
  // grading session actually happens (grade a batch, move on).
  const groups = {};
  graded.forEach(s => {
    const key = new Date(s.graded_at).toDateString() + '|' + s._asgn.id;
    if (!groups[key]) groups[key] = { asgn: s._asgn, count: 0, latest: s.graded_at };
    groups[key].count++;
    if (new Date(s.graded_at) > new Date(groups[key].latest)) groups[key].latest = s.graded_at;
  });
  const list = Object.values(groups).sort((a, b) => new Date(b.latest) - new Date(a.latest)).slice(0, 6);

  el.innerHTML = list.map((g, i) => `
    <li class="timeline-item">
      <span class="timeline-dot ${i === 0 ? 'latest' : ''}"></span>
      <div>
        <div class="timeline-time">${fmtRelativeDateTime(g.latest)}</div>
        <div class="timeline-title">Graded ${g.count} submission${g.count === 1 ? '' : 's'}</div>
        <div class="timeline-sub">${esc(g.asgn.title)}</div>
      </div>
    </li>`).join('');
}

function fmtRelativeDateTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = x => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
}

function startGrading() {
  goTo('assignments');
  const btn = document.querySelector('#sec-assignments .tab[data-tab="asgn-grade"]');
  if (btn) activateTab(btn);
}

// ---- SUBJECTS ----
function setSubjTab(status) {
  _subjTab = status;
  document.querySelectorAll('#sec-subjects .tab-bar .tab').forEach(b => b.classList.remove('active'));
  document.querySelector(`#sec-subjects .tab-bar .tab[data-tab="subj-${status === 'draft' ? 'drafts' : status}"]`)?.classList.add('active');
  renderCourseGrid();
}

async function loadCourses() {
  const grid = document.getElementById('courseGrid');
  grid.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    const data = await apiGet('/courses/my');
    myCourses = Array.isArray(data) ? data : [];
    document.getElementById('subjCountActive').textContent = myCourses.filter(c => (c.status || 'active') === 'active').length;
    document.getElementById('subjCountArchived').textContent = myCourses.filter(c => c.status === 'archived').length;
    document.getElementById('subjCountDrafts').textContent = myCourses.filter(c => c.status === 'draft').length;
    renderCourseGrid();
  } catch(e) {
    grid.innerHTML = '<div class="empty-state">Could not load subjects.</div>';
  }
}

function renderCourseGrid() {
  const grid = document.getElementById('courseGrid');
  const levelFilter = document.getElementById('subjLevelFilter')?.value || '';
  let list = myCourses.filter(c => (c.status || 'active') === _subjTab);
  if (levelFilter) list = list.filter(c => (c.level || 'Beginner') === levelFilter);

  const createCard = `
    <div class="course-card cc-create" onclick="openCreateCourse()">
      <div class="cc-create-icon">+</div>
      <h3>Create New Subject</h3>
      <p>Start a new course, import students, and build your syllabus.</p>
    </div>`;

  if (!list.length) {
    grid.innerHTML = createCard + `<div class="empty-state">No ${_subjTab === 'draft' ? 'draft' : _subjTab} subjects.</div>`;
    return;
  }
  grid.innerHTML = list.map(c => {
    const theme = resolveSubjectTheme(c.subject);
    const bg = c.thumbnail_path || theme.img || '';
    const progress = c.avg_progress_percent != null ? Math.round(c.avg_progress_percent) : null;
    return `
    <div class="course-card" onclick="openCourseDetail(${c.id})">
      <div class="cc-photo" style="${bg ? `background-image:url('${esc(bg)}')` : ''}">
        <span class="cc-code-badge">${esc(c.course_code || c.subject || 'Subject')}</span>
        <button class="cc-setup-btn" title="Course Setup" onclick="event.stopPropagation();openCourseSetup(${c.id})"><svg class="icon-sm"><use href="#ic-settings"></use></svg></button>
      </div>
      <div class="cc-body">
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.description || 'No description')}</p>
        <div class="cc-meta">
          <span>${c.student_count || 0} Students</span>
          <span>${c.active_assignment_count || 0} Active</span>
          ${c.grading_due ? '<span class="cc-warn">Grading Due</span>' : ''}
        </div>
        ${progress !== null ? `
        <div class="cc-progress-row">
          <span>Syllabus Progress</span><span class="cc-progress-pct">${progress}%</span>
        </div>
        <div class="cc-progress-bar-wrap"><div class="cc-progress-bar" style="width:${progress}%"></div></div>` : ''}
        <div class="cc-meta" style="margin-top:8px">
          <span>${c.is_public ? 'Public' : 'Private'}</span>
          ${c.invite_code ? `<span class="cc-invite-code" title="Click to copy invite code" onclick="event.stopPropagation();copyInviteCode('${c.invite_code}')">${esc(c.invite_code)}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('') + createCard;
}

function copyInviteCode(code) {
  navigator.clipboard?.writeText(code)
    .then(() => showToast(`Invite code ${code} copied!`))
    .catch(() => showToast(`Invite code: ${code}`, 'info'));
}

async function openCourseDetail(id) {
  activeCourseId = id;
  document.getElementById('courseGrid').classList.add('hidden');
  document.querySelector('#sec-subjects .sec-header').classList.add('hidden');
  const detail = document.getElementById('courseDetail');
  detail.classList.remove('hidden');

  try {
    const c = await apiGet(`/courses/${id}`);
    _activeCourseDetail = c;
    document.getElementById('courseDetailContent').innerHTML = `
      <h2>${esc(c.title)}</h2>
      <p style="color:var(--text-sub);margin:8px 0">${esc(c.description || '')}</p>
      <div class="cc-meta">
        <span>Subject: ${esc(c.subject || '')}</span>
        <span>Grade: ${esc(c.grade_level || '')}</span>
        <span>${c.is_public ? 'Public' : 'Private'}</span>
        <span>${(c.enrollments || []).length} enrolled</span>
      </div>
    `;
    renderOverviewTab(c);

    const modules = c.modules || [];
    const ml = document.getElementById('moduleList');
    ml.innerHTML = modules.length
      ? modules.map(m => `
          <li onclick="openModuleDetail(${m.id})">
            <h4>${esc(m.title)}</h4>
            ${m.content ? `<p>${esc(m.content.length > 140 ? m.content.slice(0,140)+'…' : m.content)}</p>` : ''}
          </li>`).join('')
      : '<li style="color:var(--text-sub);font-style:italic;cursor:default">No modules yet.</li>';

    // Show enrolled students
    const enrollments = c.enrollments || [];
    document.getElementById('enrolledCount').textContent = enrollments.length;
    const engrid = document.getElementById('enrolledStudentsGrid');
    if (!enrollments.length) {
      engrid.innerHTML = '<p style="color:#aaa;font-size:13px">No students enrolled yet.</p>';
    } else {
      engrid.innerHTML = enrollments.map(e => {
        const st = e.student || {};
        const init = ((st.first_name||'?')[0] + (st.last_name||'?')[0]).toUpperCase();
        return `
          <div class="student-card">
            <div class="stud-initials">${init}</div>
            <h4>${esc(st.first_name || '')} ${esc(st.last_name || '')}</h4>
            <p>${esc(st.email || '')}</p>
            <div class="prog-bar-wrap" title="${e.progress_percent}% assignments graded">
              <div class="prog-bar" style="width:${e.progress_percent || 0}%"></div>
            </div>
            <p style="font-size:11px;color:#888;margin-top:4px">${e.progress_percent || 0}% graded</p>
            ${e.pass_status === 'passed'
              ? '<span style="font-size:11px;font-weight:600;color:#1a5c3a;background:#e8f5ee;border-radius:20px;padding:2px 8px">Passed</span>'
              : e.pass_status === 'retake'
              ? '<span style="font-size:11px;font-weight:600;color:#b45309;background:#fff3e0;border-radius:20px;padding:2px 8px">↩ Retake</span>'
              : ''}
          </div>`;
      }).join('');
    }
  } catch(e) {
    document.getElementById('courseDetailContent').innerHTML = '<p>Could not load course details.</p>';
  }
}

function closeDetail() {
  document.getElementById('courseDetail').classList.add('hidden');
  document.getElementById('courseGrid').classList.remove('hidden');
  document.querySelector('#sec-subjects .sec-header').classList.remove('hidden');
  activeCourseId = null;
  _activeCourseDetail = null;
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function renderOverviewTab(c) {
  const modules = c.modules || [];
  document.getElementById('fpane-overview').innerHTML = `
    <div class="ov-box">
      <h4>Description</h4>
      ${c.description ? formatRichText(c.description) : '<p>No description added yet.</p>'}
    </div>
    <div class="ov-box">
      <h4>Goals</h4>
      ${c.goals ? formatRichText(c.goals) : '<p>No goals added yet.</p>'}
    </div>
    <div class="ov-box">
      <h4>Modules (${modules.length})</h4>
      ${modules.length
        ? modules.map(m => `
            <div class="ov-module-link" onclick="switchFTab('modules');openModuleDetail(${m.id})">
              <span>${esc(m.title)}</span>
              <span style="color:var(--text-sub)">→</span>
            </div>`).join('')
        : '<p style="color:#aaa;font-size:13px">No modules yet.</p>'}
    </div>
  `;
}

// ── Module detail (read-only) ───────────────────────────────────────────────
function openModuleDetail(moduleId) {
  const m = (_activeCourseDetail?.modules || []).find(x => x.id === moduleId);
  if (!m) return;
  document.getElementById('mdBody').innerHTML = `
    <h2 style="font-size:17px;color:var(--text);margin-bottom:10px">${esc(m.title)}</h2>
    <div class="detail-body">${m.content ? formatRichText(m.content) : '<p>No content added yet.</p>'}</div>
  `;
  document.getElementById('modalModuleDetail').classList.remove('hidden');
}

// ── Assignment detail (read-only, incl. full question set) ─────────────────
function openAssignmentDetail(id) {
  const a = _allAsgnData.find(x => x.id == id);
  if (!a) return;
  showAssignmentDetailModal(a);
}

async function showAssignmentDetailModal(a) {
  const status = a.status || (a.is_published ? 'published' : 'draft');
  const attachments = a.attachments || [];
  const hasAttachments = attachments.length || a.attachment_url || a.attachment_path;
  document.getElementById('adBody').innerHTML = `
    <div class="detail-hero">
      <h2>${esc(a.title)}</h2>
      <div class="detail-tags">
        <span class="asgn-tag" style="${STATUS_COLORS[status] || ''}">${status}</span>
        <span class="asgn-tag type">${esc(a.assignment_type || a.type || '')}</span>
        ${a.due_date ? `<span class="asgn-tag due">Due: ${fmtDate(a.due_date)}</span>` : ''}
        <span class="asgn-tag">Max: ${a.max_score}</span>
        ${a.time_limit_minutes ? `<span class="asgn-tag">⏱ ${a.time_limit_minutes} min</span>` : ''}
        <span class="asgn-tag">${a.max_attempts || 1} attempt${(a.max_attempts||1) === 1 ? '' : 's'}</span>
        ${a.course_title ? `<span class="asgn-tag">${esc(a.course_title)}</span>` : ''}
      </div>
    </div>
    <div class="detail-body">${a.description ? formatRichText(a.description) : '<p>No description provided.</p>'}</div>
    ${hasAttachments ? `
      <div class="detail-section-title">Attachments</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        ${a.attachment_url ? `<a href="${esc(a.attachment_url)}" target="_blank" class="asgn-tag" style="background:#e8f0fe;color:#2f6df6">Link</a>` : ''}
        ${a.attachment_path ? `<a href="${r2FileUrl(a.attachment_path)}" target="_blank" class="asgn-tag" style="background:#f3e8ff;color:#6c00c9">PDF</a>` : ''}
        ${attachments.map(att => `<a href="${r2FileUrl(att.file_path)}" target="_blank" class="asgn-tag" style="background:#f3e8ff;color:#6c00c9">${fileIcon(att.filename)} ${esc(att.filename)}</a>`).join('')}
      </div>` : ''}
    <div class="detail-section-title">Questions</div>
    <div id="adQuestions"><p style="color:#aaa;font-size:13px">Loading…</p></div>
  `;
  document.getElementById('modalAssignmentDetail').classList.remove('hidden');
  try {
    const questions = await apiGet(`/assignments/${a.id}/questions`);
    document.getElementById('adQuestions').innerHTML = renderQuestionsReadOnly(questions);
  } catch (e) {
    document.getElementById('adQuestions').innerHTML = '<p style="color:#aaa;font-size:13px">No questions added yet.</p>';
  }
}

function renderQuestionsReadOnly(questions) {
  if (!Array.isArray(questions) || !questions.length) return '<p style="color:#aaa;font-size:13px">No questions added yet.</p>';
  return questions.map((q, i) => `
    <div class="qv-card">
      <div class="qv-head">
        <span class="qv-num">Q${i+1}</span>
        <span class="qv-type">${esc((q.type || '').replace('_',' '))}</span>
        <span class="qv-points">${q.points} pt${q.points === 1 ? '' : 's'}${q.required ? ' • required' : ''}</span>
      </div>
      <div class="qv-text">${esc(q.text)}</div>
      ${(q.options || []).length ? (q.options || []).map(o => `
        <div class="qv-option ${o.is_correct ? 'correct' : ''}">${o.is_correct ? '<svg class="icon-sm"><use href="#ic-check"></use></svg>' : '•'} ${esc(o.text)}${o.match_value ? ` → ${esc(o.match_value)}` : ''}</div>
      `).join('') : ''}
    </div>`).join('');
}

// ── Facilitator course tab switching ─────────────────────────────────────────
function switchFTab(tab) {
  document.querySelectorAll('.cdtab[data-ftab]').forEach(t =>
    t.classList.toggle('active', t.dataset.ftab === tab));
  document.querySelectorAll('.fpane').forEach(p =>
    p.classList.toggle('active', p.id === `fpane-${tab}`));
  if (tab === 'announcements') loadAnnouncements();
  if (tab === 'syllabus')      loadSyllabus();
  if (tab === 'groups')        loadFGroups();
  if (tab === 'materials')     loadCourseMaterials();
  if (tab === 'assignments')   loadCourseAssignments();
}

// ── Course Materials (uploaded PDFs + items attached from the Cloudflare library) ──
// ── Course-scoped Assignments tab ────────────────────────────────────────────
async function loadCourseAssignments() {
  const el = document.getElementById('courseAssignmentsList');
  if (!activeCourseId) return;
  el.innerHTML = '<p style="color:#aaa;font-size:13px">Loading…</p>';
  try {
    if (!_allAsgnData.length) _allAsgnData = await apiGet('/assignments/') || [];
    const list = _allAsgnData.filter(a => a.course_id == activeCourseId);
    el.innerHTML = list.length
      ? list.map(a => asgnCard(a, true)).join('')
      : '<p style="color:#aaa;font-size:13px">No assignments for this course yet.</p>';
  } catch (e) {
    el.innerHTML = '<p style="color:#aaa;font-size:13px">Could not load assignments.</p>';
  }
}

async function loadCourseMaterials() {
  const el = document.getElementById('fMaterialsList');
  if (!activeCourseId) return;
  el.innerHTML = '<p style="color:#aaa;font-size:13px">Loading…</p>';
  try {
    const data = await apiGet(`/resources/?course_id=${activeCourseId}`);
    const items = data?.uploaded || [];
    el.innerHTML = items.length
      ? `<div class="resource-grid">${items.map(r => `
          <div class="resource-card" id="mat-${esc(r.id.replace('db_',''))}">
            <div class="res-icon">${fileIcon(r.title)}</div>
            <div class="res-title">${esc(r.title)}</div>
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
              <button class="res-dl" onclick="openPdf('${esc(r.url)}','${esc(r.title)}')">View</button>
              <button class="res-dl danger" onclick="deleteCourseMaterial('${esc(r.id.replace('db_',''))}', this)">Remove</button>
            </div>
          </div>`).join('')}</div>`
      : '<p style="color:#aaa;font-size:13px">No materials yet — upload a PDF or attach one from the library.</p>';
  } catch (e) {
    el.innerHTML = '<p style="color:#aaa;font-size:13px">Could not load materials.</p>';
  }
}

async function uploadCourseMaterials() {
  const files = Array.from(document.getElementById('matUploadFiles').files || []);
  if (!files.length || !activeCourseId) return;
  try {
    const fd = new FormData();
    fd.append('course_id', activeCourseId);
    files.forEach(f => fd.append('files', f));
    await apiFetch('/resources/upload-many', { method: 'POST', body: fd });
    document.getElementById('matUploadFiles').value = '';
    document.getElementById('matPickedFiles').innerHTML = '';
    loadCourseMaterials();
    showToast('Materials uploaded!');
  } catch (e) { showToast('Could not upload materials.', 'error'); }
}

async function deleteCourseMaterial(resourceId, btn) {
  if (!confirm('Remove this material?')) return;
  try {
    await apiFetch(`/resources/${resourceId}`, { method: 'DELETE' });
    btn.closest('.resource-card').remove();
    showToast('Material removed.');
  } catch (e) { showToast('Could not remove material.', 'error'); }
}

// ── Attach from Cloudflare library ──
let _libraryCatalog = null;

async function openAttachLibraryModal() {
  if (!activeCourseId) return;
  document.getElementById('modalAttachLibrary').classList.remove('hidden');
  document.getElementById('libSearch').value = '';
  if (!_libraryCatalog) {
    document.getElementById('libPickerList').innerHTML = '<p style="color:#aaa;font-size:13px">Loading library…</p>';
    try {
      const data = await apiGet('/resources/');
      _libraryCatalog = [...(data.textbooks || []), ...(data.past_papers || [])].filter(r => r.source === 'library');
    } catch (e) {
      document.getElementById('libPickerList').innerHTML = '<p style="color:#aaa;font-size:13px">Could not load library.</p>';
      return;
    }
  }
  renderLibraryPicker();
}

function renderLibraryPicker() {
  const search = document.getElementById('libSearch').value.trim().toLowerCase();
  const list = (_libraryCatalog || []).filter(b =>
    !search || b.title.toLowerCase().includes(search) || (b.subject || '').toLowerCase().includes(search));
  const el = document.getElementById('libPickerList');
  if (!list.length) { el.innerHTML = '<p style="color:#aaa;font-size:13px">No matching books.</p>'; return; }
  el.innerHTML = list.slice(0, 100).map(b => `
    <div class="attach-file-row">
      <span>${esc(b.title)} <small style="color:#aaa">${esc(b.subject || '')}${b.grade_level ? ' · ' + esc(b.grade_level) : ''}</small></span>
      <button type="button" class="btn-sm" onclick="attachLibraryItem('${esc(b.file_path).replace(/'/g,"\\'")}', this)">+ Attach</button>
    </div>`).join('');
}

async function attachLibraryItem(key, btn) {
  if (!activeCourseId) return;
  btn.disabled = true; btn.textContent = 'Attaching…';
  try {
    await apiPost('/resources/library/attach', { key, course_id: activeCourseId });
    showToast('Attached to course materials!');
    btn.textContent = 'Attached';
  } catch (e) {
    btn.disabled = false; btn.textContent = '+ Attach';
    showToast('Could not attach.', 'error');
  }
}

// ── Announcements ─────────────────────────────────────────────────────────────
let _annData = [];

async function loadAnnouncements() {
  const el = document.getElementById('annList');
  if (!activeCourseId) return;
  el.innerHTML = '<p style="color:#aaa;font-size:13px">Loading…</p>';
  try {
    _annData = await apiGet(`/courses/${activeCourseId}/announcements`) || [];
    renderAnnouncements();
  } catch(e) { el.innerHTML = '<p style="color:#aaa;font-size:13px">Failed to load.</p>'; }
}

function renderAnnouncements() {
  const el = document.getElementById('annList');
  const anns = _annData || [];
  el.innerHTML = anns.length
    ? anns.map(a => `
        <div class="ann-card2">
          <div class="ann-card2-top">
            <strong style="font-size:14.5px">${esc(a.title)}</strong>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              <small style="color:#aaa;font-size:12px">${new Date(a.created_at).toLocaleDateString()}</small>
              <button class="btn-tiny danger" onclick="deleteAnn(${a.id})">Delete</button>
            </div>
          </div>
          <p class="ann-card2-body">${esc(a.content)}</p>
          <div class="ann-stats-row">
            <button class="ann-stat-chip" onclick="toggleAnnPanel(${a.id},'readers')">${a.read_count} read</button>
            <button class="ann-stat-chip" onclick="toggleAnnPanel(${a.id},'comments')">${a.comment_count} comment${a.comment_count===1?'':'s'}</button>
          </div>
          <div class="ann-names-panel" id="ann-readers-${a.id}">
            ${a.readers.length ? a.readers.map(r => esc(r.student_name)).join(', ') : 'No one has read this yet.'}
          </div>
          <div class="ann-names-panel" id="ann-comments-${a.id}">
            ${a.comments.length ? a.comments.map(c => `
              <div class="ann-comment-row"><strong>${esc(c.author_name)}:</strong> ${esc(c.content)}</div>`).join('')
              : '<div style="padding:2px 0">No comments yet.</div>'}
            <div class="ann-add-comment">
              <input type="text" id="ann-comment-input-${a.id}" placeholder="Write a comment…" onkeydown="if(event.key==='Enter')postAnnComment(${a.id})">
              <button onclick="postAnnComment(${a.id})">Send</button>
            </div>
          </div>
        </div>`).join('')
    : '<p style="color:#aaa;font-size:13px">No announcements yet.</p>';
}

function toggleAnnPanel(annId, kind) {
  const other = kind === 'readers' ? 'comments' : 'readers';
  document.getElementById(`ann-${other}-${annId}`)?.classList.remove('open');
  document.getElementById(`ann-${kind}-${annId}`)?.classList.toggle('open');
}

async function postAnnComment(annId) {
  const input = document.getElementById(`ann-comment-input-${annId}`);
  const content = (input.value || '').trim();
  if (!content) return;
  try {
    const updated = await apiPost(`/courses/${activeCourseId}/announcements/${annId}/comments`, { content });
    const idx = _annData.findIndex(a => a.id === annId);
    if (idx !== -1) _annData[idx] = updated;
    renderAnnouncements();
    document.getElementById(`ann-comments-${annId}`)?.classList.add('open');
  } catch(e) { showToast(e.message || 'Could not post comment.', 'error'); }
}

async function postAnnouncement() {
  const title   = document.getElementById('annTitle').value.trim();
  const content = document.getElementById('annContent').value.trim();
  if (!title || !content) { showToast('Title and message required.', 'error'); return; }
  try {
    await apiPost(`/courses/${activeCourseId}/announcements`, { title, content });
    document.getElementById('annTitle').value   = '';
    document.getElementById('annContent').value = '';
    showToast('Announcement posted!');
    loadAnnouncements();
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

async function deleteAnn(annId) {
  if (!confirm('Delete this announcement?')) return;
  try {
    await apiDelete(`/courses/${activeCourseId}/announcements/${annId}`);
    showToast('Deleted.'); loadAnnouncements();
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

// ── Syllabus ──────────────────────────────────────────────────────────────────
async function loadSyllabus() {
  const el = document.getElementById('sylList');
  if (!activeCourseId) return;
  el.innerHTML = '<p style="color:#aaa;font-size:13px">Loading…</p>';
  try {
    const weeks = await apiGet(`/courses/${activeCourseId}/syllabus`) || [];
    el.innerHTML = weeks.length
      ? weeks.map(w => `
          <div class="syl-week-card">
            <div class="syl-badge">Week<br>${w.week_num}<small>${(w.topics||'').split('\n').filter(Boolean).length} topics</small></div>
            <div class="syl-week-body" style="flex:1">
              <h4>${esc(w.title)}</h4>
              ${w.description ? `<p>${esc(w.description)}</p>` : ''}
              ${w.topics ? w.topics.split('\n').filter(Boolean).map(t => `<span class="syl-topic-tag">${esc(t)}</span>`).join('') : ''}
            </div>
            <button class="btn-tiny danger" style="flex-shrink:0" onclick="deleteSyllabusWeek(${w.id})">Delete</button>
          </div>`).join('')
      : '<p style="color:#aaa;font-size:13px">No syllabus weeks added yet.</p>';
  } catch(e) { el.innerHTML = '<p style="color:#aaa;font-size:13px">Failed to load.</p>'; }
}

async function addSyllabusWeek() {
  const week_num    = parseInt(document.getElementById('sylWeekNum').value);
  const title       = document.getElementById('sylTitle').value.trim();
  const description = document.getElementById('sylDesc').value.trim();
  const topics      = document.getElementById('sylTopics').value.trim();
  if (!week_num || !title) { showToast('Week number and title required.', 'error'); return; }
  try {
    await apiPost(`/courses/${activeCourseId}/syllabus`, { week_num, title, description, topics });
    document.getElementById('sylWeekNum').value = '';
    document.getElementById('sylTitle').value   = '';
    document.getElementById('sylDesc').value    = '';
    document.getElementById('sylTopics').value  = '';
    showToast('Week added!'); loadSyllabus();
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

async function deleteSyllabusWeek(weekId) {
  if (!confirm('Delete this week?')) return;
  try {
    await apiDelete(`/courses/${activeCourseId}/syllabus/${weekId}`);
    showToast('Deleted.'); loadSyllabus();
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

// ── Groups ────────────────────────────────────────────────────────────────────
async function loadFGroups() {
  const el = document.getElementById('fGroupsList');
  if (!activeCourseId) return;
  el.innerHTML = '<p style="color:#aaa;font-size:13px">Loading…</p>';
  try {
    _groupsData = await apiGet(`/courses/${activeCourseId}/groups`) || [];
    if (!_groupsData.length) { el.innerHTML = '<p style="color:#aaa;font-size:13px">No groups yet.</p>'; return; }
    el.innerHTML = _groupsData.map(g => `
      <div class="group-card">
        <div class="group-card-head">
          <div>
            <strong>${esc(g.name)}</strong>
            ${g.description ? `<p>${esc(g.description)}</p>` : ''}
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <span class="group-member-count">${g.members.length} member${g.members.length===1?'':'s'}</span>
            <button class="btn-tiny danger" onclick="deleteGroup(${g.id})">Delete</button>
          </div>
        </div>
        <div class="group-members-row">
          ${g.members.map(m => `
            <span class="member-chip">
              <span class="mc-init">${esc((m.student_name||'?').split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase())}</span>
              ${esc(m.student_name)}
              <button onclick="removeGroupMember(${g.id},${m.student_id})" title="Remove">×</button>
            </span>`).join('')}
          <button class="add-member-btn" onclick="openAddMemberModal(${g.id})">+ Add Member</button>
        </div>
      </div>`).join('');
  } catch(e) { el.innerHTML = '<p style="color:#aaa;font-size:13px">Failed to load.</p>'; }
}

async function createGroup() {
  const name = document.getElementById('groupName').value.trim();
  const description = document.getElementById('groupDesc').value.trim();
  if (!name) { showToast('Group name required.', 'error'); return; }
  try {
    await apiPost(`/courses/${activeCourseId}/groups`, { name, description });
    document.getElementById('groupName').value = '';
    document.getElementById('groupDesc').value = '';
    showToast('Group created!'); loadFGroups();
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

async function deleteGroup(groupId) {
  if (!confirm('Delete this group?')) return;
  try {
    await apiDelete(`/courses/${activeCourseId}/groups/${groupId}`);
    showToast('Group deleted.'); loadFGroups();
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

let _groupsData = [];
let _addMemberGroupId = null;

async function openAddMemberModal(groupId) {
  _addMemberGroupId = groupId;
  document.getElementById('gmSearch').value = '';
  document.getElementById('modalAddGroupMember').classList.remove('hidden');
  document.getElementById('gmList').innerHTML = '<p style="color:#aaa;font-size:13px;text-align:center;padding:12px">Loading…</p>';
  try {
    const course = await apiGet(`/courses/${activeCourseId}`);
    _gmStudents = (course.enrollments || []).map(e => e.student).filter(Boolean);
    renderAddMemberList(_gmStudents);
  } catch (e) {
    document.getElementById('gmList').innerHTML = '<p style="color:#aaa;font-size:13px;text-align:center;padding:12px">Could not load students.</p>';
  }
}

let _gmStudents = [];

function filterAddMemberList() {
  const q = document.getElementById('gmSearch').value.toLowerCase();
  renderAddMemberList(_gmStudents.filter(s =>
    (s.first_name+' '+s.last_name).toLowerCase().includes(q) || (s.email||'').toLowerCase().includes(q)));
}

function renderAddMemberList(students) {
  const el = document.getElementById('gmList');
  const group = (_groupsData || []).find(g => g.id === _addMemberGroupId);
  const memberIds = new Set((group?.members || []).map(m => m.student_id));
  if (!students.length) { el.innerHTML = '<p style="color:#aaa;font-size:13px;text-align:center;padding:12px">No students enrolled in this course yet.</p>'; return; }
  el.innerHTML = students.map(s => {
    const init = ((s.first_name||'?')[0] + (s.last_name||'?')[0]).toUpperCase();
    const inGroup = memberIds.has(s.id);
    return `
      <div class="pick-row">
        <div class="stud-initials" style="width:34px;height:34px;font-size:12px">${init}</div>
        <div style="flex:1">
          <div class="pick-row-name">${esc(s.first_name)} ${esc(s.last_name)}</div>
          <div class="pick-row-sub">${esc(s.email || '')}</div>
        </div>
        ${inGroup
          ? `<button class="btn-tiny danger" onclick="toggleGroupMember(${s.id},this,false)">− Remove</button>`
          : `<button class="btn-tiny" onclick="toggleGroupMember(${s.id},this,true)">+ Add</button>`}
      </div>`;
  }).join('');
}

async function toggleGroupMember(studentId, btn, adding) {
  btn.disabled = true;
  try {
    if (adding) {
      await apiPost(`/courses/${activeCourseId}/groups/${_addMemberGroupId}/members`, { student_id: studentId });
    } else {
      await apiDelete(`/courses/${activeCourseId}/groups/${_addMemberGroupId}/members/${studentId}`);
    }
    const groups = await apiGet(`/courses/${activeCourseId}/groups`) || [];
    _groupsData = groups;
    renderAddMemberList(_gmStudents);
    loadFGroups();
  } catch (e) {
    btn.disabled = false;
    showToast(e.message || 'Failed.', 'error');
  }
}

async function removeGroupMember(groupId, studentId) {
  try {
    await apiDelete(`/courses/${activeCourseId}/groups/${groupId}/members/${studentId}`);
    showToast('Removed.'); loadFGroups();
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

async function addModule() {
  if (!activeCourseId) return;
  const title = document.getElementById('moduleTitle').value.trim();
  const content = document.getElementById('moduleContent').value.trim();
  if (!title) { showToast('Module title required', 'error'); return; }
  try {
    await apiPost(`/courses/${activeCourseId}/modules`, { title, content });
    document.getElementById('moduleTitle').value = '';
    document.getElementById('moduleContent').value = '';
    openCourseDetail(activeCourseId);
    showToast('Module added!');
  } catch(e) { showToast('Could not add module.', 'error'); }
}

// ── Course Setup wizard ──────────────────────────────────────────────────────
function openCreateCourse() {
  _csCourseId = null;
  _csIsNewCourse = true;
  _csThumbFile = null;
  document.getElementById('csWizardTitle').textContent = 'Course Setup';
  document.getElementById('ccTitle').value = '';
  document.getElementById('ccDesc').value = '';
  document.getElementById('ccGoals').value = '';
  document.getElementById('ccSubject').value = '';
  document.getElementById('ccGrade').value = '';
  document.getElementById('ccLevel').value = 'Beginner';
  document.getElementById('ccDuration').value = '';
  document.getElementById('ccPublic').value = 'false';
  document.getElementById('ccMaterials').value = '';
  document.getElementById('ccPickedFiles').innerHTML = '';
  document.getElementById('ccThumbFile').value = '';
  document.getElementById('ccThumbPreview').innerHTML = '<span>Click to upload a cover image</span>';
  document.getElementById('ccThumbPreview').style.backgroundImage = '';
  const dl = document.getElementById('ccSubjectList');
  if (dl && typeof SUBJECT_THEME !== 'undefined') dl.innerHTML = Object.keys(SUBJECT_THEME).map(s => `<option value="${esc(s)}">`).join('');
  csLockNonBasicTabs(true);
  switchCSTab('basic');
  document.getElementById('modalCreateCourse').classList.remove('hidden');
}

async function openCourseSetup(courseId) {
  const c = myCourses.find(x => x.id === courseId) || await apiGet(`/courses/${courseId}`).catch(() => null);
  if (!c) { showToast('Could not load course.', 'error'); return; }
  _csCourseId = courseId;
  _csIsNewCourse = false;
  _csThumbFile = null;
  document.getElementById('csWizardTitle').textContent = 'Course Setup — ' + c.title;
  document.getElementById('ccTitle').value = c.title || '';
  document.getElementById('ccDesc').value = c.description || '';
  document.getElementById('ccGoals').value = c.goals || '';
  document.getElementById('ccSubject').value = c.subject || '';
  document.getElementById('ccGrade').value = c.grade_level || '';
  document.getElementById('ccLevel').value = c.level || 'Beginner';
  document.getElementById('ccDuration').value = c.duration_hours || '';
  document.getElementById('ccPublic').value = String(!!c.is_public);
  document.getElementById('ccMaterials').value = '';
  document.getElementById('ccPickedFiles').innerHTML = '';
  document.getElementById('ccThumbFile').value = '';
  const theme = resolveSubjectTheme(c.subject);
  const bg = c.thumbnail_path || theme.img || '';
  document.getElementById('ccThumbPreview').innerHTML = bg ? '' : '<span>Click to upload a cover image</span>';
  document.getElementById('ccThumbPreview').style.backgroundImage = bg ? `url('${bg}')` : '';
  const dl = document.getElementById('ccSubjectList');
  if (dl && typeof SUBJECT_THEME !== 'undefined') dl.innerHTML = Object.keys(SUBJECT_THEME).map(s => `<option value="${esc(s)}">`).join('');
  csLockNonBasicTabs(false);
  document.getElementById('csInviteCode').value = c.invite_code || '';
  document.getElementById('csTargetGrade').value = c.target_grade_percent || 80;
  document.getElementById('csArchiveBtn').textContent = c.status === 'archived' ? 'Restore Course' : 'Archive Course';
  csLoadCurriculum();
  csLoadTeam();
  csLoadMeetings();
  switchCSTab('basic');
  document.getElementById('modalCreateCourse').classList.remove('hidden');
}

function csLockNonBasicTabs(locked) {
  ['Curriculum', 'Team', 'Meetings', 'Settings'].forEach(name => {
    document.getElementById(`cs${name}Locked`).classList.toggle('hidden', !locked);
    document.getElementById(`cs${name}Body`).classList.toggle('hidden', locked);
  });
}

function switchCSTab(tab) {
  document.querySelectorAll('.cs-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.cstab === tab));
  document.querySelectorAll('.cs-pane').forEach(p => p.classList.toggle('active', p.id === `cs-${tab}`));
}

function pickCourseThumbnail(input) {
  const file = input.files?.[0];
  if (!file) return;
  _csThumbFile = file;
  const url = URL.createObjectURL(file);
  const el = document.getElementById('ccThumbPreview');
  el.style.backgroundImage = `url('${url}')`;
  el.innerHTML = '';
}

async function saveCourseSetup(status) {
  const title = document.getElementById('ccTitle').value.trim();
  const subject = document.getElementById('ccSubject').value.trim();
  if (!title) { showToast('Title required', 'error'); return; }
  if (!subject) { showToast('Category required', 'error'); return; }
  const payload = {
    title,
    description: document.getElementById('ccDesc').value.trim(),
    goals: document.getElementById('ccGoals').value.trim(),
    subject,
    grade_level: document.getElementById('ccGrade').value.trim(),
    level: document.getElementById('ccLevel').value,
    duration_hours: document.getElementById('ccDuration').value ? parseInt(document.getElementById('ccDuration').value) : null,
    is_public: document.getElementById('ccPublic').value === 'true',
    status,
  };
  try {
    let course;
    if (_csCourseId) {
      course = await apiPut(`/courses/${_csCourseId}`, payload);
    } else {
      course = await apiPost('/courses/', payload);
      _csCourseId = course.id;
    }
    const materials = Array.from(document.getElementById('ccMaterials').files || []);
    if (materials.length) {
      const fd = new FormData();
      fd.append('course_id', course.id);
      if (subject) fd.append('subject', subject);
      materials.forEach(f => fd.append('files', f));
      try { await apiFetch('/resources/upload-many', { method: 'POST', body: fd }); }
      catch (e) { showToast('Saved, but some materials failed to upload.', 'error'); }
    }
    if (_csThumbFile) {
      const fd = new FormData();
      fd.append('file', _csThumbFile);
      try { await apiFetch(`/courses/${course.id}/thumbnail`, { method: 'POST', body: fd }); }
      catch (e) { showToast('Saved, but the thumbnail failed to upload.', 'error'); }
      _csThumbFile = null;
    }
    if (_csIsNewCourse) {
      _csIsNewCourse = false;
      csLockNonBasicTabs(false);
      document.getElementById('csWizardTitle').textContent = 'Course Setup — ' + course.title;
      document.getElementById('csInviteCode').value = course.invite_code || '';
      document.getElementById('csTargetGrade').value = course.target_grade_percent || 80;
      document.getElementById('csArchiveBtn').textContent = course.status === 'archived' ? 'Restore Course' : 'Archive Course';
      csLoadCurriculum(); csLoadTeam(); csLoadMeetings();
      showToast(status === 'draft' ? 'Draft saved — continue setting up the other tabs.' : 'Course published — continue setting up the other tabs.');
      loadCourses();
    } else {
      closeModal('modalCreateCourse');
      loadCourses();
      showToast(status === 'draft' ? 'Saved as draft.' : 'Course updated.');
    }
  } catch(e) { showToast(e.message || 'Could not save course.', 'error'); }
}

// Curriculum tab — reuses the existing per-course syllabus endpoints
async function csLoadCurriculum() {
  const el = document.getElementById('csCurriculumList');
  if (!_csCourseId) return;
  el.innerHTML = '<p class="cs-loading">Loading…</p>';
  try {
    const weeks = await apiGet(`/courses/${_csCourseId}/syllabus`) || [];
    el.innerHTML = weeks.length ? weeks.map(w => `
      <div class="syl-week-card">
        <div class="syl-badge">Week<br>${w.week_num}<small>${(w.topics||'').split('\n').filter(Boolean).length} topics</small></div>
        <div class="syl-week-body" style="flex:1">
          <h4>${esc(w.title)}</h4>
          ${w.description ? `<p>${esc(w.description)}</p>` : ''}
          ${w.topics ? w.topics.split('\n').filter(Boolean).map(t => `<span class="syl-topic-tag">${esc(t)}</span>`).join('') : ''}
        </div>
        <button class="btn-tiny danger" onclick="csDeleteSyllabusWeek(${w.id})">Delete</button>
      </div>`).join('') : '<p class="cs-empty">No curriculum weeks added yet.</p>';
  } catch(e) { el.innerHTML = '<p class="cs-empty">Failed to load.</p>'; }
}

async function csAddSyllabusWeek() {
  const week_num = parseInt(document.getElementById('csWeekNum').value);
  const title = document.getElementById('csWeekTitle').value.trim();
  const description = document.getElementById('csWeekDesc').value.trim();
  const topics = document.getElementById('csWeekTopics').value.trim();
  if (!week_num || !title) { showToast('Week number and title required.', 'error'); return; }
  try {
    await apiPost(`/courses/${_csCourseId}/syllabus`, { week_num, title, description, topics });
    document.getElementById('csWeekNum').value = '';
    document.getElementById('csWeekTitle').value = '';
    document.getElementById('csWeekDesc').value = '';
    document.getElementById('csWeekTopics').value = '';
    showToast('Week added!'); csLoadCurriculum();
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

async function csDeleteSyllabusWeek(weekId) {
  if (!confirm('Delete this week?')) return;
  try {
    await apiDelete(`/courses/${_csCourseId}/syllabus/${weekId}`);
    showToast('Deleted.'); csLoadCurriculum();
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

// Instructor & Team tab
async function csLoadTeam() {
  const el = document.getElementById('csTeamList');
  if (!_csCourseId) return;
  el.innerHTML = '<p class="cs-loading">Loading…</p>';
  try {
    _csTeamMembers = await apiGet(`/courses/${_csCourseId}/team`) || [];
    el.innerHTML = _csTeamMembers.length ? _csTeamMembers.map(m => `
      <div class="cs-list-row">
        <div><strong>${esc(m.first_name)} ${esc(m.last_name)}</strong><p>${esc(m.email)} · ${m.role === 'co_facilitator' ? 'Co-Facilitator' : 'Teaching Assistant'}</p></div>
        <button class="btn-tiny danger" onclick="csRemoveTeamMember(${m.id})">Remove</button>
      </div>`).join('') : '<p class="cs-empty">No team members yet.</p>';
  } catch(e) { el.innerHTML = '<p class="cs-empty">Failed to load.</p>'; }
}

async function csSearchTeamCandidates() {
  const q = document.getElementById('csTeamSearch').value.trim();
  const el = document.getElementById('csTeamCandidates');
  if (!q) { el.innerHTML = ''; return; }
  if (!_csAllFacilitators.length) {
    _csAllFacilitators = (await apiGet('/auth/users').catch(() => [])) || [];
  }
  const already = new Set(_csTeamMembers.map(m => m.user_id));
  const matches = _csAllFacilitators.filter(u =>
    ['facilitator', 'admin'].includes(u.role) && !already.has(u.id) &&
    ((u.first_name + ' ' + u.last_name).toLowerCase().includes(q.toLowerCase()) || (u.email || '').toLowerCase().includes(q.toLowerCase()))
  );
  el.innerHTML = matches.length ? matches.map(u => `
    <div class="cs-list-row">
      <div><strong>${esc(u.first_name)} ${esc(u.last_name)}</strong><p>${esc(u.email)} · ${esc(u.role)}</p></div>
      <button class="btn-tiny" onclick="csAddTeamMember(${u.id})">+ Add</button>
    </div>`).join('') : '<p class="cs-empty">No matching facilitators found.</p>';
}

async function csAddTeamMember(userId) {
  try {
    const role = document.getElementById('csTeamRole').value;
    await apiPost(`/courses/${_csCourseId}/team`, { user_id: userId, role });
    document.getElementById('csTeamSearch').value = '';
    document.getElementById('csTeamCandidates').innerHTML = '';
    showToast('Added to team.'); csLoadTeam();
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

async function csRemoveTeamMember(memberId) {
  if (!confirm('Remove this team member?')) return;
  try {
    await apiDelete(`/courses/${_csCourseId}/team/${memberId}`);
    showToast('Removed.'); csLoadTeam();
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

// 1-on-1 Meetings tab
async function csLoadMeetings() {
  const listEl = document.getElementById('csMeetingsList');
  const selEl = document.getElementById('csMeetingStudent');
  if (!_csCourseId) return;
  listEl.innerHTML = '<p class="cs-loading">Loading…</p>';
  try {
    const c = await apiGet(`/courses/${_csCourseId}`);
    const enrollments = c.enrollments || [];
    selEl.innerHTML = '<option value="">General slot (no student)</option>' +
      enrollments.map(e => `<option value="${e.student_id}">${esc(e.student?.first_name || '')} ${esc(e.student?.last_name || '')}</option>`).join('');
    const meetings = await apiGet(`/courses/${_csCourseId}/meetings`) || [];
    const upcoming = meetings.filter(m => m.status === 'scheduled');
    listEl.innerHTML = upcoming.length ? upcoming.map(m => `
      <div class="cs-list-row">
        <div><strong>${m.student_name || 'General slot'}</strong><p>${fmtDate(m.scheduled_at)} · ${m.duration_minutes} min${m.notes ? ' · ' + esc(m.notes) : ''}</p></div>
        <button class="btn-tiny danger" onclick="csCancelMeeting(${m.id})">Cancel</button>
      </div>`).join('') : '<p class="cs-empty">No upcoming meetings scheduled.</p>';
  } catch(e) { listEl.innerHTML = '<p class="cs-empty">Failed to load.</p>'; }
}

async function csAddMeeting() {
  const student_id = document.getElementById('csMeetingStudent').value || null;
  const scheduled_at = document.getElementById('csMeetingWhen').value;
  const duration_minutes = parseInt(document.getElementById('csMeetingDuration').value) || 30;
  const notes = document.getElementById('csMeetingNotes').value.trim();
  if (!scheduled_at) { showToast('Pick a date/time.', 'error'); return; }
  try {
    await apiPost(`/courses/${_csCourseId}/meetings`, {
      student_id: student_id ? parseInt(student_id) : null, scheduled_at, duration_minutes, notes,
    });
    document.getElementById('csMeetingWhen').value = '';
    document.getElementById('csMeetingNotes').value = '';
    showToast('Meeting scheduled!'); csLoadMeetings();
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

async function csCancelMeeting(meetingId) {
  if (!confirm('Cancel this meeting?')) return;
  try {
    await apiDelete(`/courses/${_csCourseId}/meetings/${meetingId}`);
    showToast('Meeting cancelled.'); csLoadMeetings();
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

// Settings tab
async function csRegenerateInvite() {
  try {
    const c = await apiPost(`/courses/${_csCourseId}/invite/regenerate`, {});
    document.getElementById('csInviteCode').value = c.invite_code || '';
    showToast('Invite code regenerated.');
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

async function csSaveTarget() {
  const target_grade_percent = parseInt(document.getElementById('csTargetGrade').value) || 80;
  try {
    await apiPut(`/courses/${_csCourseId}`, { target_grade_percent });
    showToast('Target grade saved.');
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

async function csToggleArchive() {
  const btn = document.getElementById('csArchiveBtn');
  const archiving = btn.textContent.includes('Archive');
  if (!confirm(archiving ? 'Archive this course? It will move out of your active list.' : 'Restore this course to Active?')) return;
  try {
    const c = await apiPut(`/courses/${_csCourseId}`, { status: archiving ? 'archived' : 'active' });
    btn.textContent = c.status === 'archived' ? 'Restore Course' : 'Archive Course';
    showToast(archiving ? 'Course archived.' : 'Course restored.');
    loadCourses();
  } catch(e) { showToast(e.message || 'Failed.', 'error'); }
}

// ---- ASSIGNMENTS ----
let _asgnSubsById = {};   // assignment id -> submissions array (fetched once per load)
let _asgnTab = 'all';
let _asgnPageNum = { all: 1, drafts: 1, archived: 1 };
const ASGN_PAGE_SIZE = 10;

async function loadAssignments() {
  const gradeEl = document.getElementById('gradingList');
  gradeEl.innerHTML = '<div class="empty-state">Loading…</div>';
  ['All', 'Drafts', 'Archived'].forEach(t =>
    document.getElementById(`asgnTable${t}`).innerHTML = '<tr><td colspan="7" class="empty">Loading…</td></tr>');

  if (myCourses.length === 0) {
    try { myCourses = await apiGet('/courses/my'); } catch(e) {}
  }
  const sel = document.getElementById('caCourse');
  sel.innerHTML = '<option value="">Select subject…</option>' +
    (Array.isArray(myCourses) ? myCourses : []).map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join('');

  try {
    const data = await apiGet('/assignments/');
    const list = Array.isArray(data) ? data : [];
    _allAsgnData = list;

    _asgnSubsById = {};
    let gradingHtml = '', gradingCount = 0;
    for (const a of list) {
      try {
        const subs = await apiGet(`/assignments/${a.id}/submissions`);
        _asgnSubsById[a.id] = Array.isArray(subs) ? subs : [];
        const ungraded = _asgnSubsById[a.id].filter(s => s.grade === null || s.grade === undefined);
        ungraded.forEach(s => { gradingHtml += submissionCard(s, a); gradingCount++; });
      } catch(e) { _asgnSubsById[a.id] = []; }
    }
    gradeEl.innerHTML = gradingHtml || '<div class="empty-state">No ungraded submissions.</div>';

    const drafts = list.filter(a => (a.status || 'draft') === 'draft');
    const archived = list.filter(a => a.status === 'closed');
    const active = list.filter(a => !['draft', 'closed'].includes(a.status || 'draft'));

    document.getElementById('asgnCountAll').textContent = list.length;
    document.getElementById('asgnCountGrade').textContent = gradingCount;
    document.getElementById('asgnCountDrafts').textContent = drafts.length;
    document.getElementById('asgnCountArchived').textContent = archived.length;

    _asgnLists = { all: list, drafts, archived };
    renderAsgnTable('all');
    renderAsgnTable('drafts');
    renderAsgnTable('archived');
  } catch(e) {
    document.getElementById('asgnTableAll').innerHTML = '<tr><td colspan="7" class="empty">Could not load assignments.</td></tr>';
  }
}

let _asgnLists = { all: [], drafts: [], archived: [] };

function setAsgnTab(tab) {
  _asgnTab = tab;
  document.querySelectorAll('#sec-assignments .tab-bar .tab').forEach(b => b.classList.remove('active'));
  document.querySelector(`#sec-assignments .tab-bar .tab[data-tab="asgn-${tab === 'grade' ? 'grade' : tab}"]`)?.classList.add('active');
  document.querySelectorAll('#sec-assignments .tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`asgn-${tab}`).classList.add('active');
}

function _asgnStatusPill(a) {
  const subs = _asgnSubsById[a.id] || [];
  const status = a.status || 'draft';
  if (status === 'draft') return { cls: 'draft', label: 'Draft' };
  if (status === 'closed') return { cls: 'archived', label: 'Archived' };
  const ungraded = subs.filter(s => s.grade === null || s.grade === undefined).length;
  if (ungraded > 0) return { cls: 'needs-grading', label: `Needs Grading (${ungraded})` };
  if (subs.length > 0) return { cls: 'graded', label: 'Graded' };
  if (a.due_date && new Date(a.due_date) < new Date()) return { cls: 'past-due', label: 'Past Due' };
  return { cls: 'active', label: 'Active' };
}

function renderAsgnTable(tab) {
  const tbodyId = { all: 'asgnTableAll', drafts: 'asgnTableDrafts', archived: 'asgnTableArchived' }[tab];
  const pageElId = { all: 'asgnPageAll', drafts: 'asgnPageDrafts', archived: 'asgnPageArchived' }[tab];
  const tbody = document.getElementById(tbodyId);
  const list = _asgnLists[tab] || [];
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">No ${tab === 'all' ? '' : tab} assignments.</td></tr>`;
    document.getElementById(pageElId).innerHTML = '';
    return;
  }
  const page = _asgnPageNum[tab] || 1;
  const totalPages = Math.max(1, Math.ceil(list.length / ASGN_PAGE_SIZE));
  const start = (page - 1) * ASGN_PAGE_SIZE;
  const pageItems = list.slice(start, start + ASGN_PAGE_SIZE);

  tbody.innerHTML = pageItems.map(a => {
    const subs = _asgnSubsById[a.id] || [];
    const course = myCourses.find(c => c.id === a.course_id);
    const enrolled = course?.student_count || 0;
    const pct = enrolled ? Math.round(subs.length / enrolled * 100) : 0;
    const pill = _asgnStatusPill(a);
    return `
      <tr>
        <td class="asgn-check-col"><input type="checkbox" class="asgn-row-check"></td>
        <td><span class="cc-badge">${esc(a.course_title || course?.title || '')}</span></td>
        <td><strong>${esc(a.title)}</strong></td>
        <td class="${a.due_date && new Date(a.due_date) < new Date() && pill.cls !== 'graded' ? 'asgn-overdue' : ''}">${a.due_date ? fmtDate(a.due_date) : '—'}</td>
        <td>
          <div class="asgn-subs-cell">
            <span>${subs.length}/${enrolled}</span>
            <div class="asgn-subs-bar-wrap"><div class="asgn-subs-bar ${pill.cls}" style="width:${pct}%"></div></div>
          </div>
        </td>
        <td><span class="status-pill ${pill.cls}">${pill.label}</span></td>
        <td class="asgn-actions-col">
          <button class="btn-icon" title="View Submissions" onclick="viewSubmissions(${a.id}, '${esc(a.title)}')"><svg class="icon-sm"><use href="#ic-eye"></use></svg></button>
          <button class="btn-icon" title="Edit" onclick="openEditAssignment(${a.id})"><svg class="icon-sm"><use href="#ic-edit"></use></svg></button>
        </td>
      </tr>`;
  }).join('');

  document.getElementById(pageElId).innerHTML = totalPages > 1 ? `
    <button class="pg-btn" ${page <= 1 ? 'disabled' : ''} onclick="asgnGoToPage('${tab}',${page - 1})">‹</button>
    ${Array.from({length: totalPages}, (_, i) => i + 1).map(n =>
      `<button class="pg-btn ${n === page ? 'active' : ''}" onclick="asgnGoToPage('${tab}',${n})">${n}</button>`).join('')}
    <button class="pg-btn" ${page >= totalPages ? 'disabled' : ''} onclick="asgnGoToPage('${tab}',${page + 1})">›</button>
  ` : '';
}

function asgnGoToPage(tab, n) {
  _asgnPageNum[tab] = n;
  renderAsgnTable(tab);
}

function toggleAllAsgnChecks(headerCheckbox) {
  headerCheckbox.closest('table').querySelectorAll('.asgn-row-check').forEach(cb => cb.checked = headerCheckbox.checked);
}

// Assignment attachments / submissions / answer files are R2 keys now.
// r2FileUrl embeds the JWT for plain <a href> use (which can't set an
// Authorization header); r2ServeUrl is token-free for passing to openPdf(),
// which already appends the token itself.
function r2ServeUrl(key) {
  return `/api/resources/serve?key=${encodeURIComponent(key)}`;
}
function r2FileUrl(key) {
  return `${r2ServeUrl(key)}&token=${encodeURIComponent(getToken())}`;
}

function fileIcon(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return '<svg class="icon-sm"><use href="#ic-file"></use></svg>';
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return '<svg class="icon-sm"><use href="#ic-image"></use></svg>';
  if (['doc','docx'].includes(ext)) return '<svg class="icon-sm"><use href="#ic-file"></use></svg>';
  if (['ppt','pptx'].includes(ext)) return '<svg class="icon-sm"><use href="#ic-file"></use></svg>';
  if (['xls','xlsx'].includes(ext)) return '<svg class="icon-sm"><use href="#ic-file"></use></svg>';
  return '<svg class="icon-sm"><use href="#ic-link"></use></svg>';
}

const STATUS_COLORS = {
  draft: 'background:#f4f4f4;color:#888', published: 'background:#e8f5ee;color:#1a5c3a', closed: 'background:#fde8e8;color:#a12b2b',
};

function asgnCard(a, showSubs) {
  const attachments = a.attachments || [];
  const status = a.status || (a.is_published ? 'published' : 'draft');
  return `
    <div class="asgn-card" onclick="openAssignmentDetail(${a.id})">
      <div class="asgn-left">
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.description || '')}</p>
        <div class="asgn-meta">
          <span class="asgn-tag" style="${STATUS_COLORS[status] || ''}">${status}</span>
          <span class="asgn-tag type">${esc(a.assignment_type || a.type || '')}</span>
          ${a.question_count ? `<span class="asgn-tag">${a.question_count} question${a.question_count === 1 ? '' : 's'}</span>` : ''}
          ${a.due_date ? `<span class="asgn-tag due">Due: ${fmtDate(a.due_date)}</span>` : ''}
          <span class="asgn-tag">Max: ${a.max_score}</span>
          ${a.course_title ? `<span class="asgn-tag">${esc(a.course_title)}</span>` : ''}
          ${a.attachment_url ? `<a href="${esc(a.attachment_url)}" target="_blank" onclick="event.stopPropagation()" class="asgn-tag" style="background:#e8f0fe;color:#2f6df6">Link</a>` : ''}
          ${a.attachment_path ? `<a href="${r2FileUrl(a.attachment_path)}" target="_blank" onclick="event.stopPropagation()" class="asgn-tag" style="background:#f3e8ff;color:#6c00c9">PDF</a>` : ''}
          ${attachments.map(att => `<a href="${r2FileUrl(att.file_path)}" target="_blank" onclick="event.stopPropagation()" class="asgn-tag" style="background:#f3e8ff;color:#6c00c9">${fileIcon(att.filename)} ${esc(att.filename)}</a>`).join('')}
        </div>
      </div>
      <div class="asgn-right">
        ${showSubs ? `<button class="btn-sm" onclick="event.stopPropagation();viewSubmissions(${a.id}, '${esc(a.title)}')">Submissions</button>` : ''}
        <button class="btn-sm btn-outline" onclick="event.stopPropagation();openEditAssignment(${a.id})">Edit</button>
      </div>
    </div>`;
}

// Preview list of files chosen in a <input type="file" multiple> before submit
function renderPickedFiles(inputId, listId) {
  const files = Array.from(document.getElementById(inputId).files || []);
  document.getElementById(listId).innerHTML = files.map(f =>
    `<div class="picked-file-row"><span>${fileIcon(f.name)} ${esc(f.name)}</span></div>`
  ).join('');
}

function updateFileName(inputId, nameId) {
  const files = Array.from(document.getElementById(inputId).files || []);
  document.getElementById(nameId).textContent = files.length ? files.map(f => f.name).join(', ') : 'No file chosen';
}

let _createForCourseId = null;

async function openCreateAssignment() {
  _createForCourseId = null;
  if (!Array.isArray(myCourses) || myCourses.length === 0) {
    try { myCourses = await apiGet('/courses/my') || []; } catch(e) {}
  }
  const sel = document.getElementById('caCourse');
  sel.innerHTML = '<option value="">Select subject…</option>' +
    (Array.isArray(myCourses) ? myCourses : []).map(c =>
      `<option value="${c.id}">${esc(c.title)}</option>`).join('');
  document.getElementById('modalCreateAssignment').classList.remove('hidden');
}

// Opened from the "Assignments" tab inside a specific course's detail view
async function openCreateAssignmentForCourse() {
  await openCreateAssignment();
  if (activeCourseId) {
    document.getElementById('caCourse').value = activeCourseId;
    _createForCourseId = activeCourseId;
  }
}

async function submitCreateAssignment() {
  const title      = document.getElementById('caTitle').value.trim();
  const desc       = document.getElementById('caDesc').value.trim();
  const course     = document.getElementById('caCourse').value;
  const type       = document.getElementById('caType').value;
  const due        = document.getElementById('caDue').value;
  const score      = parseInt(document.getElementById('caScore').value) || 100;
  const status     = document.getElementById('caStatus').value;
  const attachUrl  = document.getElementById('caAttachUrl').value.trim();
  const attachFiles = Array.from(document.getElementById('caAttachFiles').files || []);
  if (!title || !course) { showToast('Title and subject required', 'error'); return; }
  try {
    const fd = new FormData();
    fd.append('title', title);
    if (desc)     fd.append('description', desc);
    fd.append('course_id', course);
    fd.append('assignment_type', type);
    if (due)      fd.append('due_date', new Date(due).toISOString());
    fd.append('max_score', score);
    fd.append('status', status);
    if (attachUrl) fd.append('attachment_url', attachUrl);
    attachFiles.forEach(f => fd.append('attachment_files', f));
    const created = await apiFetch('/assignments/', { method: 'POST', body: fd });
    closeModal('modalCreateAssignment');
    document.getElementById('caAttachFiles').value = '';
    document.getElementById('caPickedFiles').innerHTML = '';
    document.getElementById('caStatus').value = 'draft';
    loadAssignments();
    if (_createForCourseId) loadCourseAssignments();
    showToast(status === 'published' ? 'Assignment created and students notified!' : 'Assignment created as draft.');
    // Jump straight into the editor so the facilitator can add questions right away
    if (created && created.id) {
      _allAsgnData = [...(_allAsgnData || []), created];
      openEditAssignment(created.id);
    }
  } catch(e) { showToast('Could not create assignment.', 'error'); }
}

let _allAsgnData = [];

async function openEditAssignment(id) {
  const a = _allAsgnData.find(x => x.id == id);
  if (!a) { showToast('Assignment not found', 'error'); return; }
  document.getElementById('editAsgnId').value    = a.id;
  document.getElementById('editTitle').value      = a.title || '';
  document.getElementById('editDesc').value       = a.description || '';
  document.getElementById('editType').value       = a.assignment_type || a.type || 'homework';
  document.getElementById('editScore').value      = a.max_score || 100;
  document.getElementById('editStatus').value     = a.status || (a.is_published ? 'published' : 'draft');
  document.getElementById('editTimeLimit').value  = a.time_limit_minutes || '';
  document.getElementById('editMaxAttempts').value = a.max_attempts || 1;
  document.getElementById('editRandomizeQ').checked = !!a.randomize_questions;
  document.getElementById('editRandomizeC').checked = !!a.randomize_choices;
  document.getElementById('editAttachUrl').value  = a.attachment_url || '';
  document.getElementById('editAttachFiles').value = '';
  document.getElementById('editPickedFiles').innerHTML = '';
  renderCurrentAttachments(a);
  if (a.due_date) {
    const d = new Date(a.due_date);
    if (!isNaN(d)) document.getElementById('editDue').value = d.toISOString().slice(0,16);
  } else {
    document.getElementById('editDue').value = '';
  }
  if (a.available_from) {
    const d = new Date(a.available_from);
    if (!isNaN(d)) document.getElementById('editAvailFrom').value = d.toISOString().slice(0,16);
  } else {
    document.getElementById('editAvailFrom').value = '';
  }
  document.getElementById('modalEditAssignment').classList.remove('hidden');

  _editingQuestions = [];
  renderQuestionBuilder();
  try {
    const questions = await apiGet(`/assignments/${id}/questions`);
    _editingQuestions = Array.isArray(questions) ? questions : [];
  } catch (e) { /* new assignment with no questions yet, or fetch failed — start empty */ }
  renderQuestionBuilder();
}

function renderCurrentAttachments(a) {
  const curEl = document.getElementById('editCurrentAttach');
  const rows = [];
  if (a.attachment_path) {
    rows.push(`<div class="attach-file-row"><a href="${r2FileUrl(a.attachment_path)}" target="_blank">Legacy PDF attachment</a></div>`);
  }
  if (a.attachment_url) {
    rows.push(`<div class="attach-file-row"><a href="${esc(a.attachment_url)}" target="_blank">${esc(a.attachment_url)}</a></div>`);
  }
  (a.attachments || []).forEach(att => {
    rows.push(`<div class="attach-file-row">
      <a href="${r2FileUrl(att.file_path)}" target="_blank">${fileIcon(att.filename)} ${esc(att.filename)}</a>
      <button type="button" class="attach-remove-btn" onclick="deleteAssignmentAttachment(${a.id}, ${att.id}, this)" title="Remove"><svg class="icon-sm"><use href="#ic-close"></use></svg></button>
    </div>`);
  });
  curEl.innerHTML = rows.length ? rows.join('') : '<span style="color:#aaa">No current attachments</span>';
}

async function deleteAssignmentAttachment(assignmentId, attachmentId, btn) {
  if (!confirm('Remove this attachment?')) return;
  try {
    await apiFetch(`/assignments/${assignmentId}/attachments/${attachmentId}`, { method: 'DELETE' });
    btn.closest('.attach-file-row').remove();
    const a = _allAsgnData.find(x => x.id == assignmentId);
    if (a) a.attachments = (a.attachments || []).filter(att => att.id !== attachmentId);
    showToast('Attachment removed.');
  } catch (e) { showToast('Could not remove attachment.', 'error'); }
}

async function submitEditAssignment() {
  const id          = document.getElementById('editAsgnId').value;
  const title       = document.getElementById('editTitle').value.trim();
  const desc        = document.getElementById('editDesc').value.trim();
  const type        = document.getElementById('editType').value;
  const due         = document.getElementById('editDue').value;
  const score       = parseFloat(document.getElementById('editScore').value);
  const status      = document.getElementById('editStatus').value;
  const timeLimit   = document.getElementById('editTimeLimit').value;
  const maxAttempts = parseInt(document.getElementById('editMaxAttempts').value) || 1;
  const availFrom   = document.getElementById('editAvailFrom').value;
  const randomizeQ  = document.getElementById('editRandomizeQ').checked;
  const randomizeC  = document.getElementById('editRandomizeC').checked;
  const attachUrl   = document.getElementById('editAttachUrl').value.trim();
  const attachFiles = Array.from(document.getElementById('editAttachFiles').files || []);
  if (!title) { showToast('Title required', 'error'); return; }

  const questionsError = validateQuestionBuilder();
  if (questionsError) { showToast(questionsError, 'error'); return; }

  try {
    const fd = new FormData();
    fd.append('title', title);
    if (desc)     fd.append('description', desc);
    fd.append('assignment_type', type);
    if (due)      fd.append('due_date', new Date(due).toISOString());
    fd.append('max_score', score);
    fd.append('status', status);
    fd.append('max_attempts', maxAttempts);
    fd.append('randomize_questions', randomizeQ);
    fd.append('randomize_choices', randomizeC);
    if (timeLimit)  fd.append('time_limit_minutes', timeLimit);
    if (availFrom)  fd.append('available_from', new Date(availFrom).toISOString());
    if (attachUrl) fd.append('attachment_url', attachUrl);
    attachFiles.forEach(f => fd.append('attachment_files', f));
    await apiFetch(`/assignments/${id}`, { method: 'PUT', body: fd });
    await apiFetch(`/assignments/${id}/questions`, {
      method: 'PUT',
      body: JSON.stringify({ questions: _editingQuestions }),
      headers: { 'Content-Type': 'application/json' },
    });
    closeModal('modalEditAssignment');
    loadAssignments();
    if (activeCourseId) loadCourseAssignments();
    showToast('Assignment updated!');
  } catch(e) { showToast('Could not update assignment.', 'error'); }
}

// ── Question builder ─────────────────────────────────────────────────────────
// _editingQuestions is the in-memory draft; text-field edits (oninput) update it
// silently without re-rendering, so the user never loses cursor focus mid-type.
// Structural changes (add/remove/reorder/type-switch) call renderQuestionBuilder().
let _editingQuestions = [];

const QUESTION_TYPE_LABELS = {
  short_answer: 'Short Answer', long_answer: 'Long Answer / Essay',
  multiple_choice: 'Multiple Choice', multiple_select: 'Multiple Select',
  true_false: 'True / False', dropdown: 'Dropdown', matching: 'Matching',
  file_upload: 'File Upload',
};
const OPTION_TYPES = new Set(['multiple_choice', 'multiple_select', 'true_false', 'dropdown']);

function addBuilderQuestion() {
  _editingQuestions.push({
    text: '', type: 'short_answer', points: 1, required: true,
    order_num: _editingQuestions.length, options: [],
  });
  renderQuestionBuilder();
}

function qbUpdateField(qi, field, value) {
  const q = _editingQuestions[qi];
  if (!q) return;
  if (field === 'type') {
    q.type = value;
    if (OPTION_TYPES.has(value) && value !== 'true_false' && q.options.length === 0) {
      q.options = [{ text: '', is_correct: false, order_num: 0 }, { text: '', is_correct: false, order_num: 1 }];
    } else if (value === 'true_false') {
      q.options = [{ text: 'True', is_correct: true, order_num: 0 }, { text: 'False', is_correct: false, order_num: 1 }];
    } else if (value === 'matching' && q.options.length === 0) {
      q.options = [{ text: '', match_value: '', order_num: 0 }, { text: '', match_value: '', order_num: 1 }];
    }
    renderQuestionBuilder();
    return;
  }
  if (field === 'points') { q.points = parseFloat(value) || 0; return; }
  q[field] = value;
}

function qbAddOption(qi) {
  const q = _editingQuestions[qi];
  q.options.push(q.type === 'matching'
    ? { text: '', match_value: '', order_num: q.options.length }
    : { text: '', is_correct: false, order_num: q.options.length });
  renderQuestionBuilder();
}

function qbRemoveOption(qi, oi) {
  _editingQuestions[qi].options.splice(oi, 1);
  renderQuestionBuilder();
}

function qbUpdateOptionText(qi, oi, field, value) {
  _editingQuestions[qi].options[oi][field] = value;
}

function qbSetCorrectSingle(qi, oi) {
  _editingQuestions[qi].options.forEach((o, i) => { o.is_correct = i === oi; });
}

function qbToggleCorrectMulti(qi, oi, checked) {
  _editingQuestions[qi].options[oi].is_correct = checked;
}

function qbMoveQuestion(qi, dir) {
  const newIdx = qi + dir;
  if (newIdx < 0 || newIdx >= _editingQuestions.length) return;
  const [q] = _editingQuestions.splice(qi, 1);
  _editingQuestions.splice(newIdx, 0, q);
  _editingQuestions.forEach((q, i) => { q.order_num = i; });
  renderQuestionBuilder();
}

function qbDuplicateQuestion(qi) {
  const q = _editingQuestions[qi];
  const copy = JSON.parse(JSON.stringify(q));
  delete copy.id;
  copy.options.forEach(o => delete o.id);
  _editingQuestions.splice(qi + 1, 0, copy);
  _editingQuestions.forEach((q, i) => { q.order_num = i; });
  renderQuestionBuilder();
}

function qbDeleteQuestion(qi) {
  if (!confirm('Delete this question? This cannot be undone once you save.')) return;
  _editingQuestions.splice(qi, 1);
  _editingQuestions.forEach((q, i) => { q.order_num = i; });
  renderQuestionBuilder();
}

function validateQuestionBuilder() {
  for (let qi = 0; qi < _editingQuestions.length; qi++) {
    const q = _editingQuestions[qi];
    if (!q.text || !q.text.trim()) return `Question ${qi + 1} needs question text.`;
    if (OPTION_TYPES.has(q.type)) {
      if (q.options.length < 2) return `Question ${qi + 1} needs at least 2 options.`;
      if (!q.options.some(o => o.is_correct)) return `Question ${qi + 1}: mark a correct answer.`;
      if (q.options.some(o => !o.text || !o.text.trim())) return `Question ${qi + 1} has an empty option.`;
    }
    if (q.type === 'matching') {
      if (q.options.length < 2) return `Question ${qi + 1} needs at least 2 matching pairs.`;
      if (q.options.some(o => !o.text?.trim() || !o.match_value?.trim())) return `Question ${qi + 1} has an incomplete matching pair.`;
    }
  }
  return null;
}

function renderQuestionBuilder() {
  const el = document.getElementById('questionBuilderList');
  const emptyNote = document.getElementById('qbEmptyNote');
  const totalEl = document.getElementById('qbTotalPoints');
  if (!el) return;
  emptyNote.style.display = _editingQuestions.length ? 'none' : 'block';
  const total = _editingQuestions.reduce((sum, q) => sum + (parseFloat(q.points) || 0), 0);
  totalEl.textContent = _editingQuestions.length ? `(${total} pts total)` : '';

  el.innerHTML = _editingQuestions.map((q, qi) => `
    <div class="qb-card">
      <div class="qb-card-head">
        <span class="qb-num">Q${qi + 1}</span>
        <select onchange="qbUpdateField(${qi},'type',this.value)">
          ${Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) =>
            `<option value="${v}" ${q.type === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <input type="number" min="0" step="0.5" value="${q.points}" title="Points" oninput="qbUpdateField(${qi},'points',this.value)">
        <div class="qb-card-actions">
          <button type="button" class="qb-icon-btn" onclick="qbMoveQuestion(${qi},-1)" title="Move up" ${qi === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="qb-icon-btn" onclick="qbMoveQuestion(${qi},1)" title="Move down" ${qi === _editingQuestions.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" class="qb-icon-btn" onclick="qbDuplicateQuestion(${qi})" title="Duplicate">⧉</button>
          <button type="button" class="qb-icon-btn danger" onclick="qbDeleteQuestion(${qi})" title="Delete"><svg class="icon-sm"><use href="#ic-trash"></use></svg></button>
        </div>
      </div>
      <textarea class="qb-text" rows="2" placeholder="Question text…" oninput="qbUpdateField(${qi},'text',this.value)">${esc(q.text)}</textarea>
      ${_qbOptionsHtml(q, qi)}
      <div class="qb-required-row">
        <label><input type="checkbox" ${q.required ? 'checked' : ''} onchange="qbUpdateField(${qi},'required',this.checked)"> Required</label>
      </div>
    </div>`).join('');
}

function _qbOptionsHtml(q, qi) {
  if (q.type === 'short_answer' || q.type === 'long_answer') {
    return `<p style="color:#aaa;font-size:12px;margin-bottom:4px">Students will type a ${q.type === 'short_answer' ? 'short' : 'long'} text answer. This is graded manually.</p>`;
  }
  if (q.type === 'file_upload') {
    return `<p style="color:#aaa;font-size:12px;margin-bottom:4px">Students will upload a file (PDF/image/document). Graded manually.</p>`;
  }
  if (q.type === 'matching') {
    const rows = q.options.map((o, oi) => `
      <div class="qb-option-row">
        <input type="text" placeholder="Item" value="${esc(o.text || '')}" oninput="qbUpdateOptionText(${qi},${oi},'text',this.value)">
        <span class="qb-match-arrow">→</span>
        <input type="text" placeholder="Correct match" value="${esc(o.match_value || '')}" oninput="qbUpdateOptionText(${qi},${oi},'match_value',this.value)">
        <button type="button" class="qb-icon-btn danger" onclick="qbRemoveOption(${qi},${oi})" title="Remove pair"><svg class="icon-sm"><use href="#ic-close"></use></svg></button>
      </div>`).join('');
    return rows + `<button type="button" class="btn-sm btn-outline" onclick="qbAddOption(${qi})">+ Add Pair</button>`;
  }
  // multiple_choice / multiple_select / dropdown / true_false
  const isMulti = q.type === 'multiple_select';
  const isFixed = q.type === 'true_false';
  const rows = q.options.map((o, oi) => `
    <div class="qb-option-row">
      <input type="${isMulti ? 'checkbox' : 'radio'}" name="qb-correct-${qi}" ${o.is_correct ? 'checked' : ''}
        onchange="${isMulti ? `qbToggleCorrectMulti(${qi},${oi},this.checked)` : `qbSetCorrectSingle(${qi},${oi})`}">
      <input type="text" placeholder="Option ${oi + 1}" value="${esc(o.text || '')}"
        oninput="qbUpdateOptionText(${qi},${oi},'text',this.value)" ${isFixed ? 'readonly' : ''}>
      ${isFixed ? '' : `<button type="button" class="qb-icon-btn danger" onclick="qbRemoveOption(${qi},${oi})" title="Remove option"><svg class="icon-sm"><use href="#ic-close"></use></svg></button>`}
    </div>`).join('');
  return rows + (isFixed ? '' : `<button type="button" class="btn-sm btn-outline" onclick="qbAddOption(${qi})">+ Add Option</button>`);
}

let _viewingSubmissionsFor = null;

async function viewSubmissions(asgnId, title) {
  _viewingSubmissionsFor = { asgnId, title };
  document.getElementById('modalSubmissions').classList.remove('hidden');
  document.getElementById('submissionsTitle').textContent = `Submissions – ${title}`;
  const body = document.getElementById('submissionsBody');
  body.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    const subs = await apiGet(`/assignments/${asgnId}/submissions`);
    if (!Array.isArray(subs) || subs.length === 0) {
      body.innerHTML = '<div class="empty-state">No submissions yet.</div>';
      return;
    }
    // get max_score for the assignment
    const asgn = (await apiGet('/assignments/').catch(() => null));
    const asgnData = Array.isArray(asgn) ? asgn.find(a => a.id == asgnId) : null;
    const maxScore = asgnData?.max_score || 100;
    body.innerHTML = subs.map(s => submissionCard(s, { id: asgnId, title, max_score: maxScore })).join('');
  } catch(e) { body.innerHTML = '<div class="empty-state">Could not load submissions.</div>'; }
}

// subId → {submission, assignment} — lets openGradeModal(subId) show full grading
// context (assignment instructions, per-question rubric, the actual answer) without
// cramming complex objects into onclick attributes.
let _gradeContext = {};

function submissionCard(s, asgn) {
  _gradeContext[s.id] = { submission: s, assignment: asgn };
  const student = s.student_name || `Student #${s.student_id}`;
  let preview = '';
  if (s.submission_type === 'link' && s.content) {
    preview = `<a href="${esc(s.content)}" target="_blank" onclick="event.stopPropagation()" class="sub-link-btn">Open Link / Drive</a>`;
  } else if ((s.submission_type === 'pdf' || s.submission_type === 'file') && s.file_path) {
    preview = `<button class="sub-link-btn" onclick="event.stopPropagation();openPdf('${r2ServeUrl(s.file_path)}','Submission – ${esc(student)}')">${fileIcon(s.file_path)} View File</button>`;
  } else if (s.content) {
    preview = `<p class="sub-text-preview">${esc(s.content)}</p>`;
  }
  const answers = s.answers || [];
  return `
    <div class="asgn-card sub-card-clickable" style="margin-bottom:10px;flex-direction:column;align-items:stretch" onclick="openGradeModal(${s.id})">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="asgn-left">
          <h3>${esc(student)} ${s.attempt_number > 1 ? `<small style="color:#aaa;font-weight:normal">(attempt ${s.attempt_number})</small>` : ''}</h3>
          ${asgn.title ? `<p style="font-size:12px;color:var(--text-sub);margin-top:2px">${esc(asgn.title)}</p>` : ''}
          ${preview}
          <p style="font-size:12px;color:var(--text-sub);margin-top:4px">Submitted: ${fmtDate(s.submitted_at)}</p>
          ${s.grade !== null && s.grade !== undefined
            ? `<p style="color:var(--success);font-weight:600;margin-top:4px">Grade: ${s.grade} / ${asgn.max_score || 100}</p>`
            : '<p style="color:var(--warning);font-size:12px;margin-top:4px">Not graded yet</p>'}
          ${s.feedback ? `<p style="font-size:12px;margin-top:3px;font-style:italic">${esc(s.feedback)}</p>` : ''}
        </div>
        <div class="asgn-right">
          <button class="btn-sm" onclick="event.stopPropagation();openGradeModal(${s.id})">
            ${s.grade !== null && s.grade !== undefined ? 'Re-grade' : 'Grade'}
          </button>
        </div>
      </div>
      ${answers.length ? `<div style="margin-top:10px;border-top:1px solid #eee;padding-top:10px" onclick="event.stopPropagation()">${answers.map(a => answerReviewRow(a)).join('')}</div>` : ''}
    </div>`;
}

function answerReviewRow(a) {
  const objective = a.is_correct !== null && a.is_correct !== undefined;
  const badge = objective
    ? (a.is_correct
        ? `<span style="color:#1a8a5a">${a.points_awarded}/${a.question_points}</span>`
        : `<span style="color:#c0392b">${a.points_awarded ?? 0}/${a.question_points}</span>`)
    : (a.points_awarded !== null && a.points_awarded !== undefined
        ? `<span style="color:#1a8a5a">${a.points_awarded}/${a.question_points}</span>`
        : `<span style="color:#c47f00">Needs grading</span>`);

  let answerHtml = '';
  if (a.answer_text) answerHtml = `<p style="font-size:12.5px;color:#555;margin:4px 0">${esc(a.answer_text)}</p>`;
  else if (a.file_path) answerHtml = `<button class="btn-sm" style="margin:4px 0" onclick="openPdf('${r2ServeUrl(a.file_path)}','Answer')">View uploaded file</button>`;
  else if (a.selected_option_ids) answerHtml = `<p style="font-size:12.5px;color:#555;margin:4px 0">Selected option(s): ${a.selected_option_ids.join(', ')}</p>`;
  else if (a.matching_answers) answerHtml = `<p style="font-size:12.5px;color:#555;margin:4px 0">${Object.entries(a.matching_answers).map(([k,v]) => `${esc(k)} → ${esc(v)}`).join('; ')}</p>`;

  const needsManualGrading = !objective;
  return `
    <div style="padding:6px 0;border-bottom:1px dashed #eee">
      <div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px">
        <strong>${esc(a.question_text || '')}</strong>
        ${badge}
      </div>
      ${answerHtml}
      ${needsManualGrading ? `
        <div style="display:flex;gap:6px;align-items:center;margin-top:4px">
          <input type="number" id="answer-pts-${a.id}" min="0" max="${a.question_points}" step="0.5"
            value="${a.points_awarded ?? ''}" placeholder="Points" style="width:70px;padding:4px 6px;font-size:12px;border:1px solid var(--border);border-radius:5px">
          <button class="btn-sm" onclick="gradeAnswer(${a.id}, ${a.question_points})">Save</button>
        </div>` : ''}
    </div>`;
}

// Same display as answerReviewRow but with no input/Save control — used inside the
// grade modal, where the same answer is already editable in the list underneath;
// duplicating that editable control here would create a second element with the
// same id and break whichever one document.getElementById happens to find first.
function answerReviewRowReadonly(a) {
  const objective = a.is_correct !== null && a.is_correct !== undefined;
  const badge = objective
    ? (a.is_correct
        ? `<span style="color:#1a8a5a">${a.points_awarded}/${a.question_points}</span>`
        : `<span style="color:#c0392b">${a.points_awarded ?? 0}/${a.question_points}</span>`)
    : (a.points_awarded !== null && a.points_awarded !== undefined
        ? `<span style="color:#1a8a5a">${a.points_awarded}/${a.question_points}</span>`
        : `<span style="color:#c47f00">Needs grading</span>`);

  let answerHtml = '';
  if (a.answer_text) answerHtml = `<p style="font-size:12.5px;color:#555;margin:4px 0">${esc(a.answer_text)}</p>`;
  else if (a.file_path) answerHtml = `<button class="btn-sm" style="margin:4px 0" onclick="openPdf('${r2ServeUrl(a.file_path)}','Answer')">View uploaded file</button>`;
  else if (a.selected_option_ids) answerHtml = `<p style="font-size:12.5px;color:#555;margin:4px 0">Selected option(s): ${a.selected_option_ids.join(', ')}</p>`;
  else if (a.matching_answers) answerHtml = `<p style="font-size:12.5px;color:#555;margin:4px 0">${Object.entries(a.matching_answers).map(([k,v]) => `${esc(k)} → ${esc(v)}`).join('; ')}</p>`;
  else answerHtml = `<p style="font-size:12.5px;color:#aaa;margin:4px 0;font-style:italic">No answer given</p>`;

  return `
    <div style="padding:6px 0;border-bottom:1px dashed #eee">
      <div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px">
        <strong>${esc(a.question_text || '')} <span style="font-weight:400;color:#999">(${a.question_points} pt${a.question_points===1?'':'s'})</span></strong>
        ${badge}
      </div>
      ${answerHtml}
    </div>`;
}

async function gradeAnswer(responseId, maxPoints) {
  const input = document.getElementById(`answer-pts-${responseId}`);
  const points = parseFloat(input.value);
  if (isNaN(points) || points < 0 || points > maxPoints) { showToast(`Enter 0–${maxPoints}`, 'error'); return; }
  try {
    await apiPost(`/assignments/answers/${responseId}/grade`, { points_awarded: points });
    showToast('Question graded!');
    if (_viewingSubmissionsFor) viewSubmissions(_viewingSubmissionsFor.asgnId, _viewingSubmissionsFor.title);
  } catch (e) { showToast('Could not save grade.', 'error'); }
}

function openGradeModal(subId) {
  const ctx = _gradeContext[subId];
  if (!ctx) { showToast('Could not load submission context.', 'error'); return; }
  const { submission: s, assignment: asgn } = ctx;
  const student = s.student_name || `Student #${s.student_id}`;
  const maxScore = asgn.max_score || 100;

  document.getElementById('gradeSubId').value = subId;
  document.getElementById('gradeScore').max = maxScore;
  document.getElementById('gradeMaxScore').textContent = maxScore;
  document.getElementById('gradeStudentName').textContent =
    `Student: ${student}${s.attempt_number > 1 ? ` (attempt ${s.attempt_number})` : ''}`;
  document.getElementById('gradeScore').value = s.grade ?? '';
  document.getElementById('gradeFeedback').value = s.feedback || '';

  const answers = s.answers || [];
  let autoTotal = 0, gradedCount = 0;
  answers.forEach(a => { if (a.points_awarded !== null && a.points_awarded !== undefined) { autoTotal += a.points_awarded; gradedCount++; } });

  let html = `
    <div class="grade-asgn-context">
      <div class="grade-asgn-title">${esc(asgn.title || '')}</div>
      ${asgn.description ? formatRichText(asgn.description) : '<p style="color:#aaa;font-size:12.5px">No instructions provided.</p>'}
    </div>`;

  if (answers.length) {
    html += `<div class="grade-rubric-label">Questions &amp; Answers
      <span class="grade-auto-total">${gradedCount}/${answers.length} scored — ${autoTotal} / ${maxScore} pts so far</span>
    </div>`;
    html += `<div class="grade-rubric-list">${answers.map(a => answerReviewRowReadonly(a)).join('')}</div>`;
  } else {
    html += `<div class="grade-rubric-label">Student Submission</div>`;
    if (s.submission_type === 'link' && s.content) {
      html += `<a href="${esc(s.content)}" target="_blank" class="sub-link-btn">Open Link / Drive</a>`;
    } else if ((s.submission_type === 'pdf' || s.submission_type === 'file') && s.file_path) {
      html += `<button class="sub-link-btn" onclick="openPdf('${r2ServeUrl(s.file_path)}','Submission – ${esc(student)}')">${fileIcon(s.file_path)} View File</button>`;
    } else if (s.content) {
      html += `<div class="grade-sub-text">${formatRichText(s.content)}</div>`;
    } else {
      html += `<p style="color:#aaa;font-size:12.5px">No submission content.</p>`;
    }
  }

  document.getElementById('gradeSubmissionPreview').innerHTML = html;
  document.getElementById('modalGrade').classList.remove('hidden');
}

async function submitGrade() {
  const subId    = document.getElementById('gradeSubId').value;
  const grade    = parseFloat(document.getElementById('gradeScore').value);
  const feedback = document.getElementById('gradeFeedback').value.trim();
  if (isNaN(grade)) { showToast('Enter a valid score', 'error'); return; }
  try {
    await apiPost(`/assignments/submissions/${subId}/grade`, { grade, feedback });
    closeModal('modalGrade');
    closeModal('modalSubmissions');
    loadAssignments();
    showToast('Grade submitted — student has been notified!');
  } catch(e) { showToast('Could not submit grade.', 'error'); }
}

// ---- STUDENTS ----
let allStudents = [];

async function loadStudents() {
  const tbody = document.getElementById('studentsTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="empty">Loading…</td></tr>';
  try {
    const overview = await apiGet('/courses/students-overview') || [];
    allStudents = overview.map(s => ({
      id: s.student_id, first_name: s.first_name, last_name: s.last_name, email: s.email,
      courses: (s.courses || []).map(c => ({
        title: c.title, progress: c.progress_percent || 0, status: c.pass_status || 'in_progress',
      })),
      avg_grade_percent: s.avg_grade_percent, trend: s.trend || 'flat',
      last_activity: s.last_activity, at_risk: !!s.at_risk,
    }));
    document.getElementById('studentsHeaderCount').textContent = `(${allStudents.length} enrolled)`;
    renderStudents(allStudents);
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Could not load students.</td></tr>';
  }
}

const TREND_ICON = { up: '↗', down: '↘', flat: '→' };

function renderStudents(students) {
  const tbody = document.getElementById('studentsTableBody');
  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">No students enrolled in your subjects.</td></tr>';
    return;
  }
  tbody.innerHTML = students.map(s => {
    const init = ((s.first_name || '?')[0] + (s.last_name || '?')[0]).toUpperCase();
    const courses = s.courses || [];
    const grade = s.avg_grade_percent;
    const gradeCls = grade == null ? '' : grade >= 80 ? 'grade-good' : grade >= 60 ? 'grade-ok' : 'grade-bad';
    return `
      <tr onclick="openStudentDetail(${s.id})">
        <td>
          <div class="st-name-cell">
            <div class="st-avatar">${init}</div>
            <div><strong>${esc(s.first_name)} ${esc(s.last_name)}</strong>${s.at_risk ? '<span class="cc-warn" style="margin-left:6px">At Risk</span>' : ''}<p>${esc(s.email || '')}</p></div>
          </div>
        </td>
        <td>${courses.length ? courses.map(c => `<span class="cc-badge" style="margin:2px">${esc(c.title)}</span>`).join('') : '<span class="cs-empty" style="padding:0">—</span>'}</td>
        <td>${grade != null ? `<span class="st-grade ${gradeCls}">${Math.round(grade)}% <small>${TREND_ICON[s.trend] || '→'}</small></span>` : '<span class="cs-empty" style="padding:0">—</span>'}</td>
        <td>${s.last_activity ? fmtRelativeDateTime(s.last_activity) : '—'}</td>
        <td onclick="event.stopPropagation()"><button class="btn-sm" onclick="openComposeToUser(${s.id},'${esc(s.first_name+' '+s.last_name)}')">Message</button></td>
      </tr>`;
  }).join('');
}

function openStudentDetail(studentId) {
  const s = (allStudents || []).find(x => x.id === studentId);
  if (!s) return;
  const init = ((s.first_name || '?')[0] + (s.last_name || '?')[0]).toUpperCase();
  const courses = s.courses || [];
  document.getElementById('sdBody').innerHTML = `
    <div class="sd-head">
      <div class="sd-avatar">${init}</div>
      <div>
        <h3>${esc(s.first_name)} ${esc(s.last_name)}</h3>
        <p>${esc(s.email || '')}</p>
        ${s.avg_grade_percent != null ? `<p>Avg grade: ${Math.round(s.avg_grade_percent)}% ${s.at_risk ? '· <span class="cc-warn">At Risk</span>' : ''}</p>` : ''}
      </div>
    </div>
    <div class="sd-section-label">Subjects with you (${courses.length})</div>
    ${courses.length ? courses.map(c => `
      <div class="sd-course-row">
        <div class="sd-course-row-top">
          <span>${esc(c.title)}</span>
          <span class="sd-course-status ${esc(c.status)}">${esc((c.status||'').replace('_',' '))}</span>
        </div>
        <div class="prog-bar-wrap" style="margin-top:8px" title="${c.progress}%">
          <div class="prog-bar" style="width:${c.progress}%"></div>
        </div>
        <p style="font-size:11px;color:#888;margin-top:4px">${c.progress}% complete</p>
      </div>`).join('') : '<p style="font-size:13px;color:#888">Not enrolled in any of your subjects.</p>'}
    <button class="btn-primary" style="width:100%;margin-top:10px" onclick="closeModal('modalStudentDetail');openComposeToUser(${s.id},'${esc(s.first_name+' '+s.last_name)}')">Message ${esc(s.first_name)}</button>
  `;
  document.getElementById('modalStudentDetail').classList.remove('hidden');
}

function filterStudents() {
  const q = document.getElementById('studentSearch').value.toLowerCase();
  const filtered = allStudents.filter(s =>
    (s.first_name + ' ' + s.last_name).toLowerCase().includes(q) ||
    (s.email || '').toLowerCase().includes(q)
  );
  renderStudents(filtered);
}

// ---- ADD STUDENT TO COURSE ----
let _allInviteUsers = [];

async function openInviteModal() {
  if (!activeCourseId) return;
  // Always refresh to reflect latest enrollment state
  try { _allInviteUsers = await apiGet('/auth/users') || []; } catch(e) {}
  // Fetch current enrollments so we can grey out already-enrolled students
  let enrolledIds = new Set();
  try {
    const detail = await apiGet(`/courses/${activeCourseId}`);
    (detail.enrollments || []).forEach(e => enrolledIds.add(e.student_id));
  } catch(e) {}
  document.getElementById('inviteSearch').value = '';
  renderInviteList(_allInviteUsers.filter(u => u.role === 'student'), enrolledIds);
  document.getElementById('modalInviteStudent').classList.remove('hidden');
}

let _enrolledIds = new Set();

function searchInviteStudents() {
  const q = document.getElementById('inviteSearch').value.toLowerCase();
  const students = _allInviteUsers.filter(u =>
    u.role === 'student' &&
    ((u.first_name + ' ' + u.last_name).toLowerCase().includes(q) ||
     (u.email || '').toLowerCase().includes(q))
  );
  renderInviteList(students, _enrolledIds);
}

function renderInviteList(students, enrolledIds) {
  if (enrolledIds) _enrolledIds = enrolledIds;
  const el = document.getElementById('inviteStudentList');
  if (!students.length) { el.innerHTML = '<p style="color:#aaa;text-align:center;padding:12px">No students found.</p>'; return; }
  el.innerHTML = students.map(u => {
    const init = ((u.first_name||'?')[0] + (u.last_name||'?')[0]).toUpperCase();
    const enrolled = _enrolledIds.has(u.id);
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:6px;background:#f9fafb;margin-bottom:6px">
      <div class="stud-initials" style="width:36px;height:36px;font-size:13px">${init}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px">${esc(u.first_name)} ${esc(u.last_name)}</div>
        <div style="font-size:12px;color:#888">${esc(u.email||'')}</div>
      </div>
      ${enrolled
        ? '<span style="font-size:12px;color:#1a5c3a;background:#e8f5ee;padding:3px 10px;border-radius:20px">Enrolled</span>'
        : `<button class="btn-sm" id="addbtn-${u.id}" onclick="addStudentToCourse(${u.id},this)">+ Add</button>`}
    </div>`;
  }).join('');
}

async function addStudentToCourse(studentId, btn) {
  if (!activeCourseId) return;
  btn.disabled = true; btn.textContent = 'Adding…';
  try {
    await apiPost(`/courses/${activeCourseId}/add-student`, { student_id: studentId });
    btn.textContent = 'Enrolled';
    btn.style.background = 'var(--success,#27ae60)';
    btn.style.cursor = 'default';
    _enrolledIds.add(studentId);
    // Refresh the enrolled count in the detail panel
    openCourseDetail(activeCourseId);
    showToast('Student added to course!');
  } catch(e) {
    btn.disabled = false; btn.textContent = '+ Add';
    showToast(e.message || 'Could not add student.', 'error');
  }
}

// ---- PDF VIEWER ----
function openPdf(url, title) {
  const token = getToken();
  const src = url.includes("/api/resources/serve") && token
    ? url + (url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(token)
    : url;
  document.getElementById('pdfViewerTitle').textContent = title || 'Document';
  document.getElementById('pdfViewerFrame').src = src;
  document.getElementById('pdfDownloadLink').href = src;
  document.getElementById('modalPdfViewer').classList.remove('hidden');
}

// ---- PROGRESS ----
let _paData = null;
let _paStudentDetail = [];
let _paDetailPage = 1;
const PA_PAGE_SIZE = 5;
let _paLineChart = null, _paBarChart = null;

function _fmtTrend(v, unit = '%', invert = false) {
  if (v === null || v === undefined) return { cls: '', text: '—' };
  const good = invert ? v <= 0 : v >= 0;
  const arrow = Math.abs(v) < 0.05 ? '—' : (v > 0 ? '↑' : '↓');
  return { cls: good ? 'up' : 'warn', text: `${arrow} ${Math.abs(v).toFixed(1)}${unit}` };
}

async function loadProgress() {
  try {
    if (!Array.isArray(myCourses) || myCourses.length === 0) myCourses = await apiGet('/courses/my');
    _paData = await apiGet('/courses/progress-analytics');
    _paStudentDetail = await apiGet('/courses/students-overview') || [];
    renderProgressMetrics();
    renderProgressCharts();
    _paDetailPage = 1;
    renderProgressDetailTable();
  } catch(e) {
    document.getElementById('paDetailTable').innerHTML = '<tr><td colspan="5" class="empty">Could not load progress data.</td></tr>';
  }
}

function renderProgressMetrics() {
  const d = _paData || {};
  document.getElementById('paAvgGrade').textContent = d.avg_class_grade_percent != null ? `${Math.round(d.avg_class_grade_percent)}%` : '—';
  const gt = _fmtTrend(d.avg_class_grade_trend);
  document.getElementById('paAvgGradeTrend').textContent = gt.text;
  document.getElementById('paAvgGradeTrend').className = `stat-trend ${gt.cls}`;

  document.getElementById('paCompletion').textContent = d.assignment_completion_percent != null ? `${Math.round(d.assignment_completion_percent)}%` : '—';
  const ct = _fmtTrend(d.assignment_completion_trend);
  document.getElementById('paCompletionTrend').textContent = ct.text;
  document.getElementById('paCompletionTrend').className = `stat-trend ${ct.cls}`;

  document.getElementById('paAtRisk').textContent = d.at_risk_count ?? '—';

  document.getElementById('paGradingTime').textContent = d.avg_grading_time_hours != null
    ? (d.avg_grading_time_hours < 24 ? `${d.avg_grading_time_hours.toFixed(1)} hrs` : `${(d.avg_grading_time_hours / 24).toFixed(1)} days`)
    : '—';
  const tt = _fmtTrend(d.avg_grading_time_trend, ' hrs', true);
  document.getElementById('paGradingTimeTrend').textContent = tt.text;
  document.getElementById('paGradingTimeTrend').className = `stat-trend ${tt.cls}`;
}

function renderProgressCharts() {
  if (typeof Chart === 'undefined') return;
  const d = _paData || {};
  const series = d.weekly_series || [];
  const lineCtx = document.getElementById('paLineChart');
  if (_paLineChart) _paLineChart.destroy();
  _paLineChart = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: series.map(p => new Date(p.week_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
      datasets: [
        { label: 'Class Avg', data: series.map(p => Math.round(p.avg_grade_percent)), borderColor: '#2554eb', backgroundColor: 'rgba(37,84,235,.08)', fill: true, tension: .35 },
        { label: 'Target', data: series.map(() => d.target_grade_percent || 80), borderColor: '#22c55e', borderDash: [6, 4], pointRadius: 0, fill: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { min: 0, max: 100, ticks: { callback: v => v + '%' } } },
      plugins: { legend: { position: 'bottom' } },
    },
  });
  if (!series.length) lineCtx.parentElement.insertAdjacentHTML('beforeend', '<p class="cs-empty">No graded submissions yet — the chart will populate as assignments are graded.</p>');

  const subjects = d.subject_performance || [];
  const barCtx = document.getElementById('paBarChart');
  if (_paBarChart) _paBarChart.destroy();
  _paBarChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: subjects.map(s => s.title),
      datasets: [{ label: 'Avg Grade', data: subjects.map(s => s.avg_grade_percent != null ? Math.round(s.avg_grade_percent) : 0), backgroundColor: '#2554eb', borderRadius: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      scales: { x: { min: 0, max: 100, ticks: { callback: v => v + '%' } } },
      plugins: { legend: { display: false } },
    },
  });
}

function renderProgressDetailTable() {
  const q = (document.getElementById('paStudentSearch').value || '').toLowerCase();
  const list = (_paStudentDetail || []).filter(s =>
    (s.first_name + ' ' + s.last_name).toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q));

  const totalPages = Math.max(1, Math.ceil(list.length / PA_PAGE_SIZE));
  if (_paDetailPage > totalPages) _paDetailPage = totalPages;
  const start = (_paDetailPage - 1) * PA_PAGE_SIZE;
  const pageItems = list.slice(start, start + PA_PAGE_SIZE);

  const tbody = document.getElementById('paDetailTable');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty">No students found.</td></tr>'; document.getElementById('paDetailPagination').innerHTML = ''; return; }

  tbody.innerHTML = pageItems.map(s => {
    const init = ((s.first_name||'?')[0] + (s.last_name||'?')[0]).toUpperCase();
    const focus = (s.courses || [])[0];
    const grade = s.avg_grade_percent;
    const gradeCls = grade == null ? '' : grade >= 80 ? 'grade-good' : grade >= 60 ? 'grade-ok' : 'grade-bad';
    return `
      <tr onclick="openStudentDetail(${s.student_id})">
        <td>
          <div class="st-name-cell">
            <div class="st-avatar">${init}</div>
            <div><strong>${esc(s.first_name)} ${esc(s.last_name)}</strong>${s.at_risk ? ' <span class="cc-warn"><svg class="icon-sm"><use href="#ic-warning"></use></svg></span>' : ''}<p>ID: #${s.student_id}</p></div>
          </div>
        </td>
        <td>${focus ? esc(focus.title) : '—'}</td>
        <td>${focus ? `<div class="asgn-subs-cell"><span>${focus.progress_percent || 0}%</span><div class="asgn-subs-bar-wrap"><div class="asgn-subs-bar graded" style="width:${focus.progress_percent||0}%"></div></div></div>` : '—'}</td>
        <td>${grade != null ? `<span class="st-grade ${gradeCls}">${Math.round(grade)}%</span>` : '—'}</td>
        <td onclick="event.stopPropagation()"><button class="btn-sm" onclick="openComposeToUser(${s.student_id},'${esc(s.first_name+' '+s.last_name)}')"><svg class="icon-sm"><use href="#ic-mail"></use></svg></button></td>
      </tr>`;
  }).join('');

  document.getElementById('paDetailPagination').innerHTML = totalPages > 1 ? `
    <button class="pg-btn" ${_paDetailPage<=1?'disabled':''} onclick="paGoToPage(${_paDetailPage-1})">‹</button>
    ${Array.from({length: totalPages}, (_,i)=>i+1).map(n => `<button class="pg-btn ${n===_paDetailPage?'active':''}" onclick="paGoToPage(${n})">${n}</button>`).join('')}
    <button class="pg-btn" ${_paDetailPage>=totalPages?'disabled':''} onclick="paGoToPage(${_paDetailPage+1})">›</button>
  ` : '';
}

function paGoToPage(n) { _paDetailPage = n; renderProgressDetailTable(); }

function exportProgressReport() {
  const d = _paData || {};
  const rows = [
    ['Metric', 'Value'],
    ['Average Class Grade %', d.avg_class_grade_percent != null ? d.avg_class_grade_percent.toFixed(1) : ''],
    ['Assignment Completion %', d.assignment_completion_percent != null ? d.assignment_completion_percent.toFixed(1) : ''],
    ['At-Risk Students', d.at_risk_count ?? ''],
    ['Avg Grading Time (hrs)', d.avg_grading_time_hours != null ? d.avg_grading_time_hours.toFixed(1) : ''],
    [],
    ['Student', 'Email', 'Avg Grade %', 'At Risk', 'Last Activity'],
    ...(_paStudentDetail || []).map(s => [
      `${s.first_name} ${s.last_name}`, s.email, s.avg_grade_percent != null ? s.avg_grade_percent.toFixed(1) : '',
      s.at_risk ? 'Yes' : 'No', s.last_activity || '',
    ]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `progress-report-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
}

// ---- RESOURCES ----
let _facilitatorResourcesData = null;

let _resAllItems = [];
let _resSubjectFilter = new Set();
let _resTypeFilter = new Set();
let _resView = 'grid';
let _resVisibleCount = 12;
const RES_PAGE_SIZE = 12;
const RES_TYPE_META = {
  textbook: { label: 'Textbook', icon: '' },
  teacher_guide: { label: 'Teacher Guide', icon: '' },
  past_paper: { label: 'Past Paper', icon: '' },
  uploaded: { label: 'Uploaded', icon: '' },
};

function fmtFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function loadResources() {
  const grid = document.getElementById('resGrid');
  grid.innerHTML = '<div class="empty-state">Loading…</div>';
  _resSubjectFilter = new Set();
  _resTypeFilter = new Set();
  _resVisibleCount = RES_PAGE_SIZE;
  try {
    const data = await apiGet('/resources/');
    _facilitatorResourcesData = data;
    _resAllItems = [...(data.textbooks || []), ...(data.past_papers || []), ...(data.uploaded || [])];
    renderResourceFilters();
    renderResourceGrid();
  } catch(e) {
    grid.innerHTML = '<div class="empty-state">Could not load resources.</div>';
  }
}

function renderResourceFilters() {
  const subjCounts = {}, typeCounts = {};
  _resAllItems.forEach(r => {
    if (r.subject) subjCounts[r.subject] = (subjCounts[r.subject] || 0) + 1;
    const t = r.type || 'uploaded';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const subjEl = document.getElementById('resSubjectFilters');
  subjEl.innerHTML = Object.keys(subjCounts).sort().map(s => `
    <label class="res-filter-check"><input type="checkbox" onchange="toggleResFilter('subject','${esc(s)}',this.checked)"><span>${esc(s)}</span><small>${subjCounts[s]}</small></label>
  `).join('') || '<p class="cs-empty" style="padding:0">No subjects yet.</p>';

  const typeEl = document.getElementById('resTypeFilters');
  typeEl.innerHTML = Object.keys(typeCounts).sort().map(t => {
    const meta = RES_TYPE_META[t] || { label: t };
    return `<label class="res-filter-check"><input type="checkbox" onchange="toggleResFilter('type','${esc(t)}',this.checked)"><span>${esc(meta.label)}</span><small>${typeCounts[t]}</small></label>`;
  }).join('');
}

function toggleResFilter(kind, value, checked) {
  const set = kind === 'subject' ? _resSubjectFilter : _resTypeFilter;
  if (checked) set.add(value); else set.delete(value);
  _resVisibleCount = RES_PAGE_SIZE;
  renderResourceGrid();
}

function resetResourceFilters() {
  _resSubjectFilter = new Set();
  _resTypeFilter = new Set();
  _resVisibleCount = RES_PAGE_SIZE;
  document.querySelectorAll('#resSubjectFilters input, #resTypeFilters input').forEach(cb => cb.checked = false);
  renderResourceGrid();
}

function setResourceView(view) {
  _resView = view;
  document.getElementById('resViewGridBtn').classList.toggle('active', view === 'grid');
  document.getElementById('resViewListBtn').classList.toggle('active', view === 'list');
  renderResourceGrid();
}

function resLoadMore() {
  _resVisibleCount += RES_PAGE_SIZE;
  renderResourceGrid();
}

function renderResourceGrid() {
  let list = _resAllItems.filter(r =>
    (!_resSubjectFilter.size || _resSubjectFilter.has(r.subject)) &&
    (!_resTypeFilter.size || _resTypeFilter.has(r.type || 'uploaded'))
  );
  const sort = document.getElementById('resSort').value;
  if (sort === 'title') {
    list = list.slice().sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else {
    list = list.slice().sort((a, b) => {
      if (!a.created_at && !b.created_at) return 0;
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      return sort === 'oldest' ? new Date(a.created_at) - new Date(b.created_at) : new Date(b.created_at) - new Date(a.created_at);
    });
  }

  const grid = document.getElementById('resGrid');
  grid.className = _resView === 'list' ? 'resource-grid res-list-mode' : 'resource-grid';
  const visible = list.slice(0, _resVisibleCount);
  grid.innerHTML = visible.length ? visible.map(r => resCard2(r)).join('') : '<div class="empty-state">No resources match these filters.</div>';

  document.getElementById('resShowingCount').textContent = `Showing ${visible.length} of ${list.length} resources`;
  document.getElementById('resLoadMoreBtn').classList.toggle('hidden', visible.length >= list.length);
}

function resCard2(r) {
  const url = r.url || r.file_path;
  const meta = RES_TYPE_META[r.type] || { label: r.type || 'Resource', icon: '' };
  const size = fmtFileSize(r.file_size_bytes);
  const theme = resolveSubjectTheme(r.subject);
  const thumbStyle = theme.img
    ? `style="background-image:linear-gradient(180deg,rgba(20,20,30,.15),rgba(10,10,20,.55)),url('${esc(theme.img)}')"`
    : '';
  return `
    <div class="resource-card2">
      <div class="res-thumb ${theme.img ? 'has-photo' : ''}" ${thumbStyle}><span class="res-thumb-icon">${theme.img ? theme.icon : meta.icon}</span><span class="res-type-badge">${esc(meta.label)}</span></div>
      <div class="res-body">
        ${r.subject ? `<div class="res-subject-tag">${esc(r.subject)}</div>` : ''}
        <div class="res-title2">${esc(r.title)}</div>
        ${r.description ? `<p class="res-desc">${esc(r.description.length > 90 ? r.description.slice(0,90)+'…' : r.description)}</p>` : ''}
        <div class="res-foot">
          <span class="res-size">${size}</span>
          <div class="res-actions">
            <button class="btn-icon" title="View" onclick="openPdf('${esc(url)}','${esc(r.title)}')"><svg class="icon-sm"><use href="#ic-eye"></use></svg></button>
            <a class="btn-icon" title="Download" href="${esc(url)}" target="_blank" download><svg class="icon-sm"><use href="#ic-download"></use></svg></a>
          </div>
        </div>
      </div>
    </div>`;
}

async function uploadResource() {
  const title   = document.getElementById('upTitle').value.trim();
  const subject = document.getElementById('upSubject').value.trim();
  const grade   = document.getElementById('upGrade').value.trim();
  const type    = document.getElementById('upType').value;
  const file    = document.getElementById('upFile').files[0];
  const msgEl   = document.getElementById('uploadMsg');

  if (!title || !file) { showToast('Title and PDF file required', 'error'); return; }
  if (!file.name.toLowerCase().endsWith('.pdf')) { showToast('Only PDF files accepted', 'error'); return; }

  const fd = new FormData();
  fd.append('file', file);
  fd.append('title', title);
  if (subject) fd.append('subject', subject);
  if (grade)   fd.append('grade_level', grade);
  fd.append('res_type', type);

  msgEl.textContent = 'Uploading…';
  msgEl.classList.remove('hidden');

  try {
    await apiPost('/resources/upload', fd);
    msgEl.textContent = 'Resource uploaded successfully!';
    showToast('Resource uploaded and now accessible to everyone!');
    document.getElementById('upTitle').value = '';
    document.getElementById('upSubject').value = '';
    document.getElementById('upGrade').value = '';
    document.getElementById('upFile').value = '';
    loadResources();
    setTimeout(() => msgEl.classList.add('hidden'), 3000);
  } catch(e) {
    msgEl.textContent = e.message || 'Upload failed.';
    showToast('Upload failed.', 'error');
  }
}

// ---- MESSAGES (WhatsApp-style) ----
let _activeChatUserId = null;
let _activeChatName   = '';
let _allContacts      = [];
let _allChatPeople    = [];
let _chatPollInterval = null;
let _msgStudentsOverview = null;
let _msgAllUsers = null;

async function loadMessages() {
  await loadContacts();
}

async function loadContacts() {
  const el = document.getElementById('contactsList');
  el.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    _allContacts = await apiGet('/messages/contacts') || [];
    renderContacts(_allContacts);
  } catch(e) { el.innerHTML = '<div class="empty-state">Could not load conversations.</div>'; }
}

function renderContacts(list) {
  const el = document.getElementById('contactsList');
  if (!list.length) {
    el.innerHTML = '<div class="empty-state" style="padding:24px 12px;text-align:center">No conversations yet.<br>Press <strong>+ New</strong> to start one.</div>';
    return;
  }
  el.innerHTML = list.map(c => `
    <div class="contact-item ${_activeChatUserId == c.user_id ? 'active' : ''}" onclick="openChat(${c.user_id}, '${esc(c.name)}', '${esc(c.initials)}')">
      <div class="contact-avatar">${esc(c.initials)}</div>
      <div class="contact-info">
        <div class="contact-name">${esc(c.name)} <span class="contact-role">${esc(c.role)}</span></div>
        <div class="contact-last">${esc((c.last_message||'').slice(0,45))}</div>
      </div>
      <div class="contact-meta">
        <div class="contact-time">${c.last_time ? fmtTimeShort(c.last_time) : ''}</div>
        ${c.unread > 0 ? `<div class="contact-unread">${c.unread}</div>` : ''}
      </div>
    </div>`).join('');
}

function filterContacts() {
  const q = document.getElementById('chatContactSearch').value.toLowerCase();
  renderContacts(_allContacts.filter(c => c.name.toLowerCase().includes(q)));
}

async function openChat(userId, name, initials) {
  _activeChatUserId = userId;
  _activeChatName   = name;
  document.getElementById('chatEmptyState').classList.add('hidden');
  document.getElementById('chatThread').classList.remove('hidden');
  document.getElementById('chatPartnerInfo').innerHTML =
    `<div class="chat-avatar-sm">${esc(initials||name[0])}</div><div><strong>${esc(name)}</strong></div>`;
  document.getElementById('chatInput').value = '';
  renderContacts(_allContacts); // re-render to highlight active
  await loadThread();
  renderStudentContextPanel(userId);
  // start polling
  if (_chatPollInterval) clearInterval(_chatPollInterval);
  _chatPollInterval = setInterval(loadThread, 5000);
}

async function renderStudentContextPanel(userId) {
  const panel = document.getElementById('chatContextPanel');
  const contact = _allContacts.find(c => c.user_id === userId);
  if (!contact || contact.role !== 'student') { panel.classList.add('hidden'); return; }

  panel.classList.remove('hidden');
  document.getElementById('ctxAvatar').textContent = contact.initials || '?';
  document.getElementById('ctxName').textContent = contact.name;
  document.getElementById('ctxMeta').textContent = 'Loading…';
  document.getElementById('ctxId').textContent = `ID: ${userId}`;
  document.getElementById('ctxAtRisk').textContent = '';
  document.getElementById('ctxCourses').innerHTML = '';
  document.getElementById('ctxActivity').innerHTML = '';

  try {
    if (!_msgStudentsOverview) _msgStudentsOverview = await apiGet('/courses/students-overview') || [];
    if (!_msgAllUsers) _msgAllUsers = await apiGet('/auth/users') || [];
  } catch(e) {}

  const overview = (_msgStudentsOverview || []).find(s => s.student_id === userId);
  const user = (_msgAllUsers || []).find(u => u.id === userId);

  document.getElementById('ctxMeta').textContent = user ? [user.school, user.grade].filter(Boolean).join(', ') || 'No school/grade on file' : '';
  document.getElementById('ctxAtRisk').innerHTML = overview
    ? (overview.at_risk ? '<span class="ctx-badge risk">At Risk</span>' : '<span class="ctx-badge ok">On Track</span>')
    : '';

  const courses = overview?.courses || [];
  document.getElementById('ctxCourses').innerHTML = courses.length ? courses.map(c => `
    <div class="ctx-course-row">
      <span>${esc(c.title)}</span>
      <span class="ctx-course-grade">${c.progress_percent || 0}%</span>
    </div>`).join('') : '<p class="cs-empty" style="padding:4px 0">Not enrolled in any of your subjects.</p>';

  const activity = overview?.recent_activity || [];
  document.getElementById('ctxActivity').innerHTML = activity.length ? activity.map(a => `
    <div class="ctx-activity-row">
      <span class="ctx-activity-dot"></span>
      <div><strong>${esc(a.title)}</strong><p>${esc(a.course_title || '')} · ${a.at ? fmtRelativeDateTime(a.at) : ''}</p></div>
    </div>`).join('') : '<p class="cs-empty" style="padding:4px 0">No recent activity.</p>';
}

async function loadThread() {
  if (!_activeChatUserId) return;
  try {
    const msgs = await apiGet(`/messages/conversation/${_activeChatUserId}`);
    const el = document.getElementById('chatMessages');
    if (!Array.isArray(msgs)) return;
    el.innerHTML = msgs.map(m => `
      <div class="chat-bubble-wrap ${m.is_mine ? 'mine' : 'theirs'}">
        <div class="chat-bubble">${esc(m.content)}</div>
        <div class="chat-bubble-time">${fmtTimeShort(m.sent_at)}</div>
      </div>`).join('');
    el.scrollTop = el.scrollHeight;
    // refresh unread badge
    loadContacts();
  } catch(e) {}
}

function closeThread() {
  _activeChatUserId = null;
  if (_chatPollInterval) { clearInterval(_chatPollInterval); _chatPollInterval = null; }
  document.getElementById('chatThread').classList.add('hidden');
  document.getElementById('chatEmptyState').classList.remove('hidden');
  document.getElementById('chatContextPanel').classList.add('hidden');
}

async function sendChatMessage() {
  const content = document.getElementById('chatInput').value.trim();
  if (!content || !_activeChatUserId) return;
  document.getElementById('chatInput').value = '';
  try {
    await apiPost('/messages', { receiver_id: _activeChatUserId, content });
    await loadThread();
  } catch(e) { showToast('Could not send.', 'error'); }
}

function chatKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
}

async function openNewChat() {
  _allChatPeople = await apiGet('/auth/users').catch(() => []) || [];
  document.getElementById('newChatSearch').value = '';
  renderNewChatPeople(_allChatPeople);
  document.getElementById('modalNewChat').classList.remove('hidden');
}

function searchNewChatPeople() {
  const q = document.getElementById('newChatSearch').value.toLowerCase();
  renderNewChatPeople(_allChatPeople.filter(u =>
    (u.first_name + ' ' + u.last_name).toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q)
  ));
}

function renderNewChatPeople(list) {
  const el = document.getElementById('newChatPeopleList');
  if (!list.length) { el.innerHTML = '<div style="padding:12px;color:#aaa;text-align:center">No users found.</div>'; return; }
  el.innerHTML = list.map(u => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:6px;cursor:pointer;background:#f9fafb;margin-bottom:6px" onclick="startNewChat(${u.id},'${esc(u.first_name+' '+u.last_name)}','${esc(((u.first_name||'?')[0]+(u.last_name||'?')[0]).toUpperCase())}')">
      <div class="chat-avatar-sm">${((u.first_name||'?')[0]+(u.last_name||'?')[0]).toUpperCase()}</div>
      <div>
        <strong>${esc(u.first_name)} ${esc(u.last_name)}</strong>
        <p style="font-size:11px;color:#888;margin:0">${esc(u.email)} · ${esc(u.role)}</p>
      </div>
    </div>`).join('');
}

async function startNewChat(userId, name, initials) {
  closeModal('modalNewChat');
  // Add to contacts list if not already there
  if (!_allContacts.find(c => c.user_id === userId)) {
    const person = _allChatPeople.find(u => u.id === userId);
    _allContacts.unshift({ user_id: userId, name, initials, role: person?.role || '', last_message: '', last_time: '', unread: 0 });
  }
  await openChat(userId, name, initials);
}

// Deprecated tab-based functions kept as stubs so old HTML refs don't crash
function loadInbox() {}
function loadSent() {}
function loadMsgPeople() {}
function openComposeToUser(userId, name) {
  const initials = (name || '?').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  goTo('messages');
  startNewChat(userId, name, initials);
}

function fmtTimeShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ---- NOTIFICATIONS ----
let _notifs = [];

async function loadNotifications() {
  const el = document.getElementById('notifList');
  el.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    const notifs = await apiGet('/notifications');
    _notifs = Array.isArray(notifs) ? notifs : [];
    const unread = _notifs.filter(n => !n.is_read).length;
    const badge = document.getElementById('notifBadge');
    badge.textContent = unread > 0 ? unread : '';
    badge.style.display = unread > 0 ? 'inline' : 'none';

    el.innerHTML = _notifs.length
      ? _notifs.map(n => `
          <div class="notif-card ${n.is_read ? '' : 'unread'}" onclick="openNotif(${n.id})" style="cursor:pointer">
            <div class="notif-card-left">
              <h4>${esc(n.title || 'Notification')}</h4>
              <p>${esc((n.message||'').slice(0, 80))}${(n.message||'').length > 80 ? '…' : ''}</p>
              <small>${fmtDate(n.created_at)}</small>
            </div>
            ${!n.is_read ? '<span class="unread-dot" style="width:8px;height:8px;background:var(--primary);border-radius:50%;display:inline-block;flex-shrink:0"></span>' : ''}
          </div>`).join('')
      : '<div class="empty-state">No notifications.</div>';
  } catch(e) { el.innerHTML = '<div class="empty-state">Could not load notifications.</div>'; }
}

async function openNotif(id) {
  const n = _notifs.find(x => x.id === id);
  if (!n) return;
  document.getElementById('notifDetailTitle').textContent = n.title || 'Notification';
  document.getElementById('notifDetailMsg').textContent = n.message || '';
  document.getElementById('notifDetailTime').textContent = n.created_at ? new Date(n.created_at).toLocaleString() : '';
  document.getElementById('modalNotifDetail').classList.remove('hidden');
  if (!n.is_read) {
    await apiPut(`/notifications/${id}/read`, {}).catch(() => {});
    n.is_read = true;
    loadNotifications();
  }
}

async function markRead(id) {
  try {
    await apiPut(`/notifications/${id}/read`, {});
    loadNotifications();
  } catch(e) {}
}

async function markAllRead() {
  try {
    await apiPut('/notifications/read-all', {});
    loadNotifications();
    showToast('All notifications marked as read.');
  } catch(e) {}
}

// ---- SETTINGS ----
async function saveProfile(e) {
  e.preventDefault();
  const payload = {
    first_name: document.getElementById('setFirstName').value.trim(),
    last_name:  document.getElementById('setLastName').value.trim(),
    email:      document.getElementById('setEmail').value.trim(),
    country:    document.getElementById('setCountry').value.trim(),
    city:       document.getElementById('setCity').value.trim(),
    nationality: document.getElementById('setNationality').value.trim(),
    languages_spoken: getMultiPickerValues('setLanguages'),
    goals:            getMultiPickerValues('setGoals'),
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
    showToast('Profile saved!');
    setTimeout(() => msg.classList.add('hidden'), 3000);
  } catch(e) { showToast('Could not save profile.', 'error'); }
}

async function facilitatorRequestOTP() {
  const email = document.getElementById('fPwEmail').value.trim();
  const msg   = document.getElementById('fPwMsg1');
  if (!email) { msg.textContent = 'Enter your email.'; msg.classList.remove('hidden'); return; }
  msg.textContent = 'Sending…'; msg.classList.remove('hidden');
  try {
    await apiPost('/auth/request-otp', { email });
    msg.textContent = 'Code sent! Check your email.';
    document.getElementById('fPwStep1').style.display = 'none';
    document.getElementById('fPwStep2').style.display = 'block';
    document.getElementById('fPwCode').focus();
  } catch(e) {
    msg.textContent = e.message || 'Failed to send code.';
  }
}

async function facilitatorVerifyOTP() {
  const email   = document.getElementById('fPwEmail').value.trim();
  const code    = document.getElementById('fPwCode').value.trim();
  const newPw   = document.getElementById('fPwNew').value;
  const confirm = document.getElementById('fPwConfirm').value;
  const msg     = document.getElementById('fPwMsg2');
  if (!code)  { msg.textContent = 'Enter the code.'; msg.classList.remove('hidden'); return; }
  if (!newPw) { msg.textContent = 'Enter new password.'; msg.classList.remove('hidden'); return; }
  if (newPw !== confirm) { msg.textContent = 'Passwords do not match.'; msg.classList.remove('hidden'); return; }
  if (newPw.length < 8) { msg.textContent = 'Min. 8 characters.'; msg.classList.remove('hidden'); return; }
  msg.textContent = 'Verifying…'; msg.classList.remove('hidden');
  try {
    await apiPost('/auth/verify-otp', { email, code, new_password: newPw });
    msg.textContent = 'Password updated!';
    showToast('Password updated successfully!');
    setTimeout(resetFPwSteps, 3000);
  } catch(e) {
    msg.textContent = e.message || 'Invalid or expired code.';
  }
}

function resetFPwSteps() {
  document.getElementById('fPwStep1').style.display = 'block';
  document.getElementById('fPwStep2').style.display = 'none';
  ['fPwCode','fPwNew','fPwConfirm'].forEach(id => document.getElementById(id).value = '');
  ['fPwMsg1','fPwMsg2'].forEach(id => { const el = document.getElementById(id); el.textContent=''; el.classList.add('hidden'); });
}

// ---- MODALS ----
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
});

// ---- UTILS ----
// Course/resource `subject` values in real data aren't always an exact match for a
// SUBJECT_THEME key (e.g. "Mathematics/Algeria") — fall back to a fuzzy match so the
// real subject photo still resolves instead of silently showing no image.
function resolveSubjectTheme(subject) {
  const fallback = (typeof DEFAULT_SUBJECT_THEME !== 'undefined') ? DEFAULT_SUBJECT_THEME : { icon: '', img: '', credit: '' };
  if (typeof SUBJECT_THEME === 'undefined' || !subject) return fallback;
  if (SUBJECT_THEME[subject]) return SUBJECT_THEME[subject];
  const needle = subject.toLowerCase();
  const key = Object.keys(SUBJECT_THEME).find(k => needle.includes(k.toLowerCase()) || k.toLowerCase().includes(needle));
  return key ? SUBJECT_THEME[key] : fallback;
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
// Blank-line-separated paragraphs are kept as paragraphs; single line breaks inside a
// paragraph (common when text — especially pasted equations — was hard-wrapped token by
// token) are collapsed to a space so the content reads as continuous prose.
function formatRichText(text) {
  if (!text) return '';
  return esc(text)
    .split(/\r?\n[ \t]*\r?\n/)
    .map(p => p.replace(/\r?\n+/g, ' ').replace(/[ \t]{2,}/g, ' ').trim())
    .filter(Boolean)
    .map(p => `<p>${p}</p>`)
    .join('');
}
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
