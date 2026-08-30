// Redirect if already authenticated
(function () {
    const u = getUser(), t = getToken();
    if (u && t) redirect(u.role);
})();

function redirect(role) {
    if (role === "student")     window.location.href = "../Students/student-dashboard.html";
    else if (role === "facilitator") window.location.href = "../Facilitators/facilitator-dashboard.html";
    else if (role === "admin")  window.location.href = "../Admins/admin-dashboard.html";
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    btn.innerHTML = `<svg class="icon-sm"><use href="#${showing ? "ic-eye" : "ic-eye-off"}"></use></svg>`;
    btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
}

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
const FACILITATOR_GOALS = [
  "Improve student engagement", "Build better course materials",
  "Track student progress more effectively", "Grade more efficiently",
  "Communicate better with students/parents", "Explore new teaching methods",
];
const LANGUAGES_PRESET = ["English", "French", "Kinyarwanda", "Kiswahili", "Portuguese", "Spanish", "Arabic"];

document.getElementById("countryList").innerHTML =
  COMMON_COUNTRIES.map(c => `<option value="${c}">`).join("");
initMultiPicker("regLanguages", LANGUAGES_PRESET, []);
initMultiPicker("regGoals", STUDENT_GOALS, []);

function onRegRoleChange() {
  const role = document.getElementById("regRole").value;
  const isStudent = role === "student";
  document.getElementById("regStudentFields").style.display = isStudent ? "" : "none";
  document.getElementById("regGoalsLabel").textContent = isStudent ? "Goals" : "Professional Goals";
  setMultiPickerPresets("regGoals", isStudent ? STUDENT_GOALS : FACILITATOR_GOALS);
}

function switchTab(tab) {
    document.getElementById("loginPanel").style.display    = tab === "login"    ? "block" : "none";
    document.getElementById("registerPanel").style.display = tab === "register" ? "block" : "none";
    document.getElementById("loginTabBtn").classList.toggle("active",    tab === "login");
    document.getElementById("registerTabBtn").classList.toggle("active", tab === "register");
}

// ===== LOGIN =====
document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const errEl = document.getElementById("loginErr");
    const btn   = document.getElementById("loginBtn");
    errEl.textContent = "";
    btn.disabled = true;
    btn.textContent = t("auth.signingIn");
    try {
        const data = await apiPost("/auth/login", {
            user_email: document.getElementById("loginEmail").value.trim(),
            password:   document.getElementById("loginPassword").value,
        });
        saveAuth(data.access_token, data.user);
        redirect(data.user.role);
    } catch (err) {
        errEl.textContent = err.message || t("auth.invalidCredentials");
        btn.disabled = false;
        btn.textContent = t("auth.loginBtn");
    }
});

// ===== REGISTER =====
document.getElementById("registerForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const errEl = document.getElementById("registerErr");
    const btn   = document.getElementById("registerBtn");
    const pass    = document.getElementById("regPassword").value;
    const confirm = document.getElementById("regConfirmPassword").value;
    if (pass.length < 8) { errEl.textContent = t("auth.passwordMin8"); return; }
    if (pass !== confirm) { errEl.textContent = t("auth.passwordsNoMatch"); return; }
    errEl.textContent = "";
    btn.disabled = true;
    btn.textContent = t("auth.creatingAccount");
    try {
        const role = document.getElementById("regRole").value;
        const data = await apiPost("/auth/register", {
            first_name:    document.getElementById("regFirst").value.trim(),
            last_name:     document.getElementById("regLast").value.trim(),
            email_address: document.getElementById("regEmail").value.trim(),
            password:      pass,
            role:          role,
            school:        role === "student" ? (document.getElementById("regSchool").value.trim() || null) : null,
            grade:         role === "student" ? (document.getElementById("regGrade").value.trim()  || null) : null,
            country:       document.getElementById("regCountry").value.trim() || null,
            city:          document.getElementById("regCity").value.trim() || null,
            nationality:   document.getElementById("regNationality").value.trim() || null,
            languages_spoken: getMultiPickerValues("regLanguages"),
            goals:            getMultiPickerValues("regGoals"),
        });
        saveAuth(data.access_token, data.user);
        redirect(data.user.role);
    } catch (err) {
        errEl.textContent = err.message || t("auth.registrationFailed");
        btn.disabled = false;
        btn.textContent = t("auth.createAccountBtn");
    }
});
