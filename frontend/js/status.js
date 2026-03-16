document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const reportId = params.get('id');

  const loading = document.getElementById('status-loading');
  const content = document.getElementById('status-content');
  const error = document.getElementById('status-error');

  if (!reportId) {
    loading.style.display = 'none';
    error.style.display = 'block';
    return;
  }

  try {
    const report = await apiGet(`/reports/${reportId}`);
    loading.style.display = 'none';
    content.style.display = 'block';

    const statusIcon = document.getElementById('status-icon');
    const statusTitle = document.getElementById('status-title');
    const statusMessage = document.getElementById('status-message');

    switch (report.verificationStatus) {
      case 'PENDING':
        statusIcon.innerHTML = '\u23F3';
        statusTitle.textContent = 'Pending Verification';
        statusMessage.textContent = 'Your report has been submitted and is awaiting verification.';
        break;
      case 'VERIFIED':
        statusIcon.innerHTML = '\u2705';
        statusTitle.textContent = 'Verified';
        statusMessage.textContent = 'Your pothole report has been verified and is now visible on the map.';
        break;
      case 'REJECTED':
        statusIcon.innerHTML = '\u274C';
        statusTitle.textContent = 'Rejected';
        statusMessage.textContent = 'The image could not be verified as a pothole.';
        break;
    }

    // Report image
    if (report.imagePath) {
      const img = document.getElementById('report-image');
      img.src = `${API_BASE}/files/${report.imagePath}`;
      img.style.display = 'block';
    }

    // Details
    document.getElementById('detail-location').textContent =
      `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`;
    document.getElementById('detail-confidence').textContent =
      `${(report.confidenceScore * 100).toFixed(0)}%`;
    document.getElementById('detail-date').textContent =
      new Date(report.createdAt).toLocaleString();
  } catch (err) {
    loading.style.display = 'none';
    error.style.display = 'block';
  }
});