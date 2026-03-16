document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const statusFilter = document.getElementById('status-filter');

  // Check if already logged in (client-side hint; server validates session)
  if (sessionStorage.getItem('adminLoggedIn') === 'true') {
    showDashboard();
  }

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      await apiPost('/admin/login', { username, password });
      sessionStorage.setItem('adminLoggedIn', 'true');
      loginError.style.display = 'none';
      showDashboard();
    } catch (err) {
      loginError.textContent = err.message || 'Invalid username or password.';
      loginError.style.display = 'block';
    }
  });

  // Filter
  statusFilter.addEventListener('change', () => loadReports());

  function handleSessionExpired() {
    sessionStorage.removeItem('adminLoggedIn');
    dashboardSection.style.display = 'none';
    loginSection.style.display = 'block';
    loginError.textContent = 'Session expired. Please log in again.';
    loginError.style.display = 'block';
  }

  async function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    try {
      await loadStats();
      await loadReports();
    } catch (err) {
      if (err.message && err.message.includes('Authentication required')) {
        handleSessionExpired();
      }
    }
  }

  async function loadStats() {
    const stats = await apiGet('/admin/stats');
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-verified').textContent = stats.verified;
    document.getElementById('stat-rejected').textContent = stats.rejected;
  }

  async function loadReports() {
    const loading = document.getElementById('reports-loading');
    const table = document.getElementById('reports-table');
    const tbody = document.getElementById('reports-body');
    const noReports = document.getElementById('no-reports');
    const filter = statusFilter.value;

    loading.style.display = 'flex';
    table.style.display = 'none';
    noReports.style.display = 'none';

    const endpoint = filter === 'ALL'
      ? '/admin/reports'
      : `/reports/status/${filter}`;
    const reports = await apiGet(endpoint);

    loading.style.display = 'none';

    if (reports.length === 0) {
      noReports.textContent = 'No reports found.';
      noReports.style.display = 'block';
      return;
    }

    tbody.innerHTML = '';
    reports.forEach((report) => {
      const row = document.createElement('tr');

      const imgSrc = report.imagePath
        ? `${API_BASE}/files/${report.imagePath}`
        : '';

      row.innerHTML = `
        <td>${imgSrc ? `<img src="${imgSrc}" alt="Pothole" class="table-thumb">` : '\u2014'}</td>
        <td>${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}</td>
        <td>${new Date(report.createdAt).toLocaleDateString()}</td>
        <td>${(report.confidenceScore * 100).toFixed(0)}%</td>
        <td><span class="status-badge status-${report.verificationStatus.toLowerCase()}">${report.verificationStatus}</span></td>
        <td class="actions-cell">
          ${report.verificationStatus === 'PENDING' ? `
            <button class="btn success btn-sm" onclick="updateStatus(${report.id}, 'verify')">Verify</button>
            <button class="btn danger btn-sm" onclick="updateStatus(${report.id}, 'reject')">Reject</button>
          ` : '\u2014'}
        </td>
      `;
      tbody.appendChild(row);
    });

    table.style.display = 'table';
  }

  // Logout
  window.adminLogout = async function () {
    try {
      await apiPost('/admin/logout', {});
    } catch {
      // Even if server call fails, clear client state
    }
    sessionStorage.removeItem('adminLoggedIn');
    dashboardSection.style.display = 'none';
    loginSection.style.display = 'block';
    loginError.style.display = 'none';
  };

  // Update report status
  window.updateStatus = async function (id, action) {
    try {
      await apiPut(`/admin/reports/${id}/${action}`);
      await loadStats();
      await loadReports();
    } catch (err) {
      if (err.message && err.message.includes('Authentication required')) {
        handleSessionExpired();
        return;
      }
      alert('Failed to update report status.');
    }
  };
});
