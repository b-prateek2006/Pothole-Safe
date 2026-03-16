// Environment-aware API base URL
const API_BASE = window.POTHOLESAFE_API_BASE || 'http://localhost:3000/api';

// Highlight active nav link
document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }
  });
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
