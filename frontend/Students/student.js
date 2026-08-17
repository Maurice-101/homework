document.addEventListener("DOMContentLoaded", () => {
    if (!requireAuth()) return;
    const user = getUser();
    if (user?.role === "facilitator") { window.location.href = "../Facilitators/facilitator-dashboard.html"; return; }
    if (user?.role === "admin")       { window.location.href = "../Admins/admin-dashboard.html"; return; }
    fillUser(user);
    initNav();
    loadDashboard();
    // Poll for updates every 30s
    setInterval(() => {
        const sec = document.querySelector(".sec.active");
        if (sec?.id === "sec-assignments")  loadAssignments();
        if (sec?.id === "sec-progress")     loadProgress();
        if (sec?.id === "sec-messages")     loadContacts();
    }, 30000);
});

// ── USER ──
function fillUser(u) {
    if (!u) return;
    const name = `${u.first_name} ${u.last_name}`;
    document.getElementById("sbName").textContent    = name;
    document.getElementById("sbSub").textContent     = `${u.grade || "—"} | ${u.school || "—"}`;
    document.getElementById("tbName").textContent    = name;
    document.getElementById("welcomeMsg").textContent = `Welcome back, ${u.first_name}! 👋`;
    document.getElementById("sFirst").value  = u.first_name || "";
    document.getElementById("sLast").value   = u.last_name  || "";
    document.getElementById("sSchool").value = u.school     || "";
    document.getElementById("sGrade").value  = u.grade      || "";
    document.getElementById("sBio").value    = u.bio        || "";
}

// ── NAVIGATION ──
function initNav() {
    document.getElementById("toggleSidebar").addEventListener("click", () =>
        document.getElementById("sidebar").classList.toggle("collapsed"));
    document.getElementById("logoutBtn").addEventListener("click", () =>
        logoutWithToast("../Logins/login.html"));
    document.querySelectorAll(".menu li").forEach(li =>
        li.addEventListener("click", () => goTo(li.dataset.sec)));
    document.querySelectorAll(".tab").forEach(tab =>
        tab.addEventListener("click", () => {
            activateTab(tab);
            if (tab.dataset.tab === "browse")   loadAllCourses();
            if (tab.dataset.tab === "public")   loadPublic();
            if (tab.dataset.tab === "enrolled") loadEnrolled();
            if (tab.dataset.tab === "people")   loadPeople();
            if (tab.dataset.tab === "subjects") loadSubjectCatalog();
            if (tab.closest("#sec-resources"))  updateResSummary();
        }));
    document.getElementById("profileForm").addEventListener("submit", saveProfile);
    document.querySelectorAll(".modal").forEach(m =>
        m.addEventListener("click", e => { if (e.target === m) m.classList.remove("open"); }));
}

function goTo(sec) {
    document.querySelectorAll(".menu li").forEach(li => li.classList.toggle("active", li.dataset.sec === sec));
    document.querySelectorAll(".sec").forEach(s => s.classList.remove("active"));
    document.getElementById(`sec-${sec}`)?.classList.add("active");
    const titles = { dashboard:"Dashboard", courses:"Courses", assignments:"Assignments & Tests",
        progress:"Progress", resources:"Resources & Library", messages:"Messages",
        notifications:"Notifications", canvas:"Canvas – Virtual Notebook", settings:"Settings" };
    document.getElementById("pageTitle").textContent = titles[sec] || sec;
    if (sec === "courses")       { loadEnrolled(); loadAllCourses(); loadPublic(); loadInvitations(); }
    if (sec === "assignments")   loadAssignments();
    if (sec === "progress")      loadProgress();
    if (sec === "resources")     { loadResources(); loadSubjectCatalog(); }
    if (sec === "messages")      loadMessages();
    if (sec === "settings")      prefillPwEmail();
    if (sec === "notifications") loadNotifications();
    if (sec === "canvas")        loadCanvas();
}

function activateTab(tab) {
    const sec = tab.closest(".sec");
    if (!sec) return;
    sec.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    sec.querySelectorAll(".tab-body").forEach(b => b.classList.remove("active"));
    sec.querySelector(`#tab-${tab.dataset.tab}`)?.classList.add("active");
}

// ── DASHBOARD ──
async function loadDashboard() {
    try {
        const [asgn, courses, notifs] = await Promise.all([
            apiGet("/assignments/"), apiGet("/courses/my"), apiGet("/notifications")
        ]);
        const upcoming  = asgn?.upcoming  || [];
        const submitted = asgn?.submitted || [];
        const enrolled  = Array.isArray(courses) ? courses : [];
        const ns        = Array.isArray(notifs) ? notifs : [];
        const unread    = ns.filter(n => !n.is_read).length;

        document.getElementById("stCourses").textContent   = enrolled.length;
        document.getElementById("stPending").textContent   = upcoming.length;
        document.getElementById("stSubmitted").textContent = submitted.length;
        document.getElementById("stNotifs").textContent    = unread;
        if (unread > 0) document.getElementById("notifBadge").textContent = unread;

        setList("dUpcoming", upcoming.slice(0, 4),
            a => `<span>${a.title}</span><small>${a.due_date ? new Date(a.due_date).toLocaleDateString() : "—"}</small>`,
            "No upcoming assignments");
        setList("dNotifs", ns.slice(0, 4),
            n => `<span>${n.title}</span><small>${new Date(n.created_at).toLocaleDateString()}</small>`,
            "No notifications");
        setList("dCourses", enrolled.slice(0, 4),
            item => { const c = item.course || item; return `<span>${c.title}</span><span class="tag">${c.subject}</span>`; },
            "No courses enrolled");

        document.getElementById("dResources").innerHTML = [
            ["Mathematics","#2f6df6"],["Biology","#36b37e"],["Physics","#f39c12"],
            ["Chemistry","#6c5ce7"],["Computer Science","#e74c3c"],["Entrepreneurship","#1abc9c"]
        ].map(([s,c]) =>
            `<div class="qr-card" style="background:${c}" onclick="quickRes('${s}')">${s}</div>`
        ).join("");
    } catch (e) { console.error(e); }
}

function setList(id, items, render, emptyMsg) {
    const el = document.getElementById(id);
    el.innerHTML = items.length === 0 ? `<li class="empty">${emptyMsg}</li>` :
        items.map(i => `<li>${render(i)}</li>`).join("");
}

function quickRes(subject) {
    goTo("resources");
    setTimeout(() => { document.getElementById("rsubject").value = subject; loadResources(); }, 80);
}

// ── COURSES ──

// DB courses only store a freeform subject string (e.g. "Math", "Language"), which
// doesn't always match a SUBJECT_THEME key exactly — these aliases catch the common
// short forms; title is also tried since course titles are often the real subject
// name (e.g. title "Kinyarwanda" for a course whose subject field is just "Language").
const COURSE_SUBJECT_ALIASES = {
    "math": "Mathematics", "maths": "Mathematics",
    "cs": "Computer Science", "compsci": "Computer Science", "ict": "ICT",
};

// Built lazily (not at module-eval time) since SUBJECT_THEME is defined further down
// this file — by the time a course card actually renders, the whole script has already
// run once, so SUBJECT_THEME is safely available.
let _subjectThemeLookup = null;

function courseTheme(c) {
    if (!_subjectThemeLookup) {
        _subjectThemeLookup = {};
        for (const key of Object.keys(SUBJECT_THEME)) {
            _subjectThemeLookup[key.trim().toLowerCase()] = SUBJECT_THEME[key];
        }
    }
    // Case/whitespace-insensitive: a facilitator's freeform "Subject" field might be
    // typed as "biology", "Biology ", "BIOLOGY", etc. — all should still match.
    const candidates = [c.subject, c.title].filter(Boolean).map(s => s.trim().toLowerCase());
    for (const key of candidates) {
        if (_subjectThemeLookup[key]) return _subjectThemeLookup[key];
    }
    for (const key of candidates) {
        const alias = COURSE_SUBJECT_ALIASES[key];
        if (alias) {
            const theme = _subjectThemeLookup[alias.toLowerCase()];
            if (theme) return theme;
        }
    }
    return null;
}

function courseHeaderStyle(theme, fallbackColor) {
    if (theme && theme.img) {
        return `background-image:linear-gradient(180deg,rgba(20,20,30,.1),rgba(10,10,20,.65)),url('${theme.img}');background-size:cover;background-position:center`;
    }
    return `background:${fallbackColor || "#2f6df6"}`;
}

async function loadEnrolled() {
    const el = document.getElementById("enrolledGrid");
    try {
        const data = await apiGet("/courses/my");
        const list = Array.isArray(data) ? data : [];
        if (!list.length) { el.innerHTML = '<p class="empty">Not enrolled in any courses yet.</p>'; return; }
        el.innerHTML = list.map(item => {
            const c = item.course || item;
            const prog = item.enrollment?.progress_percent || 0;
            const theme = courseTheme(c);
            return `<div class="ccard" onclick="openCourseDetail(${c.id},'${esc(c.title)}','${esc(c.subject||'')}','${c.cover_color||'#1f4fa3'}')">
              <div class="ccard-hd" style="${courseHeaderStyle(theme, c.cover_color)}">${theme ? theme.icon : "📚"}</div>
              <div class="ccard-bd">
                <h4>${c.title}</h4>
                <p>${c.description || "No description."}</p>
                <div class="meta">
                  ${c.subject ? `<span class="tag">${c.subject}</span>` : ""}
                  ${c.grade_level ? `<span class="tag">${c.grade_level}</span>` : ""}
                  ${c.facilitator_name ? `<span class="tag">👤 ${c.facilitator_name}</span>` : ""}
                </div>
                <div style="margin-top:8px;font-size:11px;color:#666">Progress: ${prog}%</div>
                <div class="pbar-wrap"><div class="pbar" style="width:${prog}%"></div></div>
                <span class="tag" style="background:#e8f0fe;color:#1a56bd;margin-top:8px;display:inline-block">✓ Enrolled — Click to view</span>
              </div>
            </div>`;
        }).join("");
    } catch (e) { el.innerHTML = '<p class="empty">Failed to load.</p>'; }
}

async function loadAllCourses() {
    const el = document.getElementById("browseGrid");
    el.innerHTML = '<p class="empty">Loading…</p>';
    const subject = document.getElementById("csubject").value;
    const grade   = document.getElementById("cgrade").value;
    let url = "/courses/?";
    if (subject) url += `subject=${encodeURIComponent(subject)}&`;
    if (grade)   url += `grade=${encodeURIComponent(grade)}`;
    try {
        const allCourses = await apiGet(url);
        const enrolled   = await apiGet("/courses/my").catch(() => []);
        const enrolledIds = new Set((Array.isArray(enrolled) ? enrolled : []).map(e => (e.course || e).id));
        const list = Array.isArray(allCourses) ? allCourses : [];
        if (!list.length) { el.innerHTML = '<p class="empty">No courses available.</p>'; return; }
        el.innerHTML = list.map(c => courseCard(c, enrolledIds.has(c.id))).join("");
    } catch (e) { el.innerHTML = '<p class="empty">Failed to load.</p>'; }
}

async function loadPublic() {
    const el = document.getElementById("publicGrid");
    el.innerHTML = '<p class="empty">Loading…</p>';
    try {
        const allCourses = await apiGet("/courses/");
        const enrolled   = await apiGet("/courses/my").catch(() => []);
        const enrolledIds = new Set((Array.isArray(enrolled) ? enrolled : []).map(e => (e.course || e).id));
        const pub = (Array.isArray(allCourses) ? allCourses : []).filter(c => c.is_public);
        if (!pub.length) { el.innerHTML = '<p class="empty">No public courses available.</p>'; return; }
        el.innerHTML = pub.map(c => courseCard(c, enrolledIds.has(c.id))).join("");
    } catch (e) { el.innerHTML = '<p class="empty">Failed to load.</p>'; }
}

function courseCard(c, alreadyEnrolled = false) {
    const theme = courseTheme(c);
    return `<div class="ccard">
      <div class="ccard-hd" style="${courseHeaderStyle(theme, c.cover_color)}">${theme ? theme.icon : "📚"}</div>
      <div class="ccard-bd">
        <h4>${c.title}</h4>
        <p>${c.description || "No description."}</p>
        <div class="meta">
          ${c.subject ? `<span class="tag">${c.subject}</span>` : ""}
          ${c.grade_level ? `<span class="tag">${c.grade_level}</span>` : ""}
          ${c.facilitator_name ? `<span class="tag">👤 ${c.facilitator_name}</span>` : ""}
          ${c.is_public ? '<span class="tag" style="background:#e8f5ee;color:#1a5c3a">Public</span>' : ""}
        </div>
        ${alreadyEnrolled
          ? '<span class="tag" style="background:#e8f0fe;color:#1a56bd;margin-top:8px;display:inline-block">✓ Enrolled</span>'
          : c.is_public
            ? `<button class="btn-enroll" onclick="enroll(${c.id}, this)">+ Enroll</button>`
            : '<span class="tag" style="background:#f4f4f4;color:#888;margin-top:8px;display:inline-block">🔒 Private — invitation only</span>'}
      </div>
    </div>`;
}

async function enroll(courseId, btn) {
    if (btn) { btn.disabled = true; btn.textContent = "Enrolling…"; }
    try {
        await apiPost(`/courses/${courseId}/enroll`, {});
        if (btn) { btn.textContent = "✓ Enrolled"; btn.style.background = "#27ae60"; }
        loadEnrolled();
        showToast("Successfully enrolled!");
    } catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = "+ Enroll"; }
        showToast(e.message || "Could not enroll.", "error");
    }
}

// ── COURSE DETAIL (for enrolled students) ──
let activeCourseDetailId = null;
let activeDetailSubject  = "";

// ── COURSE DETAIL (tabbed) ────────────────────────────────────────────────────
let _cdDetail = null;   // full course detail from API

async function openCourseDetail(courseId, title, subject, coverColor) {
    activeCourseDetailId = courseId;
    activeDetailSubject  = subject;
    document.querySelectorAll("#sec-courses .tab-body").forEach(b => b.classList.add("hidden-for-detail"));
    document.querySelector("#sec-courses .sec-head").classList.add("hidden-for-detail");

    const sideTitle = document.getElementById("cdSideTitle");
    if (sideTitle) sideTitle.textContent = `${subject || "Course"}`;

    const bc = document.getElementById("cdBreadcrumb");
    if (bc) bc.innerHTML = `
      <span class="crumb" onclick="switchCdTab('home')">${esc(title)}</span>
      <span class="sep"> &rsaquo; </span>
      <span class="cur" id="cdBreadCur">Home</span>`;

    document.getElementById("courseDetailPanel").classList.remove("hidden");

    document.querySelectorAll("#cdTabBar .cdtab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".cdpane").forEach(p => p.classList.remove("active"));
    document.querySelector("#cdTabBar .cdtab[data-tab='home']").classList.add("active");
    document.getElementById("cdpane-home").classList.add("active");

    if (!document.getElementById("cdTabBar")._wired) {
        document.getElementById("cdTabBar")._wired = true;
        document.querySelectorAll("#cdTabBar .cdtab").forEach(btn => {
            btn.addEventListener("click", () => switchCdTab(btn.dataset.tab));
        });
    }
    _cdDetail = null;
    loadCdTab("home");
}

function closeCourseDetail() {
    document.getElementById("courseDetailPanel").classList.add("hidden");
    document.querySelectorAll("#sec-courses .hidden-for-detail").forEach(el => el.classList.remove("hidden-for-detail"));
    activeCourseDetailId = null;
    _cdDetail = null;
}

function switchCdTab(tab) {
    document.querySelectorAll("#cdTabBar .cdtab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
    document.querySelectorAll(".cdpane").forEach(p => p.classList.toggle("active", p.id === `cdpane-${tab}`));
    const cur = document.getElementById("cdBreadCur");
    if (cur) {
        const labels = {home:"Home",announcements:"Announcements",assignments:"Assignments",
            discussions:"Discussions",grades:"Grades",people:"People",
            syllabus:"Syllabus",modules:"Modules",chats:"Course Chat"};
        cur.textContent = labels[tab] || tab;
    }
    // Reset assignment detail to list when switching back to assignments
    if (tab === "assignments") {
        document.getElementById("cdAsgListWrap")?.classList.remove("hidden");
        document.getElementById("cdAsgDetail")?.classList.add("hidden");
    }
    loadCdTab(tab);
}

async function loadCdTab(tab) {
    const id = activeCourseDetailId;
    if (!id) return;
    // Fetch course detail once and cache
    if (!_cdDetail) {
        try { _cdDetail = await apiGet(`/courses/${id}`); }
        catch(e) { return; }
    }
    const c = _cdDetail;
    switch(tab) {
        case "home":         renderCdHome(c); break;
        case "announcements":loadCdAnnouncements(id); break;
        case "assignments":  renderCdAssignments(c); break;
        case "discussions":  loadCdDiscussions(id); break;
        case "grades":       renderCdGrades(c); break;
        case "people":       renderCdPeople(c); switchPeopleTab("members"); break;
        case "syllabus":     loadCdSyllabus(id); break;
        case "modules":      renderCdModules(c); break;
        case "chats":        loadCdChats(id); break;
    }
}

function renderCdHome(c) {
    const me   = getUser()?.id;
    const enr  = (c.enrollments||[]).find(e => e.student_id == me) || {};
    const prog = enr.progress_percent || 0;
    const pass = enr.pass_status || "in_progress";
    const passLabel = pass==="passed" ? "✓ Passed" : pass==="retake" ? "↩ Retake" : "In Progress";
    const passCol   = pass==="passed" ? "#1a8a5a" : pass==="retake" ? "#c0392b" : "#c47f00";
    const progCol   = prog>=55 ? "#2f6df6" : "#f39c12";

    document.getElementById("cdHomeContent").innerHTML = `
      <div class="cd-home-hero">
        <h2>${esc(c.title)}</h2>
        <p>${esc(c.description || "No description available for this course.")}</p>
        ${c.facilitator_name ? `<div class="cd-home-instructor">👤 Taught by <strong>${esc(c.facilitator_name)}</strong> &nbsp;·&nbsp; ${esc(c.subject||"")} &nbsp;·&nbsp; ${esc(c.grade_level||"")}</div>` : ""}
      </div>

      <div class="cd-progress-section">
        <label>Your Progress &nbsp; <span style="color:${passCol};font-weight:700">${passLabel}</span></label>
        <div class="cd-prog-bar-bg">
          <div class="cd-prog-bar-fill" style="width:${prog}%;background:${progCol}"></div>
        </div>
        <div class="cd-prog-meta">
          <span>${prog}% complete</span>
          <span style="color:#bbb">·</span>
          <span>${(c.modules||[]).length} modules</span>
          <span style="color:#bbb">·</span>
          <span>${(c.assignments||[]).length} assignments</span>
        </div>
      </div>

      <div class="cd-quick-nav">
        <button class="cd-quick-btn" onclick="switchCdTab('syllabus')">📅 Syllabus</button>
        <button class="cd-quick-btn" onclick="switchCdTab('assignments')">📝 Assignments</button>
        <button class="cd-quick-btn" onclick="switchCdTab('grades')">📊 Grades</button>
        <button class="cd-quick-btn" onclick="switchCdTab('modules')">📘 Modules</button>
        <button class="cd-quick-btn" onclick="switchCdTab('discussions')">💬 Discussions</button>
      </div>`;
}

async function loadCdAnnouncements(courseId) {
    const el = document.getElementById("cdAnnList");
    el.innerHTML = '<p class="empty">Loading…</p>';
    try {
        const anns = await apiGet(`/courses/${courseId}/announcements`) || [];
        el.innerHTML = anns.length
            ? anns.map(a => `
              <div class="ann-card">
                <div class="ann-head">
                  <strong>${esc(a.title)}</strong>
                  <small>${new Date(a.created_at).toLocaleDateString()} · ${esc(a.author_name)}</small>
                </div>
                <p>${esc(a.content)}</p>
              </div>`).join("")
            : '<p class="empty">No announcements yet.</p>';
    } catch(e) { el.innerHTML = '<p class="empty">Failed to load.</p>'; }
}

let _cdAsgCache = [];

async function renderCdAssignments(c) {
    const el = document.getElementById("cdAsgList");
    try {
        const data = await apiGet("/assignments/");
        const all  = [...(data.upcoming||[]), ...(data.submitted||[])];
        _cdAsgCache = all.filter(a => a.course_id == activeCourseDetailId);

        if (!_cdAsgCache.length) {
            el.innerHTML = '<p class="empty">No assignments for this course.</p>';
            return;
        }
        // Group: upcoming / submitted
        const upcoming  = _cdAsgCache.filter(a => !a.student_submission_id);
        const submitted = _cdAsgCache.filter(a =>  a.student_submission_id);

        const rowHtml = (a) => {
            const due  = a.due_date ? new Date(a.due_date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "No due date";
            let statusHtml = "";
            if (a.student_grade != null) statusHtml = `<span class="cd-asg-status graded">✓ Graded ${a.student_grade}/${a.max_score}</span>`;
            else if (a.student_submission_id) statusHtml = `<span class="cd-asg-status submitted">✓ Submitted</span>`;
            else statusHtml = `<span class="cd-asg-status pending">Not submitted</span>`;
            return `<div class="cd-asg-row" onclick="openCdAssignment(${a.id})">
              <span class="cd-asg-icon">📝</span>
              <div class="cd-asg-main">
                <div class="cd-asg-title">${esc(a.title)} ${statusHtml}</div>
                <div class="cd-asg-meta">
                  <span>Due: ${due}</span>
                  ${a.type ? `<span>Type: ${esc(a.type)}</span>` : ""}
                </div>
              </div>
              <div class="cd-asg-pts">${a.max_score != null ? a.max_score+" pts" : ""}</div>
            </div>`;
        };

        el.innerHTML = `
          ${upcoming.length ? `<div class="cd-asg-group"><div class="cd-asg-group-title">Upcoming</div>${upcoming.map(rowHtml).join("")}</div>` : ""}
          ${submitted.length ? `<div class="cd-asg-group"><div class="cd-asg-group-title">Submitted</div>${submitted.map(rowHtml).join("")}</div>` : ""}`;
    } catch(e) { el.innerHTML = '<p class="empty">Failed to load.</p>'; }
}

function openCdAssignment(asgId) {
    const a = _cdAsgCache.find(x => x.id === asgId);
    if (!a) return;
    document.getElementById("cdAsgListWrap").classList.add("hidden");
    const detail = document.getElementById("cdAsgDetail");
    detail.classList.remove("hidden");

    const fmtDate = d => d ? new Date(d).toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : null;
    const due     = fmtDate(a.due_date) || "No due date";
    const avail   = a.available_from
        ? `${new Date(a.available_from).toLocaleDateString("en-US",{month:"short",day:"numeric"})} at 12am – ${a.due_date ? new Date(a.due_date).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : ""}`
        : "Always available";

    const cur = document.getElementById("cdBreadCur");
    if (cur) cur.textContent = a.title;

    detail.innerHTML = `
      <div class="cd-asg-detail-wrap">
        <button class="cd-asg-back-link" onclick="closeCdAssignment()">&#8592; Assignments</button>

        <div class="cd-asg-detail-top">
          <h2>${esc(a.title)}</h2>
          <button class="btn-start-asg" onclick="openAssignmentDetail(${a.id})">Start Assignment</button>
        </div>

        <hr class="cd-asg-divider">

        <div class="cd-meta-lines">
          <div class="cd-meta-line">
            <strong>Due</strong>${due}<span class="meta-gap"></span>
            <strong>Points</strong>${a.max_score != null ? a.max_score : "—"}<span class="meta-gap"></span>
            <strong>Submitting</strong>${esc(a.type || "a text entry")}
          </div>
          ${a.student_submission_id != null ? `
          <div class="cd-meta-line">
            <strong>Attempts</strong>${a.student_submission_id ? "1" : "0"}<span class="meta-gap"></span>
            <strong>Allowed Attempts</strong>unlimited
          </div>` : ""}
          <div class="cd-meta-line">
            <strong>Available</strong>${avail}
          </div>
          ${a.student_grade != null ? `
          <div class="cd-meta-line">
            <strong>Your Grade</strong><span style="color:#1a8a5a;font-weight:700">${a.student_grade} / ${a.max_score}</span>
          </div>` : ""}
        </div>

        <hr class="cd-asg-divider">

        ${a.description ? `
        <div class="cd-asg-prompt-label">Prompt</div>
        <div class="cd-asg-prompt-body">${esc(a.description).split('\n').map(p=>p?`<p>${p}</p>`:'').join('')}</div>` :
        `<div class="cd-asg-prompt-label">Instructions</div>
         <div class="cd-asg-prompt-body"><p>No additional instructions provided. Click <em>Start Assignment</em> to begin your submission.</p></div>`}
      </div>`;
}

function closeCdAssignment() {
    document.getElementById("cdAsgListWrap").classList.remove("hidden");
    document.getElementById("cdAsgDetail").classList.add("hidden");
    const cur = document.getElementById("cdBreadCur");
    if (cur) cur.textContent = "Assignments";
}

let _discList = [];
async function loadCdDiscussions(courseId) {
    const el = document.getElementById("cdDiscList");
    el.innerHTML = '<p class="empty">Loading…</p>';
    try {
        _discList = await apiGet(`/courses/${courseId}/discussions`) || [];
        renderDiscussions();
    } catch(e) { el.innerHTML = '<p class="empty">Failed to load.</p>'; }
}

function renderDiscussions() {
    const el = document.getElementById("cdDiscList");
    el.innerHTML = _discList.length
        ? _discList.map(d => `
          <div class="disc-card" id="disc-${d.id}">
            <div class="disc-head" onclick="toggleDisc(${d.id})">
              <strong>${esc(d.title)}</strong>
              <small>${esc(d.author_name)} · ${new Date(d.created_at).toLocaleDateString()} · ${d.replies.length} replies</small>
            </div>
            <div class="disc-body hidden" id="disc-body-${d.id}">
              <p>${esc(d.body)}</p>
              <div class="disc-replies">
                ${d.replies.map(r => `
                  <div class="disc-reply">
                    <strong>${esc(r.author_name)}</strong>: ${esc(r.body)}
                    <small>${new Date(r.created_at).toLocaleDateString()}</small>
                  </div>`).join("")}
              </div>
              <div class="disc-reply-form">
                <textarea id="reply-${d.id}" placeholder="Write a reply…" rows="2"></textarea>
                <button class="btn-tiny" onclick="postReply(${d.id})">Reply</button>
              </div>
            </div>
          </div>`).join("")
        : '<p class="empty">No discussions yet. Start one above.</p>';
}

function toggleDisc(discId) {
    document.getElementById(`disc-body-${discId}`).classList.toggle("hidden");
}

async function postDiscussion() {
    const title = document.getElementById("discTitle").value.trim();
    const body  = document.getElementById("discBody").value.trim();
    if (!title || !body) { showToast("Title and body required.", "error"); return; }
    try {
        const d = await apiPost(`/courses/${activeCourseDetailId}/discussions`, { title, body });
        _discList.unshift(d);
        renderDiscussions();
        document.getElementById("discTitle").value = "";
        document.getElementById("discBody").value  = "";
        showToast("Discussion posted!");
    } catch(e) { showToast(e.message || "Failed to post.", "error"); }
}

async function postReply(discId) {
    const ta   = document.getElementById(`reply-${discId}`);
    const body = ta.value.trim();
    if (!body) return;
    try {
        const r = await apiPost(`/courses/${activeCourseDetailId}/discussions/${discId}/replies`, { body });
        const disc = _discList.find(d => d.id === discId);
        if (disc) { disc.replies.push(r); renderDiscussions(); toggleDisc(discId); }
        showToast("Reply posted!");
    } catch(e) { showToast(e.message || "Failed.", "error"); }
}

function renderCdGrades(c) {
    const el = document.getElementById("cdGradeList");
    apiGet("/assignments/").then(data => {
        const all = [...(data.upcoming||[]), ...(data.submitted||[])];
        const forCourse = all.filter(a => a.course_id == activeCourseDetailId);
        const graded    = forCourse.filter(a => a.student_grade != null);
        const pending   = forCourse.filter(a => a.student_submission_id && a.student_grade == null);

        if (!forCourse.length) { el.innerHTML = '<p class="empty">No assignments in this course yet.</p>'; return; }

        const total = graded.reduce((s,a) => s + (a.student_grade||0), 0);
        const max   = graded.reduce((s,a) => s + (a.max_score||100), 0);
        const pct   = max ? Math.round(total/max*100) : 0;
        const r     = 36; const circ = 2*Math.PI*r;
        const dash  = (pct/100)*circ;
        const statusClass = pct>=55 ? 'pass' : pct>0 ? 'prog' : 'fail';
        const statusText  = pct>=55 ? '✓ Passing' : pct>0 ? '⏳ In Progress' : 'Not graded yet';

        el.innerHTML = `
          <div class="grade-overview">
            <div class="grade-ring-wrap">
              <svg class="grade-ring-svg" width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="${r}" fill="none" stroke="#e8edf8" stroke-width="8"/>
                <circle cx="45" cy="45" r="${r}" fill="none"
                  stroke="${pct>=55?'#2f6df6':pct>0?'#f39c12':'#e0e4ef'}" stroke-width="8"
                  stroke-linecap="round"
                  stroke-dasharray="${dash} ${circ}"
                  style="transition:stroke-dasharray .8s cubic-bezier(.4,0,.2,1)"/>
              </svg>
              <div class="grade-ring-text">
                <strong>${pct}%</strong><span>Grade</span>
              </div>
            </div>
            <div class="grade-overview-info">
              <h4>Overall Performance</h4>
              <p>${total} / ${max} points earned &nbsp;·&nbsp; ${graded.length} graded</p>
              ${pending.length ? `<p style="font-size:12px;color:#f39c12;margin:0">${pending.length} awaiting grade</p>` : ""}
              <span class="grade-status-badge ${statusClass}">${statusText}</span>
            </div>
          </div>
          <div class="grade-rows">
            ${graded.map(a => {
                const apct = a.max_score ? Math.round(a.student_grade/a.max_score*100) : 0;
                const col  = apct>=55 ? '#36b37e' : apct>0 ? '#f39c12' : '#e74c3c';
                return `
                <div class="grade-row">
                  <div class="grade-row-head">
                    <strong>${esc(a.title)}</strong>
                    <span class="grade-score">${a.student_grade} / ${a.max_score||'—'}</span>
                  </div>
                  <div class="grade-bar-wrap">
                    <div class="grade-bar-fill" style="width:${apct}%;background:${col}"></div>
                  </div>
                  <div class="grade-pct">${apct}% ${apct>=55?'· Passed':'· Needs improvement'}</div>
                </div>`;
            }).join("")}
            ${pending.map(a => `
              <div class="grade-row" style="opacity:.6">
                <div class="grade-row-head">
                  <strong>${esc(a.title)}</strong>
                  <span style="font-size:12px;color:#f39c12">⏳ Awaiting grade</span>
                </div>
              </div>`).join("")}
            ${forCourse.filter(a=>!a.student_submission_id).map(a => `
              <div class="grade-row" style="opacity:.45">
                <div class="grade-row-head">
                  <strong>${esc(a.title)}</strong>
                  <span style="font-size:12px;color:#aaa">Not submitted</span>
                </div>
              </div>`).join("")}
          </div>`;
    }).catch(() => { el.innerHTML = '<p class="empty">Failed to load grades.</p>'; });
}

function renderCdPeople(c) {
    const me       = getUser()?.id;
    const students = (c.enrollments||[]).map(e => e.student).filter(Boolean);
    const el = document.getElementById("cdPeopleList");
    const facInitials = c.facilitator_name
        ? c.facilitator_name.split(" ").map(w=>w[0]||"").join("").toUpperCase().slice(0,2)
        : "F";
    el.innerHTML = `
      ${c.facilitator_name ? `
        <div class="people-facilitator-card">
          <div class="people-fac-avatar">${esc(facInitials)}</div>
          <div class="people-fac-info">
            <strong>${esc(c.facilitator_name)}</strong>
            <span>Facilitator</span>
          </div>
        </div>` : ""}
      <div style="font-size:12px;font-weight:700;color:#8a9bc0;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px">
        ${students.length} Student${students.length!==1?'s':''} Enrolled
      </div>
      <div class="people-grid">
        ${students.map(s => {
          const initials = ((s.first_name||'?')[0]+(s.last_name||'?')[0]).toUpperCase();
          const name = esc((s.first_name||'')+" "+(s.last_name||'')).trim() || "Student";
          const isMe = s.id == me;
          return `<div class="people-member-card ${isMe?'is-me':''}">
            <div class="p-avatar">${initials}</div>
            <div class="p-name">${name}</div>
            ${isMe ? '<div class="p-you-badge">You</div>' : ''}
          </div>`;
        }).join("")}
        ${!students.length ? '<p class="empty">No students enrolled.</p>' : ""}
      </div>`;

    // Load groups for the groups tab
    loadCdGroups(activeCourseDetailId);
}

async function loadCdGroups(courseId) {
    const el = document.getElementById("cdGroupsList");
    el.innerHTML = '<p class="empty">Loading groups…</p>';
    const me = getUser()?.id;
    try {
        const groups = await apiGet(`/courses/${courseId}/groups`) || [];
        if (!groups.length) {
            el.innerHTML = '<p class="empty" style="text-align:center;padding:30px 0">No groups have been created yet.</p>';
            return;
        }
        el.innerHTML = `<div class="groups-section">${groups.map(g => {
            const isMy = g.members.some(m => m.student_id == me);
            return `<div class="group-card ${isMy?'my-group':''}">
              <div class="group-card-head">
                <div class="group-name">${esc(g.name)}</div>
                ${isMy ? '<span class="group-my-badge">Your Group</span>' : ''}
                <span class="group-count">${g.members.length} member${g.members.length!==1?'s':''}</span>
              </div>
              <div class="group-members-list">
                ${g.members.length
                  ? g.members.map(m => {
                      const initials = m.student_name.split(" ").map(w=>w[0]||"").join("").toUpperCase().slice(0,2)||"?";
                      const isMe2 = m.student_id == me;
                      return `<div class="group-member-chip ${isMe2?'is-me':''}">
                        <div class="gm-avatar">${initials}</div>
                        ${esc(m.student_name)}${isMe2?' (You)':''}
                      </div>`;
                    }).join("")
                  : '<span style="font-size:12px;color:#aaa">No members yet</span>'}
              </div>
            </div>`;
        }).join("")}</div>`;
    } catch(e) { el.innerHTML = '<p class="empty">Failed to load groups.</p>'; }
}

function switchPeopleTab(tab) {
    document.querySelectorAll(".ptab").forEach(b => b.classList.toggle("active", b.dataset.ptab===tab));
    document.querySelectorAll(".ppane").forEach(p => p.classList.toggle("active", p.id===`ppane-${tab}`));
}

let _sylWeeks = [], _sylIdx = 0, _sylBooks = [];

async function loadCdSyllabus(courseId) {
    const listEl   = document.getElementById("cdSylList");
    const detailEl = document.getElementById("cdSylDetail");
    listEl.innerHTML   = '<p class="empty" style="padding:16px">Loading…</p>';
    detailEl.innerHTML = '<div class="syl-detail-empty">← Select a week or book</div>';

    // Fetch weeks and books in parallel
    const [weeksResult, booksResult] = await Promise.allSettled([
        apiGet(`/courses/${courseId}/syllabus`),
        apiGet(`/resources/?subject=${encodeURIComponent(activeDetailSubject || "")}`),
    ]);

    _sylWeeks = weeksResult.status === "fulfilled" ? (weeksResult.value || []) : [];
    const booksData = booksResult.status === "fulfilled" ? booksResult.value : {};
    _sylBooks = [
        ...(booksData.textbooks    || []),
        ...(booksData.uploaded     || []),
    ];

    renderSylList();
    if (_sylWeeks.length) selectSylWeek(0);
}

function renderSylList() {
    const el = document.getElementById("cdSylList");
    let html = "";

    // ── Weeks section ──
    if (_sylWeeks.length) {
        html += `<div class="syl-section-label">📅 Weekly Schedule</div>`;
        html += _sylWeeks.map((w, i) => `
          <button class="syl-week-btn ${i===_sylIdx ? 'active' : ''}" onclick="selectSylWeek(${i})">
            <span class="syl-wk-num">Wk ${w.week_num}</span>
            <span class="syl-wk-title">${esc(w.title)}</span>
          </button>`).join("");
    } else {
        html += `<div class="syl-section-label">📅 Weekly Schedule</div>
                 <div class="syl-empty-note">No syllabus posted yet.</div>`;
    }

    // ── Books section ──
    html += `<div class="syl-section-label" style="margin-top:14px">📚 Course Books</div>`;
    if (_sylBooks.length) {
        html += _sylBooks.map((b, i) => `
          <button class="syl-book-btn" onclick="openSylBook(${i})" title="${esc(b.title)}">
            <span class="syl-book-icon">📖</span>
            <div class="syl-book-info">
              <div class="syl-book-title">${esc(b.title)}</div>
              ${b.grade_level ? `<div class="syl-book-meta">${esc(b.grade_level)}</div>` : ""}
            </div>
          </button>`).join("");
    } else {
        html += `<div class="syl-empty-note">No books available for this subject.</div>`;
    }

    el.innerHTML = html;
}

function selectSylWeek(idx) {
    _sylIdx = idx;
    const w = _sylWeeks[idx];
    if (!w) return;

    // Clear book active state, set week active
    document.querySelectorAll(".syl-week-btn").forEach((b, i) => b.classList.toggle("active", i === idx));
    document.querySelectorAll(".syl-book-btn").forEach(b => b.classList.remove("active"));

    const topics = w.topics ? w.topics.split('\n').filter(Boolean) : [];
    const total  = _sylWeeks.length;
    document.getElementById("cdSylDetail").innerHTML = `
      <div class="syl-detail-head">
        <h4>Week ${w.week_num}: ${esc(w.title)}</h4>
        ${w.description ? `<p>${esc(w.description)}</p>` : ""}
      </div>
      ${topics.length ? `
        <div class="syl-detail-topics">
          <h5>Topics covered</h5>
          ${topics.map(t => `
            <div class="syl-topic-item">
              <div class="syl-topic-dot"></div>
              <span>${esc(t)}</span>
            </div>`).join("")}
        </div>` : ""}
      <div class="syl-nav">
        <button class="pnav-btn" onclick="selectSylWeek(${idx-1})" ${idx===0?'disabled':''}>← Previous</button>
        <span class="syl-nav-info">Week ${idx+1} of ${total}</span>
        <button class="pnav-btn" onclick="selectSylWeek(${idx+1})" ${idx===total-1?'disabled':''}>Next →</button>
      </div>`;
}

function openSylBook(idx) {
    const book = _sylBooks[idx];
    if (!book) return;

    // Highlight book, clear week highlight
    document.querySelectorAll(".syl-book-btn").forEach((b, i) => b.classList.toggle("active", i === idx));
    document.querySelectorAll(".syl-week-btn").forEach(b => b.classList.remove("active"));

    const token = getToken() || "";
    const url   = `${book.url}${book.url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;

    document.getElementById("cdSylDetail").innerHTML = `
      <div class="syl-book-viewer">
        <div class="syl-book-viewer-header">
          <div class="syl-book-viewer-title">
            <span class="syl-bv-icon">📖</span>
            <div>
              <div class="syl-bv-name">${esc(book.title)}</div>
              ${book.subject ? `<div class="syl-bv-sub">${esc(book.subject)}${book.grade_level ? ' · ' + esc(book.grade_level) : ''}</div>` : ''}
            </div>
          </div>
          <a class="syl-bv-download" href="${url}" target="_blank" title="Open in new tab">↗ Open</a>
        </div>
        <iframe
          class="syl-book-iframe"
          src="${url}"
          title="${esc(book.title)}"
        ></iframe>
      </div>`;
}

function renderCdModules(c) {
    const modules = c.modules || [];
    const el = document.getElementById("studentModuleList");
    el.innerHTML = modules.length
        ? modules.map(m => `
            <li class="module-item" id="mi-${m.id}">
              <div class="mi-text">
                <strong>${esc(m.title)}</strong>
                ${m.content ? `<p>${esc(m.content)}</p>` : ""}
              </div>
              <button class="btn-complete" onclick="completeModule(${activeCourseDetailId},${m.id},this)">✓ Complete</button>
            </li>`).join("")
        : '<li style="color:#aaa;font-style:italic">No modules yet.</li>';
}

let _cdChatPoll = null;
async function loadCdChats(courseId) {
    clearInterval(_cdChatPoll);
    const ta = document.getElementById("cdChatText");
    if (ta) {
        ta.onkeydown = e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postCourseChat(); }
        };
    }
    await fetchCdChats(courseId);
    _cdChatPoll = setInterval(() => fetchCdChats(courseId), 8000);
}

async function fetchCdChats(courseId) {
    try {
        const msgs = await apiGet(`/messages/course/${courseId}`) || [];
        renderCdChatMsgs(msgs);
    } catch(e) {}
}

function renderCdChatMsgs(msgs) {
    const el = document.getElementById("cdChatMessages");
    if (!el) return;
    const me = getUser()?.id;
    if (!msgs.length) {
        el.innerHTML = '<div class="cd-chat-empty">No messages yet — start the conversation!</div>';
        return;
    }
    el.innerHTML = msgs.map(m => {
        const isMine = m.sender_id == me;
        const time = new Date(m.sent_at || m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const name = isMine ? "You" : (m.sender_name || "Student");
        return `
          <div class="cd-chat-msg ${isMine ? 'mine' : 'theirs'}">
            ${!isMine ? `<div class="cd-chat-avatar">${esc(name.charAt(0).toUpperCase())}</div>` : ''}
            <div class="cd-chat-msg-body">
              ${!isMine ? `<div class="cd-chat-sender">${esc(name)}</div>` : ''}
              <div class="cd-chat-bubble">${esc(m.content)}</div>
              <div class="cd-chat-time">${time}</div>
            </div>
          </div>`;
    }).join("");
    el.scrollTop = el.scrollHeight;
}

async function postCourseChat() {
    const ta = document.getElementById("cdChatText");
    const btn = document.getElementById("cdChatPostBtn");
    const content = ta.value.trim();
    if (!content) return;
    if (btn) { btn.disabled = true; btn.textContent = "Posting…"; }
    try {
        await apiPost("/messages", { course_id: activeCourseDetailId, content });
        ta.value = "";
        ta.focus();
        await fetchCdChats(activeCourseDetailId);
    } catch(e) {
        showToast(e.message || "Failed to post.", "error");
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Post"; }
    }
}

async function completeModule(courseId, moduleId, btn) {
    btn.disabled = true; btn.textContent = "Saving…";
    try {
        const res = await apiPost(`/courses/${courseId}/modules/${moduleId}/complete`, {});
        btn.textContent = "✓ Done";
        btn.style.background = "#27ae60";
        btn.style.color = "#fff";
        const li = document.getElementById(`mi-${moduleId}`);
        if (li) li.style.background = "#f0fff4";
        showToast(`Module completed! Progress: ${res.progress_percent}%`);
    } catch (e) {
        btn.disabled = false; btn.textContent = "✓ Complete";
        showToast(e.message || "Could not mark complete.", "error");
    }
}

// ── ASSIGNMENTS ──
let activeAssignData = null;
let activeSubmitType = "text";
const assignmentMap  = {};   // id → assignment object

async function loadAssignments() {
    try {
        const data = await apiGet("/assignments/");
        renderAsgn("upcomingList",  data.upcoming  || [], "upcoming");
        renderAsgn("submittedList", data.submitted || [], "submitted");
    } catch (e) { ["upcomingList","submittedList"].forEach(id =>
        document.getElementById(id).innerHTML = '<p class="empty">Failed to load.</p>'); }
}

function renderAsgn(id, list, type) {
    const el = document.getElementById(id);
    if (!list.length) { el.innerHTML = `<p class="empty">No ${type} assignments.</p>`; return; }
    list.forEach(a => { assignmentMap[a.id] = a; });
    el.innerHTML = list.map(a => `
        <div class="acard ${a.student_submission_id ? 'submitted' : ''}" onclick="openAssignmentDetail(${a.id})">
          <div class="info">
            <h4>${esc(a.title)}<span class="tbadge">${a.type || a.assignment_type || ''}</span></h4>
            <p>${esc(a.course_title || "General")}${a.description ? " — " + esc(a.description.slice(0,80)) : ""}</p>
            ${a.due_date ? `<p class="due">⏰ Due: ${new Date(a.due_date).toLocaleString()}</p>` : ""}
            ${a.student_grade != null ? `<span class="gbadge">Grade: ${a.student_grade}/${a.max_score}</span>` : ""}
            ${a.student_feedback ? `<p class="feedback-preview">💬 ${esc(a.student_feedback.slice(0,100))}</p>` : ""}
            ${a.attachment_url ? `<span class="tag" style="background:#e8f0fe;color:#2f6df6;font-size:11px">🔗 Has Link</span>` : ""}
            ${a.attachment_path ? `<span class="tag" style="background:#f3e8ff;color:#6c00c9;font-size:11px">📎 Has PDF</span>` : ""}
          </div>
          <span style="font-size:20px;color:#aaa">›</span>
        </div>`).join("");
}

function openAssignmentDetail(aOrId) {
    const a = (typeof aOrId === "number" || typeof aOrId === "string")
        ? assignmentMap[aOrId]
        : aOrId;
    if (!a) { showToast("Assignment not found", "error"); return; }
    activeAssignData  = a;
    activeSubmitType  = "text";

    // Hide assignment list, show detail panel
    document.querySelectorAll("#sec-assignments .tab-body").forEach(b => b.classList.add("hidden-for-detail"));
    document.querySelector("#sec-assignments .sec-head").classList.add("hidden-for-detail");
    document.getElementById("assignmentDetailPanel").classList.remove("hidden");

    document.getElementById("assignmentDetailContent").innerHTML = `
        <h2>${esc(a.title)}</h2>
        <div class="adetail-meta">
          <span class="tbadge">${a.type || a.assignment_type || "assignment"}</span>
          ${a.course_title ? `<span class="tag">📚 ${esc(a.course_title)}</span>` : ""}
          ${a.due_date ? `<span class="tag">⏰ ${new Date(a.due_date).toLocaleString()}</span>` : ""}
          <span class="tag">Max: ${a.max_score || 100}</span>
        </div>
        ${a.description ? `<p style="margin:12px 0;color:#555">${esc(a.description)}</p>` : ""}
        ${a.attachment_url ? `<div style="margin:10px 0"><a href="${esc(a.attachment_url)}" target="_blank" class="btn-s" style="display:inline-block">🔗 Open Attachment / Google Doc</a></div>` : ""}
        ${a.attachment_path ? `<div style="margin:10px 0"><a href="/uploads/${esc(a.attachment_path)}" target="_blank" class="btn-s" style="display:inline-block">📎 View Assignment PDF</a></div>` : ""}
    `;

    const existEl = document.getElementById("existingSubmission");
    const formEl  = document.getElementById("submitForm");

    if (a.student_submission_id) {
        existEl.style.display = "block";
        formEl.style.display  = "none";
        let subHtml = `<p style="color:#27ae60;font-weight:600">✓ Already submitted (${a.student_submission_type || 'text'})</p>`;
        if (a.student_grade != null) {
            subHtml += `<div class="grade-result">
                <h3>Grade: <span style="color:#2f6df6">${a.student_grade} / ${a.max_score}</span></h3>
                ${a.student_feedback ? `<p>💬 ${esc(a.student_feedback)}</p>` : ""}
            </div>`;
        } else {
            subHtml += '<p style="color:#888;font-size:13px">Awaiting grading…</p>';
        }
        if (a.student_submission_type === "link" && a.student_content) {
            subHtml += `<a href="${a.student_content}" target="_blank" class="btn-s" style="display:inline-block;margin-top:8px">🔗 Open Link</a>`;
        }
        if (a.student_submission_type === "pdf" && a.student_file_path) {
            subHtml += `<a href="/uploads/${a.student_file_path}" target="_blank" class="btn-s" style="display:inline-block;margin-top:8px">📄 View PDF</a>`;
        }
        existEl.innerHTML = subHtml;
    } else {
        existEl.style.display = "none";
        formEl.style.display  = "block";
        // reset form
        document.getElementById("submitContent").value = "";
        document.getElementById("submitLink").value    = "";
        document.getElementById("submitFile").value    = "";
        selectSubType(document.querySelector('.sub-type-btn[data-type="text"]'), "text");
    }

    // Load course resources
    loadCourseResources(a.course_id, a.course_title);
}

function closeAssignmentDetail() {
    document.getElementById("assignmentDetailPanel").classList.add("hidden");
    document.querySelectorAll("#sec-assignments .hidden-for-detail").forEach(el => el.classList.remove("hidden-for-detail"));
    activeAssignData = null;
}

function selectSubType(btn, type) {
    document.querySelectorAll(".sub-type-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    activeSubmitType = type;
    document.getElementById("sub-text-area").style.display = type === "text" ? "block" : "none";
    document.getElementById("sub-link-area").style.display = type === "link" ? "block" : "none";
    document.getElementById("sub-pdf-area").style.display  = type === "pdf"  ? "block" : "none";
}

async function loadCourseResources(courseId, courseTitle) {
    const el = document.getElementById("courseResourcesForAssignment");
    el.innerHTML = '<p class="empty">Loading…</p>';
    try {
        // Get resources matching the course subject
        const detail = courseId ? await apiGet(`/courses/${courseId}`) : null;
        const subject = detail?.subject || courseTitle;
        let url = "/resources/?";
        if (subject) url += `subject=${encodeURIComponent(subject)}`;
        const data = await apiGet(url);
        const all  = [...(data.textbooks||[]), ...(data.past_papers||[]), ...(data.uploaded||[])];
        if (!all.length) { el.innerHTML = '<p class="empty">No resources for this subject.</p>'; return; }
        el.innerHTML = all.slice(0,6).map(r => `
            <div class="mini-res-card">
              <span class="res-icon-sm">📄</span>
              <div>
                <strong>${esc(r.title)}</strong>
                <p>${r.subject || ""} ${r.grade_level ? "· " + r.grade_level : ""}</p>
              </div>
              <button onclick="openOrDlRes('${encodeURIComponent(r.file_path)}','${esc(r.title)}','${r.source||''}')" class="btn-tiny">Open</button>
            </div>`).join("");
    } catch(e) { el.innerHTML = '<p class="empty">Could not load resources.</p>'; }
}

async function openOrDlRes(encodedPath, title, source) {
    if (source === "uploaded") {
        // served via /uploads/
        window.open(`/uploads/${decodeURIComponent(encodedPath)}`, "_blank");
        return;
    }
    // library download
    try {
        const res = await fetch(`/api/resources/download?path=${encodedPath}`,
            { headers: { Authorization: `Bearer ${getToken()}` } });
        if (!res.ok) { showToast("Download failed.", "error"); return; }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(await res.blob());
        a.download = decodeURIComponent(title) + ".pdf"; a.click();
    } catch(e) { showToast("Download failed.", "error"); }
}

async function doSubmit() {
    if (!activeAssignData) return;
    const id = activeAssignData.id;
    try {
        if (activeSubmitType === "pdf") {
            const fileInput = document.getElementById("submitFile");
            if (!fileInput.files[0]) { showToast("Please select a PDF file.", "error"); return; }
            const fd = new FormData();
            fd.append("file", fileInput.files[0]);
            await apiFetch(`/assignments/${id}/submit-file`, { method: "POST", body: fd });
        } else if (activeSubmitType === "link") {
            const link = document.getElementById("submitLink").value.trim();
            if (!link) { showToast("Please enter a URL.", "error"); return; }
            await apiPost(`/assignments/${id}/submit`, { content: link, submission_type: "link" });
        } else {
            const text = document.getElementById("submitContent").value.trim();
            if (!text) { showToast("Please write your answer.", "error"); return; }
            await apiPost(`/assignments/${id}/submit`, { content: text, submission_type: "text" });
        }
        showToast("Assignment submitted successfully!");
        closeAssignmentDetail();
        loadAssignments();
    } catch (e) { showToast(e.message || "Submission failed.", "error"); }
}

// ── PROGRESS ──
async function loadProgress() {
    const el = document.getElementById("progressGrid");
    try {
        const data = await apiGet("/courses/my");
        const list = Array.isArray(data) ? data : [];
        if (!list.length) { el.innerHTML = '<p class="empty">No courses found.</p>'; return; }
        el.innerHTML = list.map(item => {
            const c      = item.course || item;
            const enroll = item.enrollment || {};
            const prog   = enroll.progress_percent || 0;
            const status = enroll.pass_status || "in_progress";
            const badge  = status === "passed"
                ? `<span class="status-badge pass">✓ Passed</span>`
                : status === "retake"
                ? `<span class="status-badge retake">↩ Retake Required</span>`
                : `<span class="status-badge inprog">In Progress</span>`;
            return `<div class="pcard">
              <h4>${esc(c.title)}</h4>
              <div class="pbar-wrap"><div class="pbar" style="width:${prog}%"></div></div>
              <p style="font-size:12px;color:#666;margin:4px 0">${prog}% assignments graded</p>
              ${badge}
              <div class="pmeta" style="margin-top:8px">
                <span>📚 ${esc(c.subject)}</span>
                ${c.grade_level ? `<span>🎓 ${esc(c.grade_level)}</span>` : ""}
              </div>
            </div>`;
        }).join("");
    } catch (e) { el.innerHTML = '<p class="empty">Failed to load.</p>'; }
}

// ── RESOURCES ──

// Subject → { icon, img, credit } used as card art on the "Browse by Subject" catalog.
// Images are real photos from Wikimedia Commons (public domain / CC-licensed) — credit
// is shown on each card since several licenses (CC BY, CC BY-SA) require attribution.
const SUBJECT_THEME = {
    "Agriculture": { icon: "🌾", img: "../Assets/subjects/agriculture.jpg", credit: "Fredericknoronha / Wikimedia Commons (CC BY-SA 4.0)" },
    "Auditing": { icon: "📋", img: "../Assets/subjects/auditing.jpg", credit: "HABS / Wikimedia Commons (Public domain)" },
    "Biology": { icon: "🧬", img: "../Assets/subjects/biology.jpg", credit: "Scott L. Gardner / Wikimedia Commons (CC BY-SA 4.0)" },
    "Chemistry": { icon: "⚗️", img: "../Assets/subjects/chemistry.jpg", credit: "Belikov Maxim / Wikimedia Commons (CC BY 4.0)" },
    "Clinical Placement": { icon: "🏥", img: "../Assets/subjects/clinical-placement.jpg", credit: "U.S. Navy / Wikimedia Commons (Public domain)" },
    "Computer Science": { icon: "💻", img: "../Assets/subjects/computer-science.jpg", credit: "Crew crew / Wikimedia Commons (CC0)" },
    "Creative Arts Music and Fine Arts": { icon: "🎨", img: "../Assets/subjects/creative-arts-music-and-fine-arts.jpg", credit: "Bartolomeo Bettera / Wikimedia Commons (Public domain)" },
    "Creative Performance": { icon: "🎭", img: "../Assets/subjects/creative-performance.jpg", credit: "Arquivo histórico de Sarria / Wikimedia Commons (CC BY-SA 3.0)" },
    "Economics": { icon: "📈", img: "../Assets/subjects/economics.png", credit: "Nikolay Zvezdin / Wikimedia Commons (CC BY-SA 4.0)" },
    "English": { icon: "📖", img: "../Assets/subjects/english.jpg", credit: "Micheal Kaluba / Wikimedia Commons (CC BY-SA 4.0)" },
    "Entrepreneurship": { icon: "💡", img: "../Assets/subjects/entrepreneurship.jpg", credit: "Wikimedia Commons (CC0)" },
    "Ethics": { icon: "⚖️", img: "../Assets/subjects/ethics.jpg", credit: "Domenico Fetti / Wikimedia Commons (Public domain)" },
    "Financial Accounting": { icon: "💰", img: "../Assets/subjects/financial-accounting.jpg", credit: "Ken Lund / Wikimedia Commons (CC BY-SA 2.0)" },
    "Foundations of Education": { icon: "🎓", img: "../Assets/subjects/foundations-of-education.jpg", credit: "Harrison Keely / Wikimedia Commons (CC BY 4.0)" },
    "French": { icon: "🇫🇷", img: "../Assets/subjects/french.jpg", credit: "Getfunky Paris / Wikimedia Commons (CC BY 2.0)" },
    "Fundamentals of Nursing": { icon: "💉", img: "../Assets/subjects/clinical-placement.jpg", credit: "U.S. Navy / Wikimedia Commons (Public domain)" },
    "General Studies": { icon: "🧭", img: "../Assets/subjects/general-studies.jpg", credit: "Gary Todd / Wikimedia Commons (CC0)" },
    "Geography": { icon: "🌍", img: "../Assets/subjects/geography.jpg", credit: "Auguste Henri Dufour / Wikimedia Commons (Public domain)" },
    "History": { icon: "🏛️", img: "../Assets/subjects/history.jpg", credit: "Gary Todd / Wikimedia Commons (CC0)" },
    "History & Citizenship": { icon: "🏛️", img: "../Assets/subjects/history-citizenship.jpg", credit: "JJ Harrison / Wikimedia Commons (CC BY-SA 3.0)" },
    "Home Science": { icon: "🏠", img: "../Assets/subjects/home-science.jpg", credit: "Shixart1985 / Wikimedia Commons (CC BY 2.0)" },
    "ICT": { icon: "💻", img: "../Assets/subjects/ict.jpg", credit: "Bill Branson / Wikimedia Commons (Public domain)" },
    "ICT in Accounting": { icon: "🖥️", img: "../Assets/subjects/ict-in-accounting.jpg", credit: "Wikimedia Commons (CC0)" },
    "Integrated Science": { icon: "🔬", img: "../Assets/subjects/integrated-science.jpg", credit: "U.S. Department of Energy / Wikimedia Commons (Public domain)" },
    "Kinyarwanda": { icon: "🗣️", img: "../Assets/subjects/kinyarwanda.jpg", credit: "Ericnkurunziza / Wikimedia Commons (CC BY-SA 4.0)" },
    "Kiswahili": { icon: "🗣️", img: "../Assets/subjects/kiswahili.jpg", credit: "NASA Earth Observatory / Wikimedia Commons (Public domain)" },
    "Literature in English": { icon: "📚", img: "../Assets/subjects/literature-in-english.jpg", credit: "Wikimedia Commons (CC0)" },
    "Management Accounting": { icon: "📊", img: "../Assets/subjects/management-accounting.jpg", credit: "Traceries / Wikimedia Commons (Public domain)" },
    "Mathematics": { icon: "➗", img: "../Assets/subjects/mathematics.jpg", credit: "Manuelzapata04 / Wikimedia Commons (CC BY-SA 4.0)" },
    "Mathematics for Accounting": { icon: "🧮", img: "../Assets/subjects/mathematics-for-accounting.jpg", credit: "Coyau / Wikimedia Commons (CC BY-SA 3.0)" },
    "Medical Pathology": { icon: "🩺", img: "../Assets/subjects/medical-pathology.jpg", credit: "CDC / Wikimedia Commons (Public domain)" },
    "Music": { icon: "🎵", img: "../Assets/subjects/music.jpg", credit: "Maurizio Pesce / Wikimedia Commons (CC BY 2.0)" },
    "Physical Education": { icon: "⚽", img: "../Assets/subjects/physical-education.jpg", credit: "ThoroughlyReviewed / Wikimedia Commons (CC BY 2.0)" },
    "Physics": { icon: "⚛️", img: "../Assets/subjects/physics.jpg", credit: "Stanislav Liubauskas / Wikimedia Commons (CC BY 4.0)" },
    "Religion & Ethics": { icon: "🕊️", img: "../Assets/subjects/religion-ethics.jpg", credit: "Dragfyre / Wikimedia Commons (CC BY-SA 3.0)" },
    "Religious Studies": { icon: "🕊️", img: "../Assets/subjects/religion-ethics.jpg", credit: "Dragfyre / Wikimedia Commons (CC BY-SA 3.0)" },
    "Science and Elementary Technology": { icon: "🔧", img: "../Assets/subjects/science-and-elementary-technology.jpg", credit: "Wikimedia Commons (Public domain)" },
    "Social Studies": { icon: "🏘️", img: "../Assets/subjects/social-studies.jpg", credit: "Bembety / Wikimedia Commons (CC BY-SA 4.0)" },
    "Social and Religious Studies": { icon: "🏘️", img: "../Assets/subjects/religion-ethics.jpg", credit: "Dragfyre / Wikimedia Commons (CC BY-SA 3.0)" },
    "Special Education Needs": { icon: "🤝", img: "../Assets/subjects/special-education-needs.jpg", credit: "DFAT / Wikimedia Commons (CC BY 4.0)" },
    "Taxation": { icon: "🧾", img: "../Assets/subjects/taxation.jpg", credit: "Blogtrepreneur / Wikimedia Commons (CC BY 2.0)" },
};
const DEFAULT_SUBJECT_THEME = { icon: "📘", img: "", credit: "" };

let _subjectCatalog = null;

async function loadSubjectCatalog() {
    const el = document.getElementById("subjGrid");
    if (!_subjectCatalog) {
        el.innerHTML = '<p class="empty">Loading…</p>';
        try {
            _subjectCatalog = await apiGet("/resources/subjects") || [];
        } catch (e) {
            el.innerHTML = '<p class="empty">Failed to load.</p>';
            return;
        }
    }
    renderSubjectCatalog(filteredSubjectCatalog());
    updateResSummary();
}

// Applies the same subject/grade/search filters used by the Textbooks/Past
// Papers/Uploaded tabs to the subject catalog, so "Browse by Subject" isn't
// the one tab that ignores them.
function filteredSubjectCatalog() {
    const list = _subjectCatalog || [];
    const subject = document.getElementById("rsubject").value;
    const grade   = document.getElementById("rgrade").value;
    const search  = document.getElementById("rsearch").value.trim().toLowerCase();
    return list.filter(s => {
        if (subject && s.subject !== subject) return false;
        if (grade && !s.levels.includes(grade)) return false;
        if (search && !s.subject.toLowerCase().includes(search)) return false;
        return true;
    });
}

function getActiveResourceTab() {
    return document.querySelector('#sec-resources .tab.active')?.dataset.tab || "subjects";
}

// One place decides what resSummary says, based on whichever tab is actually visible —
// otherwise switching tabs with filters already set left a summary that matched the
// wrong grid (e.g. "3 results" shown while the still-unfiltered subject grid was up).
// Caches the last fetched counts so a plain tab switch (no filter change, no new
// fetch) can still show the right number instead of resetting to zero.
let _lastResourceCounts = { books: [], papers: [], uploaded: [] };

function updateResSummary(counts) {
    if (counts) _lastResourceCounts = counts;
    const { books, papers, uploaded } = _lastResourceCounts;
    const summary = document.getElementById("resSummary");
    const subject = document.getElementById("rsubject").value;
    const grade   = document.getElementById("rgrade").value;
    const search  = document.getElementById("rsearch").value.trim();
    if (!subject && !grade && !search) { summary.textContent = ""; return; }
    const suffix = `${subject ? " for " + subject : ""}${grade ? " · " + grade : ""}${search ? ' · "' + search + '"' : ""}`;
    if (getActiveResourceTab() === "subjects") {
        summary.textContent = `Showing ${filteredSubjectCatalog().length} subject(s)${suffix}`;
    } else {
        summary.textContent = `Showing ${books.length + papers.length + uploaded.length} result(s)${suffix}`;
    }
}

function renderSubjectCatalog(catalog) {
    const el = document.getElementById("subjGrid");
    if (!_subjectCatalog || !_subjectCatalog.length) { el.innerHTML = '<p class="empty">No subjects available yet.</p>'; return; }
    if (!catalog.length) { el.innerHTML = '<p class="empty">No subjects match your filters.</p>'; return; }
    el.innerHTML = catalog.map(s => {
        const theme = SUBJECT_THEME[s.subject] || DEFAULT_SUBJECT_THEME;
        const bg = theme.img
            ? `linear-gradient(180deg,rgba(20,20,30,.15),rgba(10,10,20,.75)),url('${theme.img}')`
            : "linear-gradient(135deg,#2f6df6,#5a8dff)";
        return `
        <div class="subj-card" style="background-image:${bg}" onclick="browseSubject('${esc(s.subject)}')">
          <div class="subj-icon">${theme.icon}</div>
          <h4>${esc(s.subject)}</h4>
          <div class="subj-levels">${s.levels.map(l => `<span class="subj-level-tag">${esc(l)}</span>`).join("")}</div>
          <div class="subj-count">${s.count} book${s.count === 1 ? "" : "s"}</div>
          ${theme.credit ? `<div class="subj-credit">📷 ${esc(theme.credit)}</div>` : ""}
        </div>`;
    }).join("");
}

async function browseSubject(subject) {
    const tabBtn = document.querySelector('#sec-resources .tab[data-tab="textbooks"]');
    if (tabBtn) activateTab(tabBtn);
    await ensureResourceFilterOptions();
    document.getElementById("rsubject").value = subject;
    document.getElementById("rgrade").value = "";
    loadResources();
}

let _resourceFilterOptions = null;

async function ensureResourceFilterOptions() {
    if (_resourceFilterOptions) return _resourceFilterOptions;
    try {
        const data = await apiGet("/resources/");   // unfiltered, so options cover the full library
        const all = [...(data.textbooks || []), ...(data.past_papers || []), ...(data.uploaded || [])];
        const subjects = [...new Set(all.map(r => r.subject).filter(Boolean))].sort();
        const grades   = [...new Set(all.map(r => r.grade_level).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        const subjSel  = document.getElementById("rsubject");
        const gradeSel = document.getElementById("rgrade");
        if (subjects.length) {
            const current = subjSel.value;
            subjSel.innerHTML = '<option value="">All Subjects</option>' +
                subjects.map(s => `<option${s === current ? " selected" : ""}>${esc(s)}</option>`).join("");
        }
        if (grades.length) {
            const current = gradeSel.value;
            gradeSel.innerHTML = '<option value="">All Grades</option>' +
                grades.map(g => `<option${g === current ? " selected" : ""}>${esc(g)}</option>`).join("");
        }
        _resourceFilterOptions = { subjects, grades };
    } catch (e) { /* keep the static fallback options already in the markup */ }
    return _resourceFilterOptions;
}

async function loadResources() {
    await ensureResourceFilterOptions();
    const subject = document.getElementById("rsubject").value;
    const grade   = document.getElementById("rgrade").value;
    const search  = document.getElementById("rsearch").value.trim().toLowerCase();

    if (_subjectCatalog) renderSubjectCatalog(filteredSubjectCatalog());

    const [tbEl, ppEl, upEl] = [
        document.getElementById("tbGrid"),
        document.getElementById("ppGrid"),
        document.getElementById("uploadedGrid"),
    ];
    tbEl.innerHTML = ppEl.innerHTML = upEl.innerHTML = '<p class="empty">Loading…</p>';
    try {
        let url = "/resources/?";
        if (subject) url += `subject=${encodeURIComponent(subject)}&`;
        const data = await apiGet(url);
        let books    = data.textbooks   || [];
        let papers   = data.past_papers || [];
        let uploaded = data.uploaded    || [];

        if (grade) {
            books    = books.filter(r => r.grade_level === grade);
            papers   = papers.filter(r => r.grade_level === grade || !r.grade_level);
            uploaded = uploaded.filter(r => !r.grade_level || r.grade_level === grade);
        }
        if (search) {
            const f = r => r.title.toLowerCase().includes(search) || (r.subject||"").toLowerCase().includes(search);
            books = books.filter(f); papers = papers.filter(f); uploaded = uploaded.filter(f);
        }

        updateResSummary({ books, papers, uploaded });

        renderRes(tbEl, books,    "textbook");
        renderRes(ppEl, papers,   "past_paper");
        renderRes(upEl, uploaded, "uploaded");
    } catch (e) { tbEl.innerHTML = ppEl.innerHTML = upEl.innerHTML = '<p class="empty">Failed to load.</p>'; }
}

function renderRes(el, items, type) {
    if (!items.length) { el.innerHTML = `<p class="empty">No ${type === "past_paper" ? "past papers" : type === "uploaded" ? "uploaded resources" : "textbooks"} found.</p>`; return; }
    el.innerHTML = items.map(r => {
        const url = r.url || (r.file_path ? (r.file_path.startsWith("http") ? r.file_path : `/uploads/${r.file_path}`) : "");
        return `
        <div class="rcard">
          <div class="rcard-icon">📄</div>
          <h4>${esc(r.title)}</h4>
          <div class="meta" style="margin:6px 0">
            <span class="tag">${esc(r.subject)}</span>
            ${r.grade_level ? `<span class="tag">${esc(r.grade_level)}</span>` : ""}
            ${r.year        ? `<span class="tag">${r.year}</span>`             : ""}
            <span class="tag" style="background:#f3e8ff;color:#3d0070">${esc((r.type||'').replace("_"," "))}</span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
            ${url ? `<button class="btn-sm" onclick="openPdf('${esc(url)}','${esc(r.title)}')">📖 View</button>` : ''}
            ${url ? `<a class="btn-sm btn-outline" href="${esc(url)}" target="_blank" download style="text-decoration:none">⬇ Download</a>` : ''}
          </div>
        </div>`;
    }).join("");
}

function openPdf(url, title) {
    // Append JWT token so the /serve endpoint works inside an iframe
    const token = getToken();
    const src = url.includes("/api/resources/serve") && token
        ? url + (url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(token)
        : url;
    document.getElementById("pdfViewerTitle").textContent = title || "Document";
    document.getElementById("pdfViewerFrame").src = src;
    document.getElementById("pdfDownloadLink").href = src;
    openModal("modalPdfViewer");
}


// ── MESSAGES (WhatsApp-style) ──
let _activeChatUserId = null;
let _activeChatName   = '';
let _allContacts      = [];
let _allChatPeople    = [];
let _chatPollInterval = null;

async function loadMessages() {
    await loadContacts();
}

async function loadContacts() {
    const el = document.getElementById("contactsList");
    if (!_allContacts.length) el.innerHTML = '<div class="empty-state">Loading…</div>';
    try {
        _allContacts = await apiGet("/messages/contacts") || [];
        renderContacts(_allContacts);
    } catch(e) { if (!_allContacts.length) el.innerHTML = '<div class="empty-state">Could not load conversations.</div>'; }
}

function renderContacts(list) {
    const el = document.getElementById("contactsList");
    if (!list.length) {
        el.innerHTML = '<p class="empty" style="padding:24px 12px;text-align:center">No conversations yet.<br>Press <strong>+ New</strong> to start one.</p>';
        return;
    }
    el.innerHTML = list.map(c => `
        <div class="contact-item ${_activeChatUserId == c.user_id ? 'active' : ''}" onclick="openChat(${c.user_id},'${esc(c.name)}','${esc(c.initials)}')">
          <div class="contact-avatar">${esc(c.initials)}</div>
          <div class="contact-info">
            <div class="contact-name">${esc(c.name)} <span class="contact-role">${esc(c.role)}</span></div>
            <div class="contact-last">${esc((c.last_message||'').slice(0,45))}</div>
          </div>
          <div class="contact-meta">
            <div class="contact-time">${c.last_time ? fmtTimeShort(c.last_time) : ''}</div>
            ${c.unread > 0 ? `<div class="contact-unread">${c.unread}</div>` : ''}
          </div>
        </div>`).join("");
}

function filterContacts() {
    const q = document.getElementById("chatContactSearch").value.toLowerCase();
    renderContacts(_allContacts.filter(c => c.name.toLowerCase().includes(q)));
}

async function openChat(userId, name, initials) {
    _activeChatUserId = userId;
    _activeChatName   = name;
    document.getElementById("chatEmptyState").classList.add("hidden");
    document.getElementById("chatThread").classList.remove("hidden");
    document.getElementById("chatPartnerInfo").innerHTML =
        `<div class="chat-avatar-sm">${esc(initials||name[0])}</div><div><strong>${esc(name)}</strong></div>`;
    document.getElementById("chatInput").value = "";
    renderContacts(_allContacts);
    await loadThread();
    if (_chatPollInterval) clearInterval(_chatPollInterval);
    _chatPollInterval = setInterval(loadThread, 5000);
}

async function loadThread() {
    if (!_activeChatUserId) return;
    try {
        const msgs = await apiGet(`/messages/conversation/${_activeChatUserId}`);
        const el = document.getElementById("chatMessages");
        if (!Array.isArray(msgs)) return;
        el.innerHTML = msgs.map(m => `
            <div class="chat-bubble-wrap ${m.is_mine ? 'mine' : 'theirs'}">
              <div class="chat-bubble">${esc(m.content)}</div>
              <div class="chat-bubble-time">${fmtTimeShort(m.sent_at)}</div>
            </div>`).join("");
        el.scrollTop = el.scrollHeight;
    } catch(e) {}
}

function closeThread() {
    _activeChatUserId = null;
    if (_chatPollInterval) { clearInterval(_chatPollInterval); _chatPollInterval = null; }
    document.getElementById("chatThread").classList.add("hidden");
    document.getElementById("chatEmptyState").classList.remove("hidden");
}

async function sendChatMessage() {
    const content = document.getElementById("chatInput").value.trim();
    if (!content || !_activeChatUserId) return;
    document.getElementById("chatInput").value = "";
    try {
        await apiPost("/messages", { receiver_id: _activeChatUserId, content });
        await loadThread();
    } catch(e) { showToast(e.message || "Could not send.", "error"); }
}

function chatKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
}

async function openNewChat() {
    _allChatPeople = await apiGet("/auth/users").catch(() => []) || [];
    document.getElementById("newChatSearch").value = "";
    renderNewChatPeople(_allChatPeople);
    openModal("modalNewChat");
}

function searchNewChatPeople() {
    const q = document.getElementById("newChatSearch").value.toLowerCase();
    renderNewChatPeople(_allChatPeople.filter(u =>
        (u.first_name + " " + u.last_name).toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
    ));
}

function renderNewChatPeople(list) {
    const el = document.getElementById("newChatPeopleList");
    if (!list.length) { el.innerHTML = '<p style="color:#aaa;text-align:center;padding:12px">No users found.</p>'; return; }
    el.innerHTML = list.map(u => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:6px;cursor:pointer;background:#f9fafb;margin-bottom:6px"
             onclick="startNewChat(${u.id},'${esc(u.first_name+' '+u.last_name)}','${esc(((u.first_name||'?')[0]+(u.last_name||'?')[0]).toUpperCase())}')">
          <div class="chat-avatar-sm">${((u.first_name||'?')[0]+(u.last_name||'?')[0]).toUpperCase()}</div>
          <div>
            <strong>${esc(u.first_name)} ${esc(u.last_name)}</strong>
            <p style="font-size:11px;color:#888;margin:0">${esc(u.email)} · ${esc(u.role)}</p>
          </div>
        </div>`).join("");
}

async function startNewChat(userId, name, initials) {
    closeModal("modalNewChat");
    if (!_allContacts.find(c => c.user_id === userId)) {
        _allContacts.unshift({ user_id: userId, name, initials, role: '', last_message: '', last_time: '', unread: 0 });
    }
    await openChat(userId, name, initials);
}

// Deprecated stubs
function loadInbox() {}
function loadSent() {}
function openComposeTo(userId, name) { startNewChat(userId, name, (name||'?')[0] + '?'); }
function sendMsg() {}

function fmtTimeShort(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// People tab (kept for backward compat)
let allPeople = [];

async function loadPeople() {
    const el = document.getElementById("peopleList");
    el.innerHTML = '<p class="empty">Loading…</p>';
    try {
        allPeople = await apiGet("/auth/users") || [];
        renderPeople(allPeople);
    } catch(e) { el.innerHTML = '<p class="empty">Failed to load users.</p>'; }
}

function renderPeople(list) {
    const el = document.getElementById("peopleList");
    if (!list.length) { el.innerHTML = '<p class="empty">No users found.</p>'; return; }
    el.innerHTML = list.map(u => `
        <div class="person-card">
          <div class="person-info">
            <div class="person-initials">${((u.first_name||'?')[0]+(u.last_name||'?')[0]).toUpperCase()}</div>
            <div>
              <strong>${u.first_name} ${u.last_name}</strong>
              <p>${u.email}</p>
              <span class="tag">${u.role}</span>${u.school ? `<span class="tag">${u.school}</span>` : ""}
            </div>
          </div>
          <button class="btn-p" onclick="openComposeTo(${u.id}, '${esc(u.first_name+' '+u.last_name)}')">✉ Message</button>
        </div>`).join("");
}

function searchPeople() {
    const q = document.getElementById("peopleSearch").value.toLowerCase();
    renderPeople(allPeople.filter(u =>
        (u.first_name + " " + u.last_name).toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    ));
}

function openComposeTo(userId, name) {
    document.getElementById("msgTo").value = userId;
    document.getElementById("composeToName").textContent = `To: ${name}`;
    document.getElementById("msgBody").value = "";
    openModal("composeModal");
}

async function sendMsg() {
    const to   = parseInt(document.getElementById("msgTo").value);
    const body = document.getElementById("msgBody").value.trim();
    if (!to || !body) { showToast("Please write a message.", "error"); return; }
    try {
        await apiPost("/messages", { receiver_id: to, content: body });
        closeModal("composeModal");
        showToast("Message sent!");
        loadSent();
        document.querySelector('.tab[data-tab="msgsent"]')?.click();
    } catch (e) { showToast(e.message, "error"); }
}

// ── NOTIFICATIONS ──
let _notifs = [];

async function loadNotifications() {
    const el = document.getElementById("notifList");
    try {
        _notifs = await apiGet("/notifications") || [];
        const unread = _notifs.filter(n => !n.is_read).length;
        const badge = document.getElementById("notifBadge");
        badge.textContent = unread || "";
        badge.style.display = unread > 0 ? "inline" : "none";
        document.getElementById("stNotifs").textContent = unread;
        if (!_notifs.length) { el.innerHTML = '<p class="empty">No notifications.</p>'; return; }
        el.innerHTML = _notifs.map(n => `
            <div class="ncard ${!n.is_read ? "unread" : ""}" onclick="openNotif(${n.id})" style="cursor:pointer">
              <div class="ni">
                <h4>${esc(n.title || "Notification")}</h4>
                <p>${esc((n.message||"").slice(0, 80))}${(n.message||"").length > 80 ? "…" : ""}</p>
              </div>
              <div class="nm">
                <div>${new Date(n.created_at).toLocaleDateString()}</div>
                ${!n.is_read ? `<span class="unread-dot"></span>` : "<small style='color:#aaa'>Read</small>"}
              </div>
            </div>`).join("");
    } catch (e) { el.innerHTML = '<p class="empty">Failed.</p>'; }
}

async function openNotif(id) {
    const n = _notifs.find(x => x.id === id);
    if (!n) return;
    document.getElementById("notifDetailTitle").textContent = n.title || "Notification";
    document.getElementById("notifDetailMsg").textContent = n.message || "";
    document.getElementById("notifDetailTime").textContent = n.created_at ? new Date(n.created_at).toLocaleString() : "";
    const actions = document.getElementById("notifDetailActions");
    actions.innerHTML = "";
    if ((n.type || "") === "invite") {
        try {
            const invs = await apiGet("/courses/invitations");
            if (Array.isArray(invs) && invs.length > 0) {
                actions.innerHTML = invs.map(inv => `
                    <div style="border:1px solid #e5e8ef;border-radius:8px;padding:12px;margin-bottom:8px">
                      <strong>${esc(inv.course_title)}</strong>
                      <p style="font-size:12px;color:#666;margin:4px 0">Invited by ${esc(inv.inviter)}</p>
                      <button class="btn-sm" onclick="acceptInvite(${inv.course_id},this)">✓ Accept Invitation</button>
                    </div>`).join("");
            }
        } catch(e) {}
    }
    openModal("modalNotifDetail");
    if (!n.is_read) {
        await apiPut(`/notifications/${id}/read`, {}).catch(() => {});
        n.is_read = true;
        loadNotifications();
    }
}

async function acceptInvite(courseId, btn) {
    btn.disabled = true; btn.textContent = "Accepting…";
    try {
        await apiPost(`/courses/${courseId}/invite/accept`, {});
        btn.textContent = "✓ Accepted!";
        btn.style.background = "#27ae60";
        loadEnrolled();
        loadInvitations();
        showToast("You've joined the course!");
    } catch(e) {
        btn.disabled = false; btn.textContent = "✓ Accept Invitation";
        showToast(e.message || "Could not accept.", "error");
    }
}

async function markRead(id) {
    await apiPut(`/notifications/${id}/read`, {}).catch(() => {});
    loadNotifications();
}

async function markAllRead() {
    await apiPut("/notifications/read-all", {}).catch(() => {});
    loadNotifications();
    showToast("All notifications marked as read.");
}

// ── INVITATIONS ──
async function loadInvitations() {
    const el = document.getElementById("invitationsGrid");
    if (!el) return;
    try {
        const invs = await apiGet("/courses/invitations") || [];
        const badge = document.getElementById("inviteBadge");
        if (badge) { badge.textContent = invs.length || ""; badge.style.display = invs.length ? "inline" : "none"; }
        if (!invs.length) { el.innerHTML = '<p class="empty">No pending invitations.</p>'; return; }
        el.innerHTML = invs.map(inv => `
            <div class="ccard">
              <div class="ccard-hd" style="background:#6c00c9">📩</div>
              <div class="ccard-bd">
                <h4>${esc(inv.course_title)}</h4>
                <p style="font-size:13px;color:#666">Invited by ${esc(inv.inviter)}</p>
                <p style="font-size:12px;color:#aaa">${new Date(inv.created_at).toLocaleDateString()}</p>
                <button class="btn-sm" style="margin-top:10px" onclick="acceptInvite(${inv.course_id},this)">✓ Accept Invitation</button>
              </div>
            </div>`).join("");
    } catch(e) { el.innerHTML = '<p class="empty">Failed to load.</p>'; }
}

// ── CANVAS ──────────────────────────────────────────────────────────────────
let _books = [], _curBookId = null, _curPages = [], _curPageIdx = 0;

async function loadCanvas() {
    try {
        _books = await apiGet("/canvas/books") || [];
        renderBookList();
        if (_books.length) await openBook(_books[0].id);
        else document.getElementById("pageNav").style.display = "none";
    } catch(e) { console.error(e); }
}

function renderBookList() {
    const ul = document.getElementById("booksList");
    ul.innerHTML = _books.map(b => `
        <li class="${b.id == _curBookId ? 'active' : ''}" onclick="openBook(${b.id})">
          📓 ${esc(b.title)}
          <span class="book-pages">${b.page_count || 0}p</span>
          <button class="book-del" onclick="event.stopPropagation();deleteBook(${b.id})" title="Delete book">✕</button>
        </li>`).join("") || '<li style="color:#aaa;font-size:12px;padding:8px">No books yet</li>';
}

async function openBook(bookId) {
    _curBookId = bookId;
    document.getElementById("currentBookId").value = bookId;
    try {
        _curPages = await apiGet(`/canvas/books/${bookId}/pages`) || [];
        if (!_curPages.length) _curPageIdx = 0;
        else _curPageIdx = Math.min(_curPageIdx, _curPages.length - 1);
        renderBookList();
        renderPageNav();
        openPageAtIdx(_curPageIdx);
    } catch(e) { showToast("Failed to load book.", "error"); }
}

function renderPageNav() {
    const nav = document.getElementById("pageNav");
    nav.style.display = _curBookId ? "flex" : "none";
    const total = _curPages.length;
    document.getElementById("pageIndicator").textContent =
        total ? `${_curPageIdx + 1} / ${total}` : "— / —";
    document.getElementById("btnPrevPage").disabled = _curPageIdx <= 0;
    document.getElementById("btnNextPage").disabled = _curPageIdx >= total - 1;
    document.getElementById("btnDeletePage").disabled = total <= 1;
    document.getElementById("btnAddPage").disabled = total >= 100;
    document.getElementById("btnAddPage").textContent =
        total >= 100 ? "100 pages max" : "+ Add page";
}

function openPageAtIdx(idx) {
    if (!_curPages.length) {
        document.getElementById("noteTitle").value = "";
        document.getElementById("noteContent").value = "";
        document.getElementById("currentNoteId").value = "";
        renderPageNav();
        return;
    }
    _curPageIdx = Math.max(0, Math.min(idx, _curPages.length - 1));
    const p = _curPages[_curPageIdx];
    document.getElementById("noteTitle").value   = p.title;
    document.getElementById("noteContent").value = p.content;
    document.getElementById("currentNoteId").value = p.id;
    renderPageNav();
}

function prevPage() { if (_curPageIdx > 0) openPageAtIdx(_curPageIdx - 1); }
function nextPage() { if (_curPageIdx < _curPages.length - 1) openPageAtIdx(_curPageIdx + 1); }

async function createBook() {
    const title = prompt("Book title:", "My Notebook");
    if (!title) return;
    try {
        const b = await apiPost("/canvas/books", { title });
        _books.push(b);
        await openBook(b.id);
        showToast(`Book "${title}" created!`);
    } catch(e) { showToast(e.message || "Failed to create book.", "error"); }
}

async function deleteBook(bookId) {
    if (!confirm("Delete this book and all its pages?")) return;
    try {
        await apiDelete(`/canvas/books/${bookId}`);
        _books = _books.filter(b => b.id !== bookId);
        if (_curBookId === bookId) {
            _curBookId = null; _curPages = []; _curPageIdx = 0;
            document.getElementById("noteTitle").value = "";
            document.getElementById("noteContent").value = "";
            document.getElementById("currentNoteId").value = "";
            document.getElementById("pageNav").style.display = "none";
        }
        renderBookList();
        if (!_curBookId && _books.length) await openBook(_books[0].id);
        showToast("Book deleted.");
    } catch(e) { showToast(e.message || "Failed.", "error"); }
}

async function addPageToBook() {
    if (!_curBookId) return;
    if (_curPages.length >= 100) { showToast("Maximum 100 pages per book.", "error"); return; }
    try {
        const p = await apiPost(`/canvas/books/${_curBookId}/pages`, {});
        _curPages.push(p);
        // update page_count in books list
        const b = _books.find(x => x.id == _curBookId);
        if (b) b.page_count = _curPages.length;
        renderBookList();
        openPageAtIdx(_curPages.length - 1);
        showToast("Page added.");
    } catch(e) { showToast(e.message || "Failed.", "error"); }
}

async function deletePage() {
    if (!_curBookId) return;
    if (_curPages.length <= 1) { showToast("Cannot delete the only page.", "error"); return; }
    const pageId = parseInt(document.getElementById("currentNoteId").value);
    if (!pageId) return;
    if (!confirm("Delete this page?")) return;
    try {
        await apiDelete(`/canvas/books/${_curBookId}/pages/${pageId}`);
        _curPages = _curPages.filter(p => p.id !== pageId);
        const b = _books.find(x => x.id == _curBookId);
        if (b) b.page_count = _curPages.length;
        renderBookList();
        openPageAtIdx(Math.min(_curPageIdx, _curPages.length - 1));
        showToast("Page deleted.");
    } catch(e) { showToast(e.message || "Failed.", "error"); }
}

async function saveNote() {
    const id      = parseInt(document.getElementById("currentNoteId").value);
    const title   = document.getElementById("noteTitle").value.trim() || "Untitled";
    const content = document.getElementById("noteContent").value;
    if (!id) { showToast("No page selected.", "error"); return; }
    try {
        const updated = await apiPut(`/canvas/${id}`, { title, content, page: _curPageIdx + 1 });
        if (_curPages[_curPageIdx]) {
            _curPages[_curPageIdx].title   = updated.title;
            _curPages[_curPageIdx].content = updated.content;
        }
        const ind = document.getElementById("saveIndicator");
        ind.textContent = "✓ Saved"; ind.style.opacity = "1";
        clearTimeout(ind._t);
        ind._t = setTimeout(() => { ind.style.opacity = "0"; }, 2000);
    } catch(e) { showToast("Failed to save.", "error"); }
}

function ins(sym) {
    const ta = document.getElementById("noteContent");
    const s  = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + sym + ta.value.slice(e);
    ta.selectionStart = ta.selectionEnd = s + sym.length;
    ta.focus();
}

// ── SETTINGS ──
function prefillPwEmail() {
    const u = getUser();
    if (u && document.getElementById("pwEmail")) {
        document.getElementById("pwEmail").value = u.email || "";
    }
}

async function requestOTP() {
    const email = document.getElementById("pwEmail").value.trim();
    const msg   = document.getElementById("pwMsg1");
    if (!email) { msg.textContent = "Enter your email address."; msg.className = "form-msg error"; return; }
    msg.textContent = "Sending…"; msg.className = "form-msg";
    try {
        await apiPost("/auth/request-otp", { email });
        msg.textContent = "Code sent! Check your email (or server console in dev mode).";
        msg.className = "form-msg";
        document.getElementById("pwStep1").style.display = "none";
        document.getElementById("pwStep2").style.display = "block";
        document.getElementById("pwCode").focus();
    } catch(e) {
        msg.textContent = e.message || "Failed to send code.";
        msg.className = "form-msg error";
    }
}

async function verifyOTP() {
    const email   = document.getElementById("pwEmail").value.trim();
    const code    = document.getElementById("pwCode").value.trim();
    const newPw   = document.getElementById("pwNew").value;
    const confirm = document.getElementById("pwConfirm").value;
    const msg     = document.getElementById("pwMsg2");

    if (!code)          { msg.textContent = "Enter the verification code."; msg.className = "form-msg error"; return; }
    if (!newPw)         { msg.textContent = "Enter a new password."; msg.className = "form-msg error"; return; }
    if (newPw !== confirm) { msg.textContent = "Passwords do not match."; msg.className = "form-msg error"; return; }
    if (newPw.length < 8)  { msg.textContent = "Password must be at least 8 characters."; msg.className = "form-msg error"; return; }

    msg.textContent = "Verifying…"; msg.className = "form-msg";
    try {
        await apiPost("/auth/verify-otp", { email, code, new_password: newPw });
        msg.textContent = "✓ Password updated successfully!";
        msg.className = "form-msg";
        showToast("Password updated successfully!");
        setTimeout(resetPwSteps, 3000);
    } catch(e) {
        msg.textContent = e.message || "Invalid or expired code.";
        msg.className = "form-msg error";
    }
}

function resetPwSteps() {
    document.getElementById("pwStep1").style.display = "block";
    document.getElementById("pwStep2").style.display = "none";
    document.getElementById("pwCode").value = "";
    document.getElementById("pwNew").value = "";
    document.getElementById("pwConfirm").value = "";
    document.getElementById("pwMsg1").textContent = "";
    document.getElementById("pwMsg2").textContent = "";
}

async function saveProfile(ev) {
    ev.preventDefault();
    const msg = document.getElementById("profileMsg");
    try {
        const updated = await apiPut("/auth/me", {
            first_name: document.getElementById("sFirst").value,
            last_name:  document.getElementById("sLast").value,
            school:     document.getElementById("sSchool").value,
            grade:      document.getElementById("sGrade").value,
            bio:        document.getElementById("sBio").value,
        });
        localStorage.setItem("hw_user", JSON.stringify(updated));
        fillUser(updated);
        msg.textContent = "Saved!"; msg.className = "form-msg";
        showToast("Profile saved!");
    } catch (e) { msg.textContent = e.message || "Failed."; msg.className = "form-msg error"; }
}

function openModal(id)  { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
});

function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
