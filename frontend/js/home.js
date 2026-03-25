document.addEventListener('DOMContentLoaded', async () => {
  // Try to load stats from API, fallback to mock data
  let stats = { total: 47, verified: 32, pending: 12, rejected: 3 };

  try {
    const response = await fetch(`${API_BASE}/admin/stats`, {
      credentials: 'include',
    });
    if (response.ok) {
      stats = await response.json();
    }
  } catch {
    // Use mock data if API unavailable
  }

  // Animate counters
  animateCounter('stat-total', stats.total);
  animateCounter('stat-verified', stats.verified);
  animateCounter('stat-pending', stats.pending);

  // Load My Reports from localStorage
  loadMyReports();
});

function animateCounter(elementId, target) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const duration = 1500;
  const steps = 40;
  const stepTime = duration / steps;
  const increment = target / steps;
  let current = 0;
  let step = 0;

  element.classList.add('animate');

  const timer = setInterval(() => {
    step++;
    current = Math.round(increment * step);
    if (step >= steps) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = current;
  }, stepTime);
}

// Track report by ID
function trackReport() {
  const input = document.getElementById('track-report-id');
  const id = input.value.trim();
  if (id) {
    window.location.href = `status.html?id=${id}`;
  }
}

// Load My Reports from localStorage
function loadMyReports() {
  const section = document.getElementById('my-reports-section');
  const list = document.getElementById('my-reports-list');
  if (!section || !list) return;

  const reports = getMyReports();
  if (reports.length === 0) return;

  section.style.display = 'block';
  list.innerHTML = '';

  reports.slice(0, 5).forEach((r) => {
    const li = document.createElement('li');
    const date = new Date(r.date).toLocaleDateString();
    li.innerHTML = `<a href="status.html?id=${r.id}">Report #${r.id}</a> <span class="muted">(${date})</span>`;
    list.appendChild(li);
  });
}
