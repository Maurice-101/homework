const API_BASE = "/api";

function getToken()  { return localStorage.getItem("hw_token"); }
function getUser()   { const u = localStorage.getItem("hw_user"); return u ? JSON.parse(u) : null; }
function saveAuth(token, user) { localStorage.setItem("hw_token", token); localStorage.setItem("hw_user", JSON.stringify(user)); }
function clearAuth() { localStorage.removeItem("hw_token"); localStorage.removeItem("hw_user"); }

function requireAuth() {
    if (!getToken() || !getUser()) { window.location.href = "/Logins/login.html"; return false; }
    return true;
}

async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const isFormData = options.body instanceof FormData;
    const headers = { ...options.headers };
    if (!isFormData) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (res.status === 401) { clearAuth(); window.location.href = "/Logins/login.html"; return null; }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.detail || "Request failed");
    return data;
}

const apiGet    = (ep)       => apiFetch(ep, { method: "GET" });
const apiPost   = (ep, body) => apiFetch(ep, { method: "POST",   body: body instanceof FormData ? body : JSON.stringify(body) });
const apiPut    = (ep, body) => apiFetch(ep, { method: "PUT",    body: JSON.stringify(body) });
const apiDelete = (ep)       => apiFetch(ep, { method: "DELETE" });

// ── TOAST ──
function showToast(msg, type = "success", duration = 3000) {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px";
        document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    const bg = type === "success" ? "#27ae60" : type === "error" ? "#e74c3c" : "#2f6df6";
    toast.style.cssText = `background:${bg};color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,.2);opacity:0;transition:opacity .3s;min-width:220px`;
    toast.textContent = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = "1"; });
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

function logoutWithToast(redirectUrl) {
    showToast("You have been logged out successfully.", "success", 2000);
    clearAuth();
    setTimeout(() => { window.location.href = redirectUrl || "/Logins/login.html"; }, 1500);
}
