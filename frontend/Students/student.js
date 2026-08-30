document.addEventListener("DOMContentLoaded", () => {
    if (!requireAuth()) return;
    const user = getUser();
    if (user?.role === "facilitator") { window.location.href = "../Facilitators/facilitator-dashboard.html"; return; }
    if (user?.role === "admin")       { window.location.href = "../Admins/admin-dashboard.html"; return; }
    fillUser(user);
    initNav();
    loadDashboard();
    startStudyTimePing();
    // Poll for updates every 30s — this is how "Current Average" and the assignments
    // table pick up a grade the moment a facilitator submits it, short of a full
    // websocket push (not wired up here), 30s is the freshness ceiling.
    setInterval(() => {
        const sec = document.querySelector(".sec.active");
        if (sec?.id === "sec-dashboard")    loadDashboard();
        if (sec?.id === "sec-assignments")  loadAssignments();
        if (sec?.id === "sec-progress")     loadProgress();
        if (sec?.id === "sec-messages")     loadContacts();
    }, 30000);
});

// ── STUDY TIME ──
// Pings the backend once a minute while the tab is actually visible/focused, so time
// spent with the app open in a background tab (or the laptop asleep) doesn't count.
// The server ignores pings that arrive faster than every 50s, so this can't be spoofed
// into over-counting by firing more often.
// "Studying" means actually looking at content material — a course's home/modules/
// syllabus, the resource library, or the virtual notebook — not just having the app
// open (Dashboard, Messages, Notifications, Settings, or the bare Courses list before
// picking a course don't count).
function isStudyingContent() {
    const sec = document.querySelector(".sec.active");
    if (!sec) return false;
    if (sec.id === "sec-courses" && activeCourseDetailId) return true;
    if (sec.id === "sec-resources") return true;
    if (sec.id === "sec-canvas") return true;
    return false;
}

function startStudyTimePing() {
    const tick = () => {
        if (document.visibilityState === "visible" && isStudyingContent()) {
            apiPost("/study-time/ping", { course_id: _currentStudyCourseId }).catch(() => {});
        }
    };
    tick();
    setInterval(tick, 60000);
}

// ── USER ──
const COMMON_COUNTRIES = [
    "Rwanda", "Kenya", "Uganda", "Tanzania", "Burundi", "DR Congo", "Nigeria", "Ghana",
    "South Africa", "Ethiopia", "Egypt", "Morocco", "Senegal", "Zambia", "Zimbabwe",
    "Cameroon", "Ivory Coast", "United States", "United Kingdom", "France", "Canada",
    "Germany", "India", "China", "Belgium", "Netherlands", "Other",
];
const STUDENT_GOALS = [
    "Improve grades", "Prepare for university/college", "Pass national exams",
    "Get help with homework", "Explore career options", "Build better study habits",
];
const LANGUAGES_PRESET = ["English", "French", "Kinyarwanda", "Kiswahili", "Portuguese", "Spanish", "Arabic"];

function fillUser(u) {
    if (!u) return;
    const name = `${u.first_name} ${u.last_name}`;
    document.getElementById("sbName").textContent    = name;
    document.getElementById("sbSub").textContent     = `${u.grade || "—"} | ${u.school || "—"}`;
    document.getElementById("tbName").textContent    = name;
    document.getElementById("welcomeMsg").textContent = `Welcome back, ${u.first_name}!`;
    document.getElementById("sFirst").value  = u.first_name || "";
    document.getElementById("sLast").value   = u.last_name  || "";
    document.getElementById("sSchool").value = u.school     || "";
    document.getElementById("sGrade").value  = u.grade      || "";
    document.getElementById("sCountry").value = u.country || "";
    document.getElementById("sCity").value = u.city || "";
    document.getElementById("sNationality").value = u.nationality || "";
    document.getElementById("sBio").value    = u.bio        || "";
    document.getElementById("sCountryList").innerHTML = COMMON_COUNTRIES.map(c => `<option value="${c}">`).join("");
    initMultiPicker("sLanguages", LANGUAGES_PRESET, u.languages_spoken || []);
    initMultiPicker("sGoals", STUDENT_GOALS, u.goals || []);
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
            if (tab.closest("#sec-courses")) {
                // Filters/search only apply to the server-searchable Browse Catalog tab.
                const showFilters = tab.dataset.tab === "browse";
                document.getElementById("mcFilters")?.classList.toggle("hidden", !showFilters);
                document.getElementById("mcSearchRow")?.classList.toggle("hidden", !showFilters);
            }
        }));
    document.getElementById("profileForm").addEventListener("submit", saveProfile);
    document.querySelectorAll(".modal").forEach(m =>
        m.addEventListener("click", e => { if (e.target === m) m.classList.remove("open"); }));
    document.addEventListener("click", e => {
        const dd = document.getElementById("profileDropdown");
        if (dd && dd.classList.contains("open") && !dd.contains(e.target) && !e.target.closest(".profile-trigger")) {
            dd.classList.remove("open");
        }
    });
}

// Which course (if any) the student is currently viewing — attached to study-time pings
// so time can be broken down per subject. Reset on every navigation; openCourseDetail()
// sets it back when the student is actually inside one specific course.
let _currentStudyCourseId = null;

function goTo(sec) {
    _currentStudyCourseId = null;
    document.querySelectorAll(".menu li").forEach(li => li.classList.toggle("active", li.dataset.sec === sec));
    document.querySelectorAll(".sec").forEach(s => s.classList.remove("active"));
    document.getElementById(`sec-${sec}`)?.classList.add("active");
    document.getElementById("pageTitle").textContent = t(`title.${sec}`);
    if (sec === "courses")       { loadEnrolled(); loadAllCourses(); loadPublic(); loadInvitations(); }
    if (sec === "assignments")   loadAssignments();
    if (sec === "progress")      loadProgress();
    if (sec === "resources")     { loadResources(); loadSubjectCatalog(); }
    if (sec === "messages")      loadMessages();
    if (sec === "settings")      prefillPwEmail();
    if (sec === "notifications") loadNotifications();
    if (sec === "canvas")        loadCanvas();
    if (sec === "ai-chat")       loadAiSessions();
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
        loadStudyTimeChart();
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

        renderUpcomingTable(upcoming.slice(0, 6));
        setList("dNotifs", ns.slice(0, 4),
            n => `<span>${n.title}</span><small>${new Date(n.created_at).toLocaleDateString()}</small>`,
            "No notifications");
        renderContinueLearning(enrolled.slice(0, 4));
        renderAverageWidget(submitted);

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

let _dashUpcomingCache = [];

function openDashUpcoming(id) {
    const a = _dashUpcomingCache.find(x => x.id === id);
    if (!a) return;
    goTo("assignments");
    openAssignmentDetail(a);
}

function renderUpcomingTable(items) {
    _dashUpcomingCache = items;
    const el = document.getElementById("dUpcoming");
    if (!items.length) { el.innerHTML = '<tr><td colspan="4" class="empty">No upcoming assignments.</td></tr>'; return; }
    const now = new Date();
    const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOfDay(now);
    el.innerHTML = items.map(a => {
        const due = a.due_date ? new Date(a.due_date) : null;
        const urgent = due ? (due - now) / 3600000 <= 48 : false;
        let dueLabel = "No due date";
        if (due) {
            const dayDiff = Math.round((startOfDay(due) - today) / 86400000);
            const time = due.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
            if (dayDiff === 0) dueLabel = `Today, ${time}`;
            else if (dayDiff === 1) dueLabel = `Tomorrow, ${time}`;
            else dueLabel = `${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
        }
        return `<tr onclick="openDashUpcoming(${a.id})" style="cursor:pointer">
          <td class="task-name">${esc(a.title)}</td>
          <td>${esc(a.course_title || "—")}</td>
          <td class="${urgent ? "due-urgent" : ""}">${dueLabel}</td>
          <td><span class="status-pill ${urgent ? "urgent" : "upcoming"}">${urgent ? "Urgent" : "Upcoming"}</span></td>
        </tr>`;
    }).join("");
}

// Per-course average score (0-100) from graded submitted assignments — shared by the
// dashboard's "Current Average" widget and the Progress page's per-subject breakdown, so
// the two numbers can never quietly drift apart into two different definitions of "average".
function computeCourseAverages(submitted) {
    const graded = submitted.filter(a => a.student_grade != null && a.max_score);
    const byCourse = {};
    graded.forEach(a => {
        const key = a.course_title || "Other";
        (byCourse[key] = byCourse[key] || []).push(a.student_grade / a.max_score);
    });
    const result = {};
    Object.entries(byCourse).forEach(([course, scores]) => {
        result[course] = Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 100);
    });
    return result;
}

// "Current Average" — averaged per course first, then across courses, so a subject with
// many graded assignments doesn't outweigh one with only a couple (a flat pooled average
// over every assignment would do exactly that).
function renderAverageWidget(submitted) {
    const avgEl = document.getElementById("dAvgScore");
    const subEl = document.getElementById("dAvgSub");
    const courseAverages = computeCourseAverages(submitted);
    const values = Object.values(courseAverages);
    if (!values.length) { avgEl.textContent = "—"; subEl.textContent = "No graded assignments yet"; return; }

    const overall = values.reduce((s, v) => s + v, 0) / values.length;
    avgEl.textContent = `${Math.round(overall)}%`;
    subEl.textContent = `Averaged across ${values.length} subject${values.length === 1 ? "" : "s"}`;
}

async function loadStudyTimeChart() {
    const chartEl = document.getElementById("dStudyChart");
    const noteEl  = document.getElementById("dStudyNote");
    try {
        const days = await apiGet("/study-time/weekly") || [];
        const totalMinutes = days.reduce((s, d) => s + d.minutes, 0);
        const maxMinutes = Math.max(...days.map(d => d.minutes), 1);
        chartEl.innerHTML = days.map(d => {
            const h = Math.max(Math.round((d.minutes / maxMinutes) * 100), d.minutes > 0 ? 6 : 3);
            return `<div class="study-bar" style="--h:${h}%" title="${d.minutes} min"><span>${d.weekday[0]}</span></div>`;
        }).join("");
        const hrs = Math.floor(totalMinutes / 60), mins = totalMinutes % 60;
        noteEl.textContent = totalMinutes > 0
            ? `${hrs > 0 ? hrs + "h " : ""}${mins}m recorded this week`
            : "No study time recorded yet this week.";
    } catch (e) {
        chartEl.innerHTML = "";
        noteEl.textContent = "Could not load study time.";
    }
}

// ── STUDY TIME DETAIL MODAL (per subject, day/week/month/year/custom) ──
let _studyPeriod = "day";

function openStudyTimeModal() {
    document.getElementById("modalStudyTime").classList.remove("hidden");
    loadStudyBreakdown();
}

function setStudyPeriod(period) {
    _studyPeriod = period;
    document.querySelectorAll(".st-period-btn").forEach(b => b.classList.toggle("active", b.dataset.period === period));
    document.getElementById("stCustomRow").classList.toggle("hidden", period !== "custom");
    if (period !== "custom") loadStudyBreakdown();
}

async function loadStudyBreakdown() {
    const totalEl = document.getElementById("stTotal");
    const chartEl = document.getElementById("stChart");
    const listEl  = document.getElementById("stSubjectList");

    let url = `/study-time/breakdown?period=${_studyPeriod}`;
    if (_studyPeriod === "custom") {
        const start = document.getElementById("stCustomStart").value;
        const end   = document.getElementById("stCustomEnd").value;
        if (!start || !end) { totalEl.textContent = "Pick a start and end date"; chartEl.innerHTML = ""; listEl.innerHTML = ""; return; }
        url += `&start=${start}&end=${end}`;
    }

    totalEl.textContent = "…";
    chartEl.innerHTML = "";
    listEl.innerHTML = '<p class="empty">Loading…</p>';
    try {
        const data = await apiGet(url);
        const hrs = Math.floor(data.total_minutes / 60), mins = data.total_minutes % 60;
        totalEl.textContent = data.total_minutes > 0 ? `${hrs > 0 ? hrs + "h " : ""}${mins}m total` : "No study time recorded";

        const maxMinutes = Math.max(...data.buckets.map(b => b.minutes), 1);
        chartEl.innerHTML = data.buckets.map(b => {
            const h = Math.max(Math.round((b.minutes / maxMinutes) * 100), b.minutes > 0 ? 6 : 3);
            return `<div class="st-bar-col" style="--h:${h}%" title="${esc(b.label)}: ${b.minutes} min"><span>${esc(b.label.split(" ")[0])}</span></div>`;
        }).join("");

        const subjects = Object.entries(data.by_subject_total).sort((a, b) => b[1] - a[1]);
        if (!subjects.length) {
            listEl.innerHTML = '<p class="empty">No study time recorded for this period.</p>';
        } else {
            const maxSubj = Math.max(...subjects.map(([, m]) => m), 1);
            listEl.innerHTML = subjects.map(([name, minutes]) => `
                <div class="st-subject-row">
                  <span class="st-subject-name">${esc(name)}</span>
                  <div class="st-subject-bar-wrap"><div class="st-subject-bar" style="width:${Math.round((minutes / maxSubj) * 100)}%"></div></div>
                  <span class="st-subject-mins">${minutes}m</span>
                </div>`).join("");
        }
    } catch (e) {
        totalEl.textContent = "—";
        listEl.innerHTML = '<p class="empty">Could not load study time.</p>';
    }
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

function renderContinueLearning(list) {
    const el = document.getElementById("dContinue");
    if (!list.length) { el.innerHTML = '<p class="empty">No courses enrolled yet.</p>'; return; }
    el.innerHTML = list.map(item => {
        const c = item.course || item;
        const prog = item.enrollment?.progress_percent || 0;
        const theme = courseTheme(c);
        return `<div class="continue-card" onclick="goTo('courses');setTimeout(()=>openCourseDetail(${c.id},'${esc(c.title)}','${esc(c.subject||'')}','${c.cover_color||'#1f4fa3'}'),80)">
          <div class="continue-card-img" style="${courseHeaderStyle(theme, c.cover_color)}">
            ${c.subject ? `<span class="continue-card-tag">${esc(c.subject)}</span>` : ""}
          </div>
          <div class="continue-card-bd">
            <h4>${esc(c.title)}</h4>
            <p>${c.facilitator_name ? "Prof. " + esc(c.facilitator_name) : (c.grade_level || "")}</p>
            <div class="continue-progress-row"><span>Progress</span><span>${prog}%</span></div>
            <div class="continue-progress-bar"><div class="continue-progress-fill" style="width:${prog}%"></div></div>
          </div>
        </div>`;
    }).join("");
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
              <div class="ccard-hd" style="${courseHeaderStyle(theme, c.cover_color)}">${theme ? theme.icon : ""}</div>
              <div class="ccard-bd">
                <h4>${c.title}</h4>
                <p>${c.description || "No description."}</p>
                <div class="meta">
                  ${c.subject ? `<span class="tag">${c.subject}</span>` : ""}
                  ${c.grade_level ? `<span class="tag">${c.grade_level}</span>` : ""}
                  ${c.facilitator_name ? `<span class="tag">${c.facilitator_name}</span>` : ""}
                </div>
                <div style="margin-top:8px;font-size:11px;color:#666">${t("courses.progress")}: ${prog}%</div>
                <div class="pbar-wrap"><div class="pbar" style="width:${prog}%"></div></div>
                <span class="tag" style="background:#e8f0fe;color:#1a56bd;margin-top:8px;display:inline-block">${t("courses.enrolledClickToView")}</span>
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
    const q       = document.getElementById("csearch")?.value.trim() || "";
    let url = "/courses/?";
    if (subject) url += `subject=${encodeURIComponent(subject)}&`;
    if (grade)   url += `grade=${encodeURIComponent(grade)}&`;
    if (q)       url += `q=${encodeURIComponent(q)}`;
    try {
        const allCourses = await apiGet(url);
        const enrolled   = await apiGet("/courses/my").catch(() => []);
        const enrolledIds = new Set((Array.isArray(enrolled) ? enrolled : []).map(e => (e.course || e).id));
        const list = Array.isArray(allCourses) ? allCourses : [];
        if (!list.length) { el.innerHTML = '<p class="empty">No courses available.</p>'; return; }
        el.innerHTML = list.map(c => courseCard(c, enrolledIds.has(c.id))).join("");
    } catch (e) { el.innerHTML = '<p class="empty">Failed to load.</p>'; }
}

function resetCourseFilters() {
    document.getElementById("csubject").value = "";
    document.getElementById("cgrade").value = "";
    document.getElementById("csearch").value = "";
    loadAllCourses();
}

async function joinByCode() {
    const input = document.getElementById("joinCode");
    const code = input.value.trim();
    if (!code) { showToast("Enter an invite code.", "error"); return; }
    try {
        const res = await apiPost("/courses/join", { code });
        input.value = "";
        showToast(`Joined "${res.course_title}"!`);
        loadEnrolled();
        loadAllCourses();
    } catch (e) {
        showToast(e.message || "Could not join with that code.", "error");
    }
}

function resetResourceFilters() {
    document.getElementById("rsubject").value = "";
    document.getElementById("rgrade").value = "";
    document.getElementById("rsearch").value = "";
    loadResources();
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
      <div class="ccard-hd" style="${courseHeaderStyle(theme, c.cover_color)}">${theme ? theme.icon : ""}</div>
      <div class="ccard-bd">
        <h4>${c.title}</h4>
        <p>${c.description || "No description."}</p>
        <div class="meta">
          ${c.subject ? `<span class="tag">${c.subject}</span>` : ""}
          ${c.grade_level ? `<span class="tag">${c.grade_level}</span>` : ""}
          ${c.facilitator_name ? `<span class="tag">${c.facilitator_name}</span>` : ""}
          ${c.is_public ? `<span class="tag" style="background:#e8f5ee;color:#1a5c3a">${t("common.public")}</span>` : ""}
        </div>
        ${alreadyEnrolled
          ? `<span class="tag" style="background:#e8f0fe;color:#1a56bd;margin-top:8px;display:inline-block">${t("common.enrolled")}</span>`
          : c.is_public
            ? `<button class="btn-enroll" onclick="enroll(${c.id}, this)">${t("common.enroll")}</button>`
            : `<span class="tag" style="background:#f4f4f4;color:#888;margin-top:8px;display:inline-block">${t("courses.privateInviteOnly")}</span>`}
      </div>
    </div>`;
}

async function enroll(courseId, btn) {
    if (btn) { btn.disabled = true; btn.textContent = t("courses.enrolling"); }
    try {
        await apiPost(`/courses/${courseId}/enroll`, {});
        if (btn) { btn.textContent = t("common.enrolled"); btn.style.background = "#27ae60"; }
        loadEnrolled();
        showToast(t("courses.enrolledToast"));
    } catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = t("common.enroll"); }
        showToast(e.message || t("courses.enrollFailedToast"), "error");
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
    _currentStudyCourseId = courseId;
    document.querySelector("#sec-courses .mc-page-head")?.classList.add("hidden-for-detail");
    document.querySelector("#sec-courses .mc-layout")?.classList.add("hidden-for-detail");

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
    loadCdSidebarBadges(courseId);
}

async function loadCdSidebarBadges(courseId) {
    ["cdBadgeGrades", "cdBadgeDiscussions", "cdBadgeAnnouncements", "cdBadgeChats"].forEach(id => setCdBadge(id, ""));
    try {
        const [asgnData, discussions, anns, chats] = await Promise.all([
            apiGet("/assignments/").catch(() => null),
            apiGet(`/courses/${courseId}/discussions`).catch(() => []),
            apiGet(`/courses/${courseId}/announcements`).catch(() => []),
            apiGet(`/messages/course/${courseId}`).catch(() => []),
        ]);
        const courseAsg = [...(asgnData?.upcoming || []), ...(asgnData?.submitted || [])].filter(a => a.course_id == courseId);
        const graded = courseAsg.filter(a => a.student_grade != null).length;
        setCdBadge("cdBadgeGrades", courseAsg.length ? `${graded}/${courseAsg.length}` : "");
        setCdBadge("cdBadgeDiscussions", Array.isArray(discussions) && discussions.length ? discussions.length : "");
        setCdBadge("cdBadgeAnnouncements", Array.isArray(anns) && anns.length ? anns.length : "");
        setCdBadge("cdBadgeChats", Array.isArray(chats) && chats.length ? chats.length : "");
    } catch (e) {}
}

function setCdBadge(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function closeCourseDetail() {
    document.getElementById("courseDetailPanel").classList.add("hidden");
    document.querySelectorAll("#sec-courses .hidden-for-detail").forEach(el => el.classList.remove("hidden-for-detail"));
    activeCourseDetailId = null;
    _currentStudyCourseId = null;
    _cdDetail = null;
}

function switchCdTab(tab) {
    document.querySelectorAll("#cdTabBar .cdtab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
    document.querySelectorAll(".cdpane").forEach(p => p.classList.toggle("active", p.id === `cdpane-${tab}`));
    const cur = document.getElementById("cdBreadCur");
    if (cur) {
        const keys = {home:"cd.home",announcements:"cd.announcements",assignments:"cd.assignments",
            discussions:"cd.discussions",grades:"cd.grades",people:"cd.people",
            syllabus:"cd.syllabus",modules:"cd.modules",chats:"cd.courseChat"};
        cur.textContent = keys[tab] ? t(keys[tab]) : tab;
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

async function renderCdHome(c) {
    const me   = getUser()?.id;
    const enr  = (c.enrollments||[]).find(e => e.student_id == me) || {};
    const prog = enr.progress_percent || 0;
    const pass = enr.pass_status || "in_progress";
    const passLabel = pass==="passed" ? t("cd.passed") : pass==="retake" ? t("cd.retake") : t("cd.inProgress");
    const passCol   = pass==="passed" ? "#1a8a5a" : pass==="retake" ? "#c0392b" : "#c47f00";
    const progCol   = prog>=55 ? "#2f6df6" : "#f39c12";

    const modules = c.modules || [];
    const modulesDone = modules.filter(m => m.completed).length;

    let asgLine = `${(modules.length ? "…" : "0")} ${t("cd.assignmentsCount")}`;
    let syllabusLine = "";
    try {
        const [asgData, sylWeeks] = await Promise.all([
            apiGet("/assignments/"),
            apiGet(`/courses/${c.id}/syllabus`).catch(() => []),
        ]);
        const courseAsg = [...(asgData?.upcoming||[]), ...(asgData?.submitted||[])].filter(a => a.course_id == c.id);
        const asgDone = courseAsg.filter(a => a.student_submission_id).length;
        asgLine = `${asgDone}/${courseAsg.length} ${t("cd.assignmentsCount")}`;
        if (Array.isArray(sylWeeks) && sylWeeks.length) syllabusLine = `<span style="color:#bbb">·</span><span>${sylWeeks.length} week${sylWeeks.length===1?"":"s"} in syllabus</span>`;
    } catch (e) {}

    document.getElementById("cdHomeContent").innerHTML = `
      <div class="cd-home-hero">
        <h2>${esc(c.title)}</h2>
        <p>${esc(c.description || t("cd.noDescription"))}</p>
        ${c.facilitator_name ? `<div class="cd-home-instructor">${t("cd.taughtBy")} <strong>${esc(c.facilitator_name)}</strong> &nbsp;·&nbsp; ${esc(c.subject||"")} &nbsp;·&nbsp; ${esc(c.grade_level||"")}</div>` : ""}
      </div>

      <div class="cd-progress-section">
        <label>${t("cd.yourProgress")} &nbsp; <span style="color:${passCol};font-weight:700">${passLabel}</span></label>
        <div class="cd-prog-bar-bg">
          <div class="cd-prog-bar-fill" style="width:${prog}%;background:${progCol}"></div>
        </div>
        <div class="cd-prog-meta">
          <span>${prog}% ${t("cd.percentComplete")}</span>
          <span style="color:#bbb">·</span>
          <span>${modulesDone}/${modules.length} modules complete</span>
          <span style="color:#bbb">·</span>
          <span>${asgLine}</span>
          ${syllabusLine}
        </div>
      </div>

      <div class="cd-quick-nav">
        <button class="cd-quick-btn" onclick="switchCdTab('syllabus')">${t("cd.syllabus")}</button>
        <button class="cd-quick-btn" onclick="switchCdTab('assignments')">${t("cd.assignments")}</button>
        <button class="cd-quick-btn" onclick="switchCdTab('grades')">${t("cd.grades")}</button>
        <button class="cd-quick-btn" onclick="switchCdTab('modules')">${t("cd.modules")}</button>
        <button class="cd-quick-btn" onclick="switchCdTab('discussions')">${t("cd.discussions")}</button>
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
            if (a.student_grade != null) statusHtml = `<span class="cd-asg-status graded">Graded ${a.student_grade}/${a.max_score}</span>`;
            else if (a.student_submission_id) statusHtml = `<span class="cd-asg-status submitted">Submitted</span>`;
            else statusHtml = `<span class="cd-asg-status pending">Not submitted</span>`;
            return `<div class="cd-asg-row" onclick="openCdAssignment(${a.id})">
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
          <button class="btn-start-asg" onclick="startCdAssignment(${a.id})">Start Assignment</button>
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
        <div class="cd-asg-prompt-body">${formatRichText(a.description)}</div>` :
        `<div class="cd-asg-prompt-label">Instructions</div>
         <div class="cd-asg-prompt-body"><p>No additional instructions provided. Click <em>Start Assignment</em> to begin your submission.</p></div>`}
      </div>`;
}

function startCdAssignment(asgId) {
    const a = _cdAsgCache.find(x => x.id === asgId);
    if (!a) return;
    goTo('assignments');
    openAssignmentDetail(a);
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
        const statusText  = pct>=55 ? 'Passing' : pct>0 ? '⏳ In Progress' : 'Not graded yet';

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

    // Fetch weeks, subject-matched library books, and this course's own materials in parallel
    const [weeksResult, booksResult, courseMatResult] = await Promise.allSettled([
        apiGet(`/courses/${courseId}/syllabus`),
        apiGet(`/resources/?subject=${encodeURIComponent(activeDetailSubject || "")}`),
        apiGet(`/resources/?course_id=${courseId}`),
    ]);

    _sylWeeks = weeksResult.status === "fulfilled" ? (weeksResult.value || []) : [];
    const booksData = booksResult.status === "fulfilled" ? booksResult.value : {};
    const courseMatData = courseMatResult.status === "fulfilled" ? courseMatResult.value : {};
    const courseMaterials = [...(courseMatData.uploaded || [])];
    const seen = new Set(courseMaterials.map(r => r.id));
    _sylBooks = [
        ...courseMaterials,
        ...(booksData.textbooks || []).filter(r => !seen.has(r.id)),
        ...(booksData.uploaded  || []).filter(r => !seen.has(r.id)),
    ];

    renderSylList();
    if (_sylWeeks.length) selectSylWeek(0);
}

function renderSylList() {
    const el = document.getElementById("cdSylList");
    let html = "";

    // ── Weeks section ──
    if (_sylWeeks.length) {
        html += `<div class="syl-section-label">Weekly Schedule</div>`;
        html += _sylWeeks.map((w, i) => `
          <button class="syl-week-btn ${i===_sylIdx ? 'active' : ''}" onclick="selectSylWeek(${i})">
            <span class="syl-wk-num">Wk ${w.week_num}</span>
            <span class="syl-wk-title">${esc(w.title)}</span>
          </button>`).join("");
    } else {
        html += `<div class="syl-section-label">Weekly Schedule</div>
                 <div class="syl-empty-note">No syllabus posted yet.</div>`;
    }

    // ── Books section ──
    html += `<div class="syl-section-label" style="margin-top:14px">Course Books</div>`;
    if (_sylBooks.length) {
        html += _sylBooks.map((b, i) => `
          <button class="syl-book-btn" onclick="openSylBook(${i})" title="${esc(b.title)}">
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
            <li class="module-item ${m.completed ? "module-done" : ""}" id="mi-${m.id}">
              <div class="mi-text">
                <strong>${esc(m.title)}</strong>
                ${m.content ? `<p>${esc(m.content)}</p>` : ""}
              </div>
              ${m.completed
                ? `<span class="btn-complete done">Done</span>`
                : `<button class="btn-complete" onclick="completeModule(${activeCourseDetailId},${m.id},this)">Complete</button>`}
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
        btn.textContent = "Done";
        btn.style.background = "#27ae60";
        btn.style.color = "#fff";
        const li = document.getElementById(`mi-${moduleId}`);
        if (li) li.style.background = "#f0fff4";
        showToast(`Module completed! Progress: ${res.progress_percent}%`);
    } catch (e) {
        btn.disabled = false; btn.textContent = "Complete";
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
    const ext = (filename || "").split(".").pop().toLowerCase();
    if (ext === "pdf") return '<svg class="icon-sm"><use href="#ic-file"></use></svg>';
    if (["jpg","jpeg","png","gif","webp"].includes(ext)) return '<svg class="icon-sm"><use href="#ic-image"></use></svg>';
    if (["doc","docx"].includes(ext)) return '<svg class="icon-sm"><use href="#ic-file"></use></svg>';
    if (["ppt","pptx"].includes(ext)) return '<svg class="icon-sm"><use href="#ic-file"></use></svg>';
    if (["xls","xlsx"].includes(ext)) return '<svg class="icon-sm"><use href="#ic-file"></use></svg>';
    return '<svg class="icon-sm"><use href="#ic-link"></use></svg>';
}

function renderAsgn(id, list, type) {
    const el = document.getElementById(id);
    if (!list.length) { el.innerHTML = `<tr><td colspan="5" class="empty">No ${type} assignments.</td></tr>`; return; }
    list.forEach(a => { assignmentMap[a.id] = a; });
    const now = new Date();
    const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOfDay(now);
    el.innerHTML = list.map(a => {
        const due = a.due_date ? new Date(a.due_date) : null;
        let dueLabel = "No due date";
        if (due) {
            const dayDiff = Math.round((startOfDay(due) - today) / 86400000);
            const time = due.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
            if (dayDiff === 0) dueLabel = `Today, ${time}`;
            else if (dayDiff === 1) dueLabel = `Tomorrow, ${time}`;
            else dueLabel = `${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
        }
        let pillClass = "upcoming", pillLabel = "Upcoming";
        if (a.student_grade != null) { pillClass = "graded"; pillLabel = `Graded ${a.student_grade}/${a.max_score}`; }
        else if (a.student_submission_id) { pillClass = "submitted"; pillLabel = "Submitted"; }
        else if (due && (due - now) / 3600000 <= 48) { pillClass = "urgent"; pillLabel = "Urgent"; }
        return `<tr onclick="openAssignmentDetail(${a.id})" style="cursor:pointer">
          <td>${esc(a.course_title || "General")}</td>
          <td class="task-name">${esc(a.title)}</td>
          <td>${esc(dueLabel)}</td>
          <td><span class="status-pill ${pillClass}">${esc(pillLabel)}</span></td>
          <td style="color:#aaa;text-align:right">›</td>
        </tr>`;
    }).join("");
}

function openAssignmentDetail(aOrId) {
    const a = (typeof aOrId === "number" || typeof aOrId === "string")
        ? assignmentMap[aOrId]
        : aOrId;
    if (!a) { showToast("Assignment not found", "error"); return; }
    activeAssignData  = a;
    activeSubmitType  = "text";

    // Hide assignment list, show detail panel
    document.querySelector("#sec-assignments .mc-page-head")?.classList.add("hidden-for-detail");
    document.querySelector("#sec-assignments .panel-wide")?.classList.add("hidden-for-detail");
    document.getElementById("assignmentDetailPanel").classList.remove("hidden");

    const submittingLabel = a.student_submission_id
        ? ({text:"a text entry", link:"a website url", pdf:"a file upload", file:"a file upload"}[a.student_submission_type] || "a text entry")
        : "a text entry, a website url, or a file upload";
    const dueStr = a.due_date
        ? new Date(a.due_date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})
        : "No due date";

    document.getElementById("assignmentDetailContent").innerHTML = `
        <div class="adetail-title-row">
          <h2 class="adetail-title">${esc(a.title)}</h2>
          ${a.student_grade != null
            ? `<span class="adetail-status-pill graded">Graded ${a.student_grade}/${a.max_score || 100}</span>`
            : a.student_submission_id
              ? `<span class="adetail-status-pill submitted">Submitted</span>`
              : `<span class="adetail-status-pill pending">Not submitted</span>`}
        </div>
        <div class="adetail-badges">
          <span class="tbadge">${esc(a.type || a.assignment_type || "assignment")}</span>
          ${a.course_title ? `<span class="tag">${esc(a.course_title)}</span>` : ""}
        </div>
        <hr class="adetail-divider">
        <div class="adetail-meta-canvas">
          <span><strong>Due</strong> ${dueStr}</span>
          <span><strong>Points</strong> ${a.max_score != null ? a.max_score : "—"}</span>
          <span><strong>Submitting</strong> ${submittingLabel}</span>
        </div>
        <hr class="adetail-divider">
        ${a.description ? `<div class="adetail-prompt-label">Instructions</div><div class="adetail-desc">${formatRichText(a.description)}</div>` : ""}
        ${a.attachment_url ? `<div style="margin:10px 0"><a href="${esc(a.attachment_url)}" target="_blank" class="btn-s" style="display:inline-block">Open Attachment / Google Doc</a></div>` : ""}
        ${a.attachment_path ? `<div style="margin:10px 0"><a href="${r2FileUrl(a.attachment_path)}" target="_blank" class="btn-s" style="display:inline-block">View Assignment PDF</a></div>` : ""}
        ${(a.attachments||[]).length ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0">
          ${a.attachments.map(att => `<a href="${r2FileUrl(att.file_path)}" target="_blank" class="btn-s" style="display:inline-block">${fileIcon(att.filename)} ${esc(att.filename)}</a>`).join("")}
        </div>` : ""}
    `;

    const grid = document.getElementById("adetailGrid");
    const quizEl = document.getElementById("quizContainer");
    if (a.question_count > 0) {
        grid.style.display = "none";
        quizEl.style.display = "block";
        loadQuizForAssignment(a);
        return;
    }
    grid.style.display = "grid";
    quizEl.style.display = "none";
    quizEl.innerHTML = "";

    const existEl = document.getElementById("existingSubmission");
    const formEl  = document.getElementById("submitForm");

    if (a.student_submission_id) {
        existEl.style.display = "block";
        formEl.style.display  = "none";
        const typeLabel = {text:"Text Entry", link:"Website URL", pdf:"File Upload", file:"File Upload"}[a.student_submission_type] || "Text Entry";
        let subHtml = `<div class="existing-sub-head"><span class="existing-sub-check"><svg class="icon-sm"><use href="#ic-check"></use></svg></span><div><strong>Submitted</strong><span class="existing-sub-type">${esc(typeLabel)}</span></div></div>`;
        if (a.student_content && (a.student_submission_type === "text" || !a.student_submission_type)) {
            subHtml += `<div class="existing-sub-text">${formatRichText(a.student_content)}</div>`;
        }
        if (a.student_submission_type === "link" && a.student_content) {
            subHtml += `<a href="${a.student_content}" target="_blank" class="btn-s" style="display:inline-block;margin-top:4px">Open Link</a>`;
        }
        if ((a.student_submission_type === "pdf" || a.student_submission_type === "file") && a.student_file_path) {
            subHtml += `<a href="${r2FileUrl(a.student_file_path)}" target="_blank" class="btn-s" style="display:inline-block;margin-top:4px">${fileIcon(a.student_file_path)} View File</a>`;
        }
        if (a.student_grade != null) {
            subHtml += `<div class="grade-result">
                <h3>Grade: <span style="color:#2f6df6">${a.student_grade} / ${a.max_score}</span></h3>
                ${a.student_feedback ? `<p>${esc(a.student_feedback)}</p>` : ""}
            </div>`;
        } else {
            subHtml += '<p class="awaiting-grade">⏳ Awaiting grading…</p>';
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

// ── Quiz taking (question-based assignments) ─────────────────────────────────
let _quizData = null;        // {questions, time_limit_minutes, max_attempts, attempts_used, attempts_remaining}
let _quizAssignmentId = null;
let _quizTimerInterval = null;
let _quizDeadline = null;

async function loadQuizForAssignment(a) {
    _quizAssignmentId = a.id;
    const el = document.getElementById("quizContainer");
    el.innerHTML = '<p class="empty">Loading…</p>';

    if (a.student_submission_id) {
        try {
            const sub = await apiGet(`/assignments/submissions/${a.student_submission_id}`);
            renderQuizResults(a, sub);
        } catch (e) { el.innerHTML = '<p class="empty">Could not load your submission.</p>'; }
        return;
    }
    try {
        _quizData = await apiGet(`/assignments/${a.id}/questions`);
        if (!_quizData.attempts_remaining) {
            el.innerHTML = '<p class="empty">No attempts remaining for this assignment.</p>';
            return;
        }
        renderQuizTakingForm(a);
    } catch (e) { el.innerHTML = '<p class="empty">Could not load the quiz.</p>'; }
}

function renderQuizTakingForm(a) {
    const el = document.getElementById("quizContainer");
    const d = _quizData;
    clearInterval(_quizTimerInterval);

    el.innerHTML = `
        <div class="quiz-meta-bar">
          ${d.time_limit_minutes ? `<span>⏱ <strong id="quizTimer">${d.time_limit_minutes}:00</strong></span>` : ""}
          <span>${d.questions.length} question${d.questions.length === 1 ? "" : "s"}</span>
          <span>Attempt ${d.attempts_used + 1} of ${d.max_attempts}</span>
        </div>
        <div id="quizQuestions">${d.questions.map((q, i) => renderQuizQuestion(q, i)).join("")}</div>
        <button class="btn-p" style="width:100%;margin-top:8px" onclick="submitQuizAnswers()">Submit Quiz</button>
    `;

    if (d.time_limit_minutes) {
        _quizDeadline = Date.now() + d.time_limit_minutes * 60000;
        _quizTimerInterval = setInterval(updateQuizTimer, 1000);
        updateQuizTimer();
    }
}

function updateQuizTimer() {
    const remainingMs = _quizDeadline - Date.now();
    const timerEl = document.getElementById("quizTimer");
    if (!timerEl) { clearInterval(_quizTimerInterval); return; }
    if (remainingMs <= 0) {
        clearInterval(_quizTimerInterval);
        timerEl.textContent = "0:00";
        showToast("Time's up — submitting your quiz.", "error");
        submitQuizAnswers();
        return;
    }
    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.floor((remainingMs % 60000) / 1000);
    timerEl.textContent = `${mins}:${String(secs).padStart(2, "0")}`;
}

function renderQuizQuestion(q, idx) {
    return `
        <div class="quiz-question">
          <div class="quiz-q-head">
            <span class="quiz-q-num">Q${idx + 1}. ${q.required ? "" : "(optional)"}</span>
            <span class="quiz-q-points">${q.points} pt${q.points === 1 ? "" : "s"}</span>
          </div>
          <div class="quiz-q-text">${esc(q.text)}</div>
          ${_quizInputHtml(q)}
        </div>`;
}

function _quizInputHtml(q) {
    if (q.type === "short_answer") {
        return `<input type="text" class="quiz-answer-input" id="qa-${q.id}" placeholder="Your answer…">`;
    }
    if (q.type === "long_answer") {
        return `<textarea class="quiz-answer-input" id="qa-${q.id}" rows="5" placeholder="Your answer…"></textarea>`;
    }
    if (q.type === "file_upload") {
        return `<input type="file" id="qa-${q.id}" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.odt,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.mp3,.wav,.m4a,.ogg,.aac,.mp4,.mov,.avi,.webm,.mkv">`;
    }
    if (q.type === "dropdown") {
        return `<select class="quiz-answer-input" id="qa-${q.id}">
          <option value="">Select…</option>
          ${q.options.map(o => `<option value="${o.id}">${esc(o.text)}</option>`).join("")}
        </select>`;
    }
    if (q.type === "true_false" || q.type === "multiple_choice") {
        return q.options.map(o => `
          <label class="quiz-option-row">
            <input type="radio" name="qa-${q.id}" value="${o.id}"> ${esc(o.text)}
          </label>`).join("");
    }
    if (q.type === "multiple_select") {
        return q.options.map(o => `
          <label class="quiz-option-row">
            <input type="checkbox" name="qa-${q.id}" value="${o.id}"> ${esc(o.text)}
          </label>`).join("");
    }
    if (q.type === "matching") {
        return q.options.map(o => `
          <div class="quiz-matching-row">
            <span class="qm-left">${esc(o.text)}</span> →
            <select id="qa-${q.id}-${o.id}">
              <option value="">Select match…</option>
              ${(q.right_choices || []).map(rc => `<option value="${esc(rc)}">${esc(rc)}</option>`).join("")}
            </select>
          </div>`).join("");
    }
    return "";
}

async function submitQuizAnswers() {
    clearInterval(_quizTimerInterval);
    const answers = [];
    const fileEntries = [];
    for (const q of _quizData.questions) {
        if (q.type === "short_answer" || q.type === "long_answer") {
            const v = document.getElementById(`qa-${q.id}`)?.value.trim();
            if (v) answers.push({ question_id: q.id, answer_text: v });
        } else if (q.type === "dropdown") {
            const v = document.getElementById(`qa-${q.id}`)?.value;
            if (v) answers.push({ question_id: q.id, selected_option_ids: [parseInt(v)] });
        } else if (q.type === "true_false" || q.type === "multiple_choice") {
            const checked = document.querySelector(`input[name="qa-${q.id}"]:checked`);
            if (checked) answers.push({ question_id: q.id, selected_option_ids: [parseInt(checked.value)] });
        } else if (q.type === "multiple_select") {
            const checked = Array.from(document.querySelectorAll(`input[name="qa-${q.id}"]:checked`));
            if (checked.length) answers.push({ question_id: q.id, selected_option_ids: checked.map(c => parseInt(c.value)) });
        } else if (q.type === "matching") {
            const matching_answers = {};
            let any = false;
            for (const o of q.options) {
                const v = document.getElementById(`qa-${q.id}-${o.id}`)?.value;
                if (v) { matching_answers[o.id] = v; any = true; }
            }
            if (any) answers.push({ question_id: q.id, matching_answers });
        } else if (q.type === "file_upload") {
            const f = document.getElementById(`qa-${q.id}`)?.files[0];
            if (f) fileEntries.push([q.id, f]);
        }
    }

    const missingRequired = _quizData.questions.some(q => q.required &&
        !answers.some(a => a.question_id === q.id) && !fileEntries.some(([qid]) => qid === q.id));
    if (missingRequired && !confirm("Some required questions are unanswered. Submit anyway?")) return;

    try {
        const fd = new FormData();
        fd.append("answers", JSON.stringify(answers));
        fileEntries.forEach(([qid, f]) => { fd.append("file_question_ids", qid); fd.append("files", f); });
        await apiFetch(`/assignments/${_quizAssignmentId}/answers`, { method: "POST", body: fd });
        showToast("Quiz submitted!");
        await loadAssignments();
        openAssignmentDetail(_quizAssignmentId);
    } catch (e) { showToast(e.message || "Could not submit quiz.", "error"); }
}

function renderQuizResults(a, sub) {
    const el = document.getElementById("quizContainer");
    const graded = sub.grade !== null && sub.grade !== undefined;
    el.innerHTML = `
        <div class="quiz-summary-card">
          ${graded
            ? `<h2>${sub.grade} / ${a.max_score}</h2><p>Your score</p>`
            : `<h2>Submitted</h2><p>Awaiting grading for some questions</p>`}
        </div>
        ${(sub.answers || []).map((ans, i) => renderQuizAnswerReview(ans, i)).join("")}
        ${_quizData && _quizData.attempts_remaining > 0
          ? `<button class="btn-s" style="width:100%" onclick="retakeQuiz()">↻ Retake Quiz (${_quizData.attempts_remaining} attempt${_quizData.attempts_remaining === 1 ? "" : "s"} left)</button>`
          : ""}
    `;
}

function renderQuizAnswerReview(ans, idx) {
    const objective = ans.is_correct !== null && ans.is_correct !== undefined;
    let badge = '<span class="quiz-result-badge pending">Pending review</span>';
    if (objective) {
        badge = ans.is_correct
            ? `<span class="quiz-result-badge correct">Correct — ${ans.points_awarded}/${ans.question_points}</span>`
            : `<span class="quiz-result-badge incorrect">Incorrect — ${ans.points_awarded ?? 0}/${ans.question_points}</span>`;
    } else if (ans.points_awarded !== null && ans.points_awarded !== undefined) {
        badge = `<span class="quiz-result-badge correct">${ans.points_awarded}/${ans.question_points}</span>`;
    }
    let answerHtml = "";
    if (ans.answer_text) answerHtml = `<p style="font-size:13px;color:#555;margin-top:6px">${esc(ans.answer_text)}</p>`;
    else if (ans.file_path) answerHtml = `<button class="btn-tiny" style="margin-top:6px" onclick="openPdf('${r2ServeUrl(ans.file_path)}','Your answer')">View your file</button>`;

    return `
        <div class="quiz-question">
          <div class="quiz-q-head">
            <span class="quiz-q-num">Q${idx + 1}. ${esc(ans.question_text || "")}</span>
            ${badge}
          </div>
          ${answerHtml}
        </div>`;
}

function retakeQuiz() {
    const a = assignmentMap[_quizAssignmentId];
    if (!a) return;
    a.student_submission_id = null;
    loadQuizForAssignment(a);
}

function selectSubType(btn, type) {
    document.querySelectorAll(".sub-type-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    activeSubmitType = type;
    document.getElementById("sub-text-area").style.display = type === "text" ? "block" : "none";
    document.getElementById("sub-link-area").style.display = type === "link" ? "block" : "none";
    document.getElementById("sub-pdf-area").style.display  = type === "file" ? "block" : "none";
}

async function loadCourseResources(courseId, courseTitle) {
    const el = document.getElementById("courseResourcesForAssignment");
    el.innerHTML = '<p class="empty">Loading…</p>';
    try {
        const detail = courseId ? await apiGet(`/courses/${courseId}`) : null;
        const subject = detail?.subject || courseTitle;
        const [subjResult, courseMatResult] = await Promise.allSettled([
            apiGet(`/resources/?${subject ? "subject=" + encodeURIComponent(subject) : ""}`),
            courseId ? apiGet(`/resources/?course_id=${courseId}`) : Promise.resolve({}),
        ]);
        const data = subjResult.status === "fulfilled" ? subjResult.value : {};
        const courseMatData = courseMatResult.status === "fulfilled" ? courseMatResult.value : {};
        const courseMaterials = [...(courseMatData.uploaded || [])];
        const seen = new Set(courseMaterials.map(r => r.id));
        const all  = [
            ...courseMaterials,
            ...(data.textbooks    || []).filter(r => !seen.has(r.id)),
            ...(data.past_papers  || []).filter(r => !seen.has(r.id)),
            ...(data.uploaded     || []).filter(r => !seen.has(r.id)),
        ];
        if (!all.length) { el.innerHTML = '<p class="empty">No resources for this subject.</p>'; return; }
        el.innerHTML = all.slice(0,6).map(r => `
            <div class="mini-res-card">
                            <div>
                <strong>${esc(r.title)}</strong>
                <p>${r.subject || ""} ${r.grade_level ? "· " + r.grade_level : ""}</p>
              </div>
              <button onclick="openPdf('${esc(r.url)}','${esc(r.title)}')" class="btn-tiny">Open</button>
            </div>`).join("");
    } catch(e) { el.innerHTML = '<p class="empty">Could not load resources.</p>'; }
}

async function doSubmit() {
    if (!activeAssignData) return;
    const id = activeAssignData.id;
    try {
        if (activeSubmitType === "file") {
            const fileInput = document.getElementById("submitFile");
            if (!fileInput.files[0]) { showToast("Please select a file.", "error"); return; }
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
        const [data, asgn] = await Promise.all([apiGet("/courses/my"), apiGet("/assignments/")]);
        const list = Array.isArray(data) ? data : [];
        const courseAverages = computeCourseAverages(asgn?.submitted || []);
        if (!list.length) { el.innerHTML = '<p class="empty">No courses found.</p>'; return; }
        el.innerHTML = list.map(item => {
            const c      = item.course || item;
            const enroll = item.enrollment || {};
            const prog   = enroll.progress_percent || 0;
            const status = enroll.pass_status || "in_progress";
            const badge  = status === "passed"
                ? `<span class="status-badge pass">Passed</span>`
                : status === "retake"
                ? `<span class="status-badge retake">↩ Retake Required</span>`
                : `<span class="status-badge inprog">In Progress</span>`;
            const grade = courseAverages[c.title];
            return `<div class="pcard pcard-clickable" onclick="openProgressDetail(${c.id},'${esc(c.title)}')">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <h4>${esc(c.title)}</h4>
                ${grade != null ? `<span class="pcard-grade">${grade}%</span>` : ""}
              </div>
              <div class="pbar-wrap"><div class="pbar" style="width:${prog}%"></div></div>
              <p style="font-size:12px;color:#666;margin:4px 0">${prog}% assignments graded${grade != null ? ` · ${grade}% average grade` : ""}</p>
              ${badge}
              <div class="pmeta" style="margin-top:8px">
                <span>${esc(c.subject)}</span>
                ${c.grade_level ? `<span>${esc(c.grade_level)}</span>` : ""}
              </div>
              <p class="pcard-cta">See what's done &amp; what's left →</p>
            </div>`;
        }).join("");
    } catch (e) { el.innerHTML = '<p class="empty">Failed to load.</p>'; }
}

// ── PROGRESS DETAIL MODAL: everything done/left for one subject, acted on right here —
// completing a module or opening an assignment to submit happens from this modal itself,
// no detour through the full course browser just to confirm something.
let _pdCourseId = null;
let _pdModules = [];
let _pdAssignments = [];   // flat list, all types — looked up by id when a row is clicked
let _pdSyllabus = [];

const ASGN_TYPE_LABELS = { homework: "Homework", test: "Tests", quiz: "Quizzes", project: "Projects", assignment: "Assignments" };

async function openProgressDetail(courseId, title) {
    _pdCourseId = courseId;
    document.getElementById("pdTitle").textContent = title;
    document.getElementById("pdBody").innerHTML = '<p class="empty">Loading…</p>';
    document.getElementById("modalProgressDetail").classList.remove("hidden");

    try {
        const [course, asgnData, sylWeeks] = await Promise.all([
            apiGet(`/courses/${courseId}`),
            apiGet("/assignments/"),
            apiGet(`/courses/${courseId}/syllabus`).catch(() => []),
        ]);
        _pdModules    = course.modules || [];
        _pdAssignments = [...(asgnData?.upcoming || []), ...(asgnData?.submitted || [])].filter(a => a.course_id == courseId);
        _pdSyllabus   = Array.isArray(sylWeeks) ? sylWeeks : [];
        renderProgressDetail();
    } catch (e) {
        document.getElementById("pdBody").innerHTML = '<p class="empty">Could not load progress details.</p>';
    }
}

function renderProgressDetail() {
    const modules = _pdModules;
    const modulesDone = modules.filter(m => m.completed).length;

    const byType = {};
    _pdAssignments.forEach(a => {
        const type = a.assignment_type || a.type || "assignment";
        (byType[type] = byType[type] || []).push(a);
    });

    let html = `<div class="pd-section">
      <div class="pd-section-head"><h4>Modules</h4><span class="pd-count">${modulesDone}/${modules.length} complete</span></div>
      ${modules.length
        ? `<div class="pd-list">${modules.map(m => `
            <div class="pd-item">
              <span class="pd-item-title">${esc(m.title)}</span>
              ${m.completed
                ? `<button class="pd-complete-btn done" disabled>Complete</button>`
                : `<button class="pd-complete-btn" onclick="pdCompleteModule(${m.id})">Complete</button>`}
            </div>`).join("")}</div>`
        : '<p class="pd-empty">No modules yet.</p>'}
    </div>`;

    if (_pdAssignments.length) {
        Object.entries(byType).forEach(([type, items]) => {
            const done = items.filter(a => a.student_submission_id).length;
            html += `<div class="pd-section">
              <div class="pd-section-head"><h4>${ASGN_TYPE_LABELS[type] || esc(type)}</h4><span class="pd-count">${done}/${items.length} done</span></div>
              <div class="pd-list">${items.map(a => {
                let btn;
                if (a.student_grade != null && a.max_score) {
                    const passed = (a.student_grade / a.max_score) >= 0.5;
                    btn = `<button class="pd-grade-btn ${passed ? "pass" : "fail"}" onclick="pdOpenAssignment(${a.id})">${a.student_grade}/${a.max_score}</button>`;
                } else if (a.student_submission_id) {
                    btn = `<button class="pd-grade-btn pending" onclick="pdOpenAssignment(${a.id})">Submitted</button>`;
                } else {
                    btn = `<button class="pd-grade-btn todo" onclick="pdOpenAssignment(${a.id})">Submit</button>`;
                }
                const dueSub = !a.student_submission_id && a.due_date
                    ? `<div class="pd-item-sub">Due ${new Date(a.due_date).toLocaleDateString()}</div>` : "";
                return `<div class="pd-item">
                  <div><span class="pd-item-title">${esc(a.title)}</span>${dueSub}</div>
                  ${btn}
                </div>`;
              }).join("")}</div>
            </div>`;
        });
    } else {
        html += `<div class="pd-section"><div class="pd-section-head"><h4>Assignments &amp; Tests</h4></div><p class="pd-empty">No assignments yet.</p></div>`;
    }

    if (_pdSyllabus.length) {
        html += `<div class="pd-section">
          <div class="pd-section-head"><h4>Syllabus</h4><span class="pd-count">${_pdSyllabus.length} week${_pdSyllabus.length === 1 ? "" : "s"}</span></div>
          <div class="pd-list">${_pdSyllabus.map(w => `<div class="pd-item"><span class="pd-item-title">Week ${w.week_num}: ${esc(w.title)}</span></div>`).join("")}</div>
        </div>`;
    }

    document.getElementById("pdBody").innerHTML = html;
}

async function pdCompleteModule(moduleId) {
    try {
        const res = await apiPost(`/courses/${_pdCourseId}/modules/${moduleId}/complete`, {});
        const m = _pdModules.find(x => x.id === moduleId);
        if (m) m.completed = true;
        renderProgressDetail();
        showToast(`Module completed! Progress: ${res.progress_percent}%`);
    } catch (e) {
        showToast(e.message || "Could not mark complete.", "error");
    }
}

function pdOpenAssignment(assignmentId) {
    const a = _pdAssignments.find(x => x.id === assignmentId);
    if (!a) return;
    closeModal("modalProgressDetail");
    goTo("assignments");
    openAssignmentDetail(a);
}

// ── RESOURCES ──
// SUBJECT_THEME / DEFAULT_SUBJECT_THEME now come from the shared
// ../js/subjectThemes.js (loaded before this file) so the Student and
// Facilitator portals can't drift apart on subject card art.

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
          ${theme.credit ? `<div class="subj-credit">${esc(theme.credit)}</div>` : ""}
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
            subjSel.innerHTML = `<option value="" data-i18n="common.allSubjects">${t("common.allSubjects")}</option>` +
                subjects.map(s => `<option${s === current ? " selected" : ""}>${esc(s)}</option>`).join("");
        }
        if (grades.length) {
            const current = gradeSel.value;
            gradeSel.innerHTML = `<option value="" data-i18n="common.allGrades">${t("common.allGrades")}</option>` +
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
                    <h4>${esc(r.title)}</h4>
          <div class="meta" style="margin:6px 0">
            <span class="tag">${esc(r.subject)}</span>
            ${r.grade_level ? `<span class="tag">${esc(r.grade_level)}</span>` : ""}
            ${r.year        ? `<span class="tag">${r.year}</span>`             : ""}
            <span class="tag" style="background:#f3e8ff;color:#3d0070">${esc((r.type||'').replace("_"," "))}</span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
            ${url ? `<button class="btn-sm" onclick="openPdf('${esc(url)}','${esc(r.title)}')">${t("common.view")}</button>` : ''}
            ${url ? `<a class="btn-sm btn-outline" href="${esc(url)}" target="_blank" download style="text-decoration:none">${t("common.download")}</a>` : ''}
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
          <button class="btn-p" onclick="openComposeTo(${u.id}, '${esc(u.first_name+' '+u.last_name)}')">Message</button>
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
                      <button class="btn-sm" onclick="acceptInvite(${inv.course_id},this)">Accept Invitation</button>
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
        btn.textContent = "Accepted!";
        btn.style.background = "#27ae60";
        loadEnrolled();
        loadInvitations();
        showToast("You've joined the course!");
    } catch(e) {
        btn.disabled = false; btn.textContent = "Accept Invitation";
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
              <div class="ccard-hd" style="background:#6c00c9"></div>
              <div class="ccard-bd">
                <h4>${esc(inv.course_title)}</h4>
                <p style="font-size:13px;color:#666">Invited by ${esc(inv.inviter)}</p>
                <p style="font-size:12px;color:#aaa">${new Date(inv.created_at).toLocaleDateString()}</p>
                <button class="btn-sm" style="margin-top:10px" onclick="acceptInvite(${inv.course_id},this)">Accept Invitation</button>
              </div>
            </div>`).join("");
    } catch(e) { el.innerHTML = '<p class="empty">Failed to load.</p>'; }
}

// ── CANVAS / VIRTUAL NOTEBOOK ────────────────────────────────────────────────
let _books = [], _curBookId = null, _curPages = [], _curPageIdx = 0;

async function loadCanvas() {
    try {
        _books = await apiGet("/canvas/books") || [];
        renderBookList();
        if (_books.length) await openBook(_books[0].id);
    } catch(e) { console.error(e); }
}

function renderBookList() {
    const ul = document.getElementById("booksList");
    if (!_books.length) { ul.innerHTML = '<li class="nb-empty">No notebooks yet.</li>'; return; }
    ul.innerHTML = _books.map(b => {
        const expanded = b.id == _curBookId;
        return `
        <li class="nb-book ${expanded ? 'expanded' : ''}">
          <div class="nb-book-row" onclick="openBook(${b.id})">
            <svg class="icon-sm nb-folder-icon"><use href="#ic-folder"></use></svg>
            <span class="nb-book-title">${esc(b.title)}</span>
            <button class="nb-icon-btn nb-book-del" onclick="event.stopPropagation();deleteBook(${b.id})" title="Delete notebook"><svg class="icon-sm"><use href="#ic-close"></use></svg></button>
          </div>
          ${expanded ? `<ul class="nb-pages">
            ${_curPages.map((p, i) => `
              <li class="nb-page ${i === _curPageIdx ? 'active' : ''}" onclick="openPageAtIdx(${i})">
                <svg class="icon-sm"><use href="#ic-file"></use></svg><span>${esc(p.title)}</span>
              </li>`).join("")}
            <li class="nb-add-page" onclick="addPageToBook()">
              <svg class="icon-sm"><use href="#ic-plus"></use></svg><span>Add page</span>
            </li>
          </ul>` : ''}
        </li>`;
    }).join("");
}

async function openBook(bookId) {
    _curBookId = bookId;
    _curPageIdx = 0;
    document.getElementById("currentBookId").value = bookId;
    try {
        _curPages = await apiGet(`/canvas/books/${bookId}/pages`) || [];
        renderBookList();
        openPageAtIdx(0);
    } catch(e) { showToast("Failed to load notebook.", "error"); }
}

function openPageAtIdx(idx) {
    if (!_curPages.length) {
        document.getElementById("noteTitle").value = "";
        document.getElementById("noteContent").innerHTML = "";
        document.getElementById("currentNoteId").value = "";
        document.getElementById("btnDeletePage").disabled = true;
        return;
    }
    _curPageIdx = Math.max(0, Math.min(idx, _curPages.length - 1));
    const p = _curPages[_curPageIdx];
    document.getElementById("noteTitle").value      = p.title;
    document.getElementById("noteContent").innerHTML = p.content || "";
    document.getElementById("currentNoteId").value  = p.id;
    document.getElementById("btnDeletePage").disabled = _curPages.length <= 1;
    renderBookList();
}

async function createBook() {
    const title = prompt("Notebook name:", "My Notebook");
    if (!title) return;
    try {
        const b = await apiPost("/canvas/books", { title });
        _books.push(b);
        await openBook(b.id);
        showToast(`Notebook "${title}" created!`);
    } catch(e) { showToast(e.message || "Failed to create notebook.", "error"); }
}

async function deleteBook(bookId) {
    if (!confirm("Delete this notebook and all its pages?")) return;
    try {
        await apiDelete(`/canvas/books/${bookId}`);
        _books = _books.filter(b => b.id !== bookId);
        if (_curBookId === bookId) {
            _curBookId = null; _curPages = []; _curPageIdx = 0;
            document.getElementById("noteTitle").value = "";
            document.getElementById("noteContent").innerHTML = "";
            document.getElementById("currentNoteId").value = "";
        }
        renderBookList();
        if (!_curBookId && _books.length) await openBook(_books[0].id);
        showToast("Notebook deleted.");
    } catch(e) { showToast(e.message || "Failed.", "error"); }
}

async function addPageToBook() {
    if (!_curBookId) return;
    if (_curPages.length >= 100) { showToast("Maximum 100 pages per notebook.", "error"); return; }
    try {
        const p = await apiPost(`/canvas/books/${_curBookId}/pages`, {});
        _curPages.push(p);
        const b = _books.find(x => x.id == _curBookId);
        if (b) b.page_count = _curPages.length;
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
        openPageAtIdx(Math.min(_curPageIdx, _curPages.length - 1));
        showToast("Page deleted.");
    } catch(e) { showToast(e.message || "Failed.", "error"); }
}

async function saveNote() {
    const id      = parseInt(document.getElementById("currentNoteId").value);
    const title   = document.getElementById("noteTitle").value.trim() || "Untitled";
    const content = document.getElementById("noteContent").innerHTML;
    if (!id) { showToast("No page selected.", "error"); return; }
    try {
        const updated = await apiPut(`/canvas/${id}`, { title, content, page: _curPageIdx + 1 });
        if (_curPages[_curPageIdx]) {
            _curPages[_curPageIdx].title   = updated.title;
            _curPages[_curPageIdx].content = updated.content;
        }
        renderBookList();
        const ind = document.getElementById("saveIndicator");
        ind.textContent = "Saved"; ind.style.opacity = "1";
        clearTimeout(ind._t);
        ind._t = setTimeout(() => { ind.style.opacity = "0"; }, 2000);
    } catch(e) { showToast("Failed to save.", "error"); }
}

// Rich-text toolbar — contenteditable + execCommand (no bundler/build step in
// this app, so a hand-rolled toolbar is used rather than pulling in a WYSIWYG
// library dependency).
function execFormat(cmd, value) {
    document.getElementById("noteContent").focus();
    document.execCommand(cmd, false, value || null);
}

function insertNoteImage() {
    const url = prompt("Image URL:");
    if (!url) return;
    execFormat("insertImage", url);
}

function insertNoteLink() {
    const url = prompt("Link URL:");
    if (!url) return;
    execFormat("createLink", url);
}

function setSymCat(cat) {
    document.querySelectorAll(".nb-sym-tab").forEach(b => b.classList.toggle("active", b.dataset.symcat === cat));
    document.querySelectorAll(".nb-sym-grid").forEach(g => g.classList.add("hidden"));
    document.getElementById("sym" + cat.charAt(0).toUpperCase() + cat.slice(1)).classList.remove("hidden");
}

function ins(sym) {
    execFormat("insertText", sym);
}

// ── AI LEARNING ASSISTANT ─────────────────────────────────────────────────────
let _aiSessions = [];
let _curAiSessionId = null;
let _aiSending = false;

async function loadAiSessions() {
    const ul = document.getElementById("aiSessionsList");
    ul.innerHTML = '<li class="empty-state">Loading…</li>';
    try {
        _aiSessions = await apiGet("/ai/sessions") || [];
        renderAiSessionsList();
        if (!_curAiSessionId) showAiEmptyState();
    } catch(e) {
        ul.innerHTML = '<li class="empty-state">Could not load chats.</li>';
    }
}

function renderAiSessionsList() {
    const ul = document.getElementById("aiSessionsList");
    if (!_aiSessions.length) {
        ul.innerHTML = '<li class="empty-state" style="padding:20px 12px;text-align:center">No conversations yet.<br>Ask a question to get started.</li>';
        return;
    }
    ul.innerHTML = _aiSessions.map(s => `
        <li class="contact-item ${s.session_id === _curAiSessionId ? 'active' : ''}" onclick="openAiSession('${s.session_id}')">
            <div class="chat-avatar-sm ai-avatar"><svg class="icon-sm"><use href="#ic-spark"></use></svg></div>
            <div class="contact-info">
                <div class="contact-name">${esc(s.last_question || 'New conversation')}</div>
                <div class="contact-last">${s.turn_count} message${s.turn_count === 1 ? '' : 's'}</div>
            </div>
            <button class="nb-icon-btn" onclick="event.stopPropagation();deleteAiSession('${s.session_id}')" title="Delete"><svg class="icon-sm"><use href="#ic-close"></use></svg></button>
        </li>`).join("");
}

function showAiEmptyState() {
    document.getElementById("aiMessages").innerHTML = `
        <div class="chat-empty-state" id="aiChatEmpty">
            <svg class="icon-lg ai-empty-icon"><use href="#ic-spark"></use></svg>
            <p>Ask me anything about your coursework — I'll search your study materials to help.</p>
        </div>`;
}

function startNewAiChat() {
    _curAiSessionId = null;
    document.getElementById("aiChatInput").value = "";
    showAiEmptyState();
    renderAiSessionsList();
    document.getElementById("aiChatInput").focus();
}

async function openAiSession(sessionId) {
    _curAiSessionId = sessionId;
    renderAiSessionsList();
    const messagesEl = document.getElementById("aiMessages");
    messagesEl.innerHTML = '<p class="empty-state">Loading…</p>';
    try {
        const history = await apiGet(`/ai/sessions/${sessionId}`);
        if (!history.messages.length) { showAiEmptyState(); return; }
        messagesEl.innerHTML = "";
        history.messages.forEach(m => appendAiTurn(m.question, m.ai_response, m.sources, m.external_sources, m.created_at, false));
        messagesEl.scrollTop = messagesEl.scrollHeight;
    } catch(e) {
        messagesEl.innerHTML = '<p class="empty-state">Could not load this conversation.</p>';
    }
}

async function deleteAiSession(sessionId) {
    if (!confirm("Delete this conversation?")) return;
    try {
        await apiDelete(`/ai/sessions/${sessionId}`);
        if (_curAiSessionId === sessionId) startNewAiChat();
        await loadAiSessions();
        showToast("Conversation deleted.");
    } catch(e) { showToast("Failed to delete.", "error"); }
}

function aiChatKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiMessage(); }
}

async function sendAiMessage() {
    if (_aiSending) return;
    const input = document.getElementById("aiChatInput");
    const question = input.value.trim();
    if (!question) return;

    const messagesEl = document.getElementById("aiMessages");
    if (document.getElementById("aiChatEmpty")) messagesEl.innerHTML = "";

    input.value = "";
    _aiSending = true;
    document.getElementById("aiSendBtn").disabled = true;

    const userBubble = document.createElement("div");
    userBubble.className = "chat-bubble-wrap mine";
    userBubble.innerHTML = `<div class="chat-bubble">${esc(question)}</div>`;
    messagesEl.appendChild(userBubble);

    const thinking = document.createElement("div");
    thinking.className = "chat-bubble-wrap theirs";
    thinking.innerHTML = `<div class="chat-bubble ai-bubble ai-thinking"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(thinking);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
        const res = await apiPost("/ai/chat", { session_id: _curAiSessionId, question });
        _curAiSessionId = res.session_id;
        thinking.remove();
        appendAiTurn(null, res.ai_response, res.sources, res.external_sources, new Date().toISOString(), true);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        await loadAiSessions();
    } catch(e) {
        thinking.remove();
        const errBubble = document.createElement("div");
        errBubble.className = "chat-bubble-wrap theirs";
        errBubble.innerHTML = `<div class="chat-bubble ai-bubble">Sorry, I couldn't process that right now. ${esc(e.message || "")}</div>`;
        messagesEl.appendChild(errBubble);
    } finally {
        _aiSending = false;
        document.getElementById("aiSendBtn").disabled = false;
        input.focus();
    }
}

// answerOnly=true when the question bubble was already appended by the caller (fresh send)
function appendAiTurn(question, answer, sources, external, createdAt, answerOnly) {
    const messagesEl = document.getElementById("aiMessages");
    if (!answerOnly && question) {
        const qBubble = document.createElement("div");
        qBubble.className = "chat-bubble-wrap mine";
        qBubble.innerHTML = `<div class="chat-bubble">${esc(question)}</div>`;
        messagesEl.appendChild(qBubble);
    }
    const aBubble = document.createElement("div");
    aBubble.className = "chat-bubble-wrap theirs";
    aBubble.innerHTML = `
        <div class="chat-bubble ai-bubble">${formatAiMarkdown(answer)}</div>
        ${renderAiSources(sources)}
        ${renderAiExternal(external)}
        <div class="chat-bubble-time">${fmtTimeShort(createdAt)}</div>
    `;
    messagesEl.appendChild(aBubble);
}

function renderAiSources(sources) {
    if (!sources || !sources.length) return "";
    return `
        <details class="ai-sources">
            <summary>Sources (${sources.length})</summary>
            ${sources.map(s => `
                <div class="ai-source-chip">
                    <svg class="icon-sm"><use href="#ic-file"></use></svg>
                    <span>${esc(s.book_name || "Unknown source")}${s.page_number && s.page_number.length ? ` — p.${s.page_number.join(", ")}` : ""}</span>
                </div>`).join("")}
        </details>`;
}

function renderAiExternal(external) {
    if (!external || !external.sources || !external.sources.length) return "";
    return `
        <div class="ai-external">
            <span class="ai-external-label">From the web</span>
            ${external.sources.map(s => `<a class="ai-external-link" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`).join("")}
        </div>`;
}

function formatAiMarkdown(text) {
    let html = esc(text || "");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    const lines = html.split("\n");
    let out = [], inList = false;
    for (const line of lines) {
        const m = line.match(/^\s*[*\-]\s+(.*)$/);
        if (m) {
            if (!inList) { out.push("<ul>"); inList = true; }
            out.push(`<li>${m[1]}</li>`);
        } else {
            if (inList) { out.push("</ul>"); inList = false; }
            if (line.trim()) out.push(`<p>${line}</p>`);
        }
    }
    if (inList) out.push("</ul>");
    return out.join("");
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
        msg.textContent = "Password updated successfully!";
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
            country:    document.getElementById("sCountry").value,
            city:       document.getElementById("sCity").value,
            nationality: document.getElementById("sNationality").value,
            languages_spoken: getMultiPickerValues("sLanguages"),
            goals:            getMultiPickerValues("sGoals"),
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

// Blank-line-separated paragraphs are kept as paragraphs; single line breaks inside a
// paragraph (common when text — especially pasted equations — was hard-wrapped token by
// token) are collapsed to a space so the content reads as continuous prose instead of a
// vertical wall of one-word lines.
function formatRichText(text) {
    if (!text) return '';
    return esc(text)
        .split(/\r?\n[ \t]*\r?\n/)
        .map(p => p.replace(/\r?\n+/g, ' ').replace(/[ \t]{2,}/g, ' ').trim())
        .filter(Boolean)
        .map(p => `<p>${p}</p>`)
        .join('');
}

function updateFileName(inputId, nameId) {
    const files = Array.from(document.getElementById(inputId).files || []);
    document.getElementById(nameId).textContent = files.length ? files.map(f => f.name).join(', ') : 'No file chosen';
}
