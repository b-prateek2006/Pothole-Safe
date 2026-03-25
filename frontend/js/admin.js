document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const statusFilter = document.getElementById('status-filter');

  // Pagination state
  let currentPage = 1;
  let totalPages = 1;
  const PAGE_SIZE = 10;

  // Chart instance
  let statusChart = null;

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

  // Filter - reset to page 1 when filter changes
  statusFilter.addEventListener('change', () => {
    currentPage = 1;
    loadReports();
  });

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

    // Render chart
    renderChart(stats);
  }

  function renderChart(stats) {
    const ctx = document.getElementById('status-chart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (statusChart) {
      statusChart.destroy();
    }

    statusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Verified', 'Pending', 'Rejected'],
        datasets: [{
          data: [stats.verified, stats.pending, stats.rejected],
          backgroundColor: ['#16a34a', '#facc15', '#dc2626'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
            }
          }
        },
        cutout: '60%',
      }
    });
  }

  async function loadReports() {
    const loading = document.getElementById('reports-loading');
    const table = document.getElementById('reports-table');
    const tbody = document.getElementById('reports-body');
    const noReports = document.getElementById('no-reports');
    const pagination = document.getElementById('pagination');
    const filter = statusFilter.value;

    loading.style.display = 'flex';
    table.style.display = 'none';
    noReports.style.display = 'none';
    pagination.style.display = 'none';

    let reports = [];
    let total = 0;

    if (filter === 'ALL') {
      const data = await apiGet(`/admin/reports?page=${currentPage}&limit=${PAGE_SIZE}`);
      reports = data.reports;
      total = data.total;
      totalPages = data.totalPages;
    } else {
      // Filter by status uses the old non-paginated endpoint
      reports = await apiGet(`/reports/status/${filter}`);
      total = reports.length;
      totalPages = 1;
    }

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

      const confidence = report.confidenceScore != null
        ? `${(report.confidenceScore * 100).toFixed(0)}%`
        : 'N/A';

      const lat = report.latitude != null ? report.latitude.toFixed(4) : 'N/A';
      const lng = report.longitude != null ? report.longitude.toFixed(4) : 'N/A';

      row.innerHTML = `
        <td>${imgSrc ? `<img src="${imgSrc}" alt="Pothole" class="table-thumb" onclick="showImageModal('${imgSrc}')">` : '\u2014'}</td>
        <td>${lat}, ${lng}</td>
        <td>${new Date(report.createdAt).toLocaleDateString()}</td>
        <td>${confidence}</td>
        <td><span class="status-badge status-${report.verificationStatus.toLowerCase()}">${report.verificationStatus}</span></td>
        <td class="actions-cell">
          ${report.verificationStatus === 'PENDING' ? `
            <button class="btn success btn-sm" onclick="updateStatus(${report.id}, 'verify')">Verify</button>
            <button class="btn danger btn-sm" onclick="updateStatus(${report.id}, 'reject')">Reject</button>
          ` : ''}
          <button class="btn danger btn-sm" onclick="deleteReport(${report.id})">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    table.style.display = 'table';

    // Update pagination
    if (filter === 'ALL' && totalPages > 1) {
      document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
      document.getElementById('prev-page').disabled = currentPage === 1;
      document.getElementById('next-page').disabled = currentPage === totalPages;
      pagination.style.display = 'flex';
    }
  }

  // Pagination navigation
  window.goToPage = function (delta) {
    currentPage += delta;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    loadReports();
  };

  // Logout
  window.adminLogout = async function () {
    if (!confirm('Are you sure you want to logout?')) return;
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

  // Toast notification
  function showToast(message, type = 'error') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Update report status
  window.updateStatus = async function (id, action) {
    const actionText = action === 'verify' ? 'verify' : 'reject';
    if (!confirm(`Are you sure you want to ${actionText} this report?`)) return;

    try {
      await apiPut(`/admin/reports/${id}/${action}`);
      showToast(`Report ${actionText === 'verify' ? 'verified' : 'rejected'} successfully!`, 'success');
      await loadStats();
      await loadReports();
    } catch (err) {
      if (err.message && err.message.includes('Authentication required')) {
        handleSessionExpired();
        return;
      }
      showToast(err.message || 'Failed to update report status.');
    }
  };

  // Delete report
  window.deleteReport = async function (id) {
    if (!confirm('Are you sure you want to delete this report? This cannot be undone.')) return;

    try {
      const response = await fetch(`${API_BASE}/admin/reports/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete report');
      }
      showToast('Report deleted successfully!', 'success');
      await loadStats();
      await loadReports();
    } catch (err) {
      if (err.message && err.message.includes('Authentication required')) {
        handleSessionExpired();
        return;
      }
      showToast(err.message || 'Failed to delete report.');
    }
  };

  // Export CSV - use fetch with credentials, then download blob
  window.exportCSV = async function () {
    try {
      const response = await fetch(`${API_BASE}/admin/reports/export`, {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          handleSessionExpired();
          return;
        }
        throw new Error('Failed to export CSV');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pothole-reports.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      showToast('CSV exported successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export CSV');
    }
  };

  // Image Modal
  window.showImageModal = function (src) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('image-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'image-modal';
      modal.className = 'image-modal';
      modal.innerHTML = `
        <button class="image-modal-close" onclick="closeImageModal()">&times;</button>
        <img src="" alt="Full size">
      `;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeImageModal();
      });
      document.body.appendChild(modal);
    }

    modal.querySelector('img').src = src;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  };

  window.closeImageModal = function () {
    const modal = document.getElementById('image-modal');
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  };

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeImageModal();
  });
});
