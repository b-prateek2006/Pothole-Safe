function resolveApiBase() {
  const configured = (window.POTHOLESAFE_API_BASE || '').trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  return isLocal ? 'http://localhost:3000/api' : '/api';
}

const API_BASE = resolveApiBase();
const TELEMETRY_ENDPOINT = `${API_BASE}/telemetry/frontend`;

const telemetryThrottleMap = new Map();

function shouldThrottleTelemetry(key, windowMs = 30000) {
  const now = Date.now();
  const previous = telemetryThrottleMap.get(key) || 0;
  if (now - previous < windowMs) {
    return true;
  }

  telemetryThrottleMap.set(key, now);
  return false;
}

function sanitizeTelemetryMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  try {
    const serialized = JSON.stringify(metadata);
    if (!serialized || serialized.length > 4000) {
      return null;
    }
    return JSON.parse(serialized);
  } catch {
    return null;
  }
}

function sendTelemetryEvent(payload) {
  const eventBody = {
    eventType: payload.eventType,
    severity: payload.severity || 'error',
    message: payload.message || null,
    pageUrl: window.location.href,
    clientTimestamp: new Date().toISOString(),
    metadata: sanitizeTelemetryMetadata(payload.metadata),
  };

  const serialized = JSON.stringify(eventBody);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([serialized], { type: 'application/json' });
      navigator.sendBeacon(TELEMETRY_ENDPOINT, blob);
      return;
    }
  } catch {
    // Fall through to fetch.
  }

  fetch(TELEMETRY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: serialized,
    keepalive: true,
    credentials: 'omit',
  }).catch(() => {
    // Avoid recursive telemetry errors.
  });
}

function trackTelemetry(eventType, metadata = {}, severity = 'error') {
  if (!eventType) {
    return;
  }

  const key = `${eventType}:${metadata.message || metadata.status || ''}`;
  if (shouldThrottleTelemetry(key)) {
    return;
  }

  sendTelemetryEvent({
    eventType,
    severity,
    message: metadata.message || null,
    metadata,
  });
}

window.trackTelemetry = trackTelemetry;

window.addEventListener('error', (event) => {
  trackTelemetry('frontend_error', {
    message: event.message || 'Unhandled frontend error',
    source: event.filename || null,
    line: event.lineno || null,
    column: event.colno || null,
    stack: event.error && event.error.stack ? event.error.stack : null,
  }, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason && reason.message ? reason.message : String(reason || 'Unhandled promise rejection');
  const stack = reason && reason.stack ? reason.stack : null;

  trackTelemetry('frontend_unhandled_rejection', {
    message,
    stack,
  }, 'error');
});

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

async function requestApi(endpoint, options = {}) {
  const method = options.method || 'GET';
  const url = `${API_BASE}${endpoint}`;

  let res;
  try {
    res = await fetch(url, {
      credentials: 'include',
      ...options,
    });
  } catch (err) {
    trackTelemetry('api_network_error', {
      message: err.message || 'Network request failed',
      endpoint,
      method,
    }, 'error');
    throw err;
  }

  if (!res.ok) {
    const msg = await parseErrorResponse(res);

    if (res.status >= 500 || res.status === 429) {
      trackTelemetry('api_http_error', {
        message: msg,
        endpoint,
        method,
        status: res.status,
      }, res.status >= 500 ? 'error' : 'warning');
    }

    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }

  return res;
}

async function apiGet(endpoint) {
  const res = await requestApi(endpoint, { method: 'GET' });
  return res.json();
}

async function apiPost(endpoint, body) {
  const res = await requestApi(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiPostForm(endpoint, formData) {
  const res = await requestApi(endpoint, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

async function apiPut(endpoint) {
  const res = await requestApi(endpoint, {
    method: 'PUT',
  });
  return res.json();
}
