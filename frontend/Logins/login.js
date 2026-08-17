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
    btn.textContent = showing ? "👁" : "🙈";
    btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
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
    btn.textContent = "Signing in…";
    try {
        const data = await apiPost("/auth/login", {
            user_email: document.getElementById("loginEmail").value.trim(),
            password:   document.getElementById("loginPassword").value,
        });
        saveAuth(data.access_token, data.user);
        redirect(data.user.role);
    } catch (err) {
        errEl.textContent = err.message || "Invalid email or password.";
        btn.disabled = false;
        btn.textContent = "Login";
    }
});

// ===== REGISTER =====
document.getElementById("registerForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const errEl = document.getElementById("registerErr");
    const btn   = document.getElementById("registerBtn");
    const pass    = document.getElementById("regPassword").value;
    const confirm = document.getElementById("regConfirmPassword").value;
    if (pass.length < 8) { errEl.textContent = "Password must be at least 8 characters."; return; }
    if (pass !== confirm) { errEl.textContent = "Passwords do not match."; return; }
    errEl.textContent = "";
    btn.disabled = true;
    btn.textContent = "Creating account…";
    try {
        const data = await apiPost("/auth/register", {
            first_name:    document.getElementById("regFirst").value.trim(),
            last_name:     document.getElementById("regLast").value.trim(),
            email_address: document.getElementById("regEmail").value.trim(),
            password:      pass,
            role:          document.getElementById("regRole").value,
            school:        document.getElementById("regSchool").value.trim() || null,
            grade:         document.getElementById("regGrade").value.trim()  || null,
        });
        saveAuth(data.access_token, data.user);
        redirect(data.user.role);
    } catch (err) {
        errEl.textContent = err.message || "Registration failed. Try again.";
        btn.disabled = false;
        btn.textContent = "Create Account";
    }
});
