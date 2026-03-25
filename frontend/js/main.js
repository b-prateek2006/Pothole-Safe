// Environment-aware API base URL
const API_BASE = window.POTHOLESAFE_API_BASE || 'http://localhost:3000/api';

// --- My Reports: localStorage helpers ---
const MY_REPORTS_KEY = 'potholesafe_my_reports';

function getMyReports() {
  try {
    const data = localStorage.getItem(MY_REPORTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveReportId(id) {
  const reports = getMyReports();
  // Store with timestamp, limit to last 20
  reports.unshift({ id, date: new Date().toISOString() });
  if (reports.length > 20) reports.pop();
  localStorage.setItem(MY_REPORTS_KEY, JSON.stringify(reports));
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for older browsers
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  return Promise.resolve();
}

// Theme management
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  updateThemeIcon();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.innerHTML = isDark ? '&#9728;' : '&#9790;'; // Sun or Moon
  btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
}

// Initialize theme immediately (before DOMContentLoaded) to prevent flash
initTheme();

// Highlight active nav link and setup theme toggle
document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }
  });

  // Add theme toggle button to nav if not exists
  const nav = document.querySelector('nav');
  if (nav && !document.getElementById('theme-toggle')) {
    const toggle = document.createElement('button');
    toggle.id = 'theme-toggle';
    toggle.className = 'theme-toggle';
    toggle.onclick = toggleTheme;
    nav.appendChild(toggle);
    updateThemeIcon();
  }
});

async function parseErrorResponse(res) {
  try {
    const data = await res.json();
    return data.error || `API error: ${res.status}`;
  } catch {
    return `API error: ${res.status}`;
  }
}

async function apiGet(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const msg = await parseErrorResponse(res);
    throw new Error(msg);
  }
  return res.json();
}

async function apiPost(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await parseErrorResponse(res);
    throw new Error(msg);
  }
  return res.json();
}

async function apiPostForm(endpoint, formData) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const msg = await parseErrorResponse(res);
    throw new Error(msg);
  }
  return res.json();
}

async function apiPut(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    credentials: 'include',
  });
  if (!res.ok) {
    const msg = await parseErrorResponse(res);
    throw new Error(msg);
  }
  return res.json();
}
