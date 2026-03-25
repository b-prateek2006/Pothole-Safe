document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const reportId = params.get('id');

  const loading = document.getElementById('status-loading');
  const content = document.getElementById('status-content');
  const error = document.getElementById('status-error');

  let refreshInterval = null;

  if (!reportId) {
    loading.style.display = 'none';
    error.style.display = 'block';
    return;
  }

  async function loadReport() {
    try {
      const report = await apiGet(`/reports/${reportId}`);
      loading.style.display = 'none';
      content.style.display = 'block';

      const statusIcon = document.getElementById('status-icon');
      const statusTitle = document.getElementById('status-title');
      const statusMessage = document.getElementById('status-message');

      // Update progress tracker
      updateProgressTracker(report.verificationStatus);

      switch (report.verificationStatus) {
        case 'PENDING':
          statusIcon.innerHTML = '\u23F3';
          statusTitle.textContent = 'Pending Verification';
          statusMessage.textContent = 'Your report has been submitted and is awaiting verification. This page will auto-update.';
          // Start auto-refresh if pending
          if (!refreshInterval) {
            refreshInterval = setInterval(loadReport, 30000);
          }
          break;
        case 'VERIFIED':
          statusIcon.innerHTML = '\u2705';
          statusTitle.textContent = 'Verified';
          statusMessage.textContent = 'Your pothole report has been verified and is now visible on the map.';
          stopAutoRefresh();
          break;
        case 'REJECTED':
          statusIcon.innerHTML = '\u274C';
          statusTitle.textContent = 'Rejected';
          statusMessage.textContent = 'The image could not be verified as a pothole.';
          stopAutoRefresh();
          break;
        default:
          statusIcon.innerHTML = '\u2753';
          statusTitle.textContent = 'Unknown Status';
          statusMessage.textContent = 'Unable to determine the status of this report.';
          stopAutoRefresh();
      }

      // Report image
      if (report.imagePath) {
        const img = document.getElementById('report-image');
        img.src = `${API_BASE}/files/${report.imagePath}`;
        img.style.display = 'block';
      }

      // Confidence gauge
      if (report.confidenceScore != null) {
        updateConfidenceGauge(report.confidenceScore);
      }

      // Details
      const lat = report.latitude != null ? report.latitude.toFixed(4) : 'N/A';
      const lng = report.longitude != null ? report.longitude.toFixed(4) : 'N/A';
      document.getElementById('detail-location').textContent = `${lat}, ${lng}`;

      const confidence = report.confidenceScore != null
        ? `${(report.confidenceScore * 100).toFixed(0)}%`
        : 'N/A';
      document.getElementById('detail-confidence').textContent = confidence;

      document.getElementById('detail-date').textContent =
        report.createdAt ? new Date(report.createdAt).toLocaleString() : 'N/A';
    } catch (err) {
      loading.style.display = 'none';
      error.style.display = 'block';
      stopAutoRefresh();
    }
  }

  function updateProgressTracker(status) {
    const steps = document.querySelectorAll('.progress-step');
    const lines = document.querySelectorAll('.progress-line');
    const resultIcon = document.getElementById('result-icon');
    const resultLabel = document.getElementById('result-label');

    // Reset all steps
    steps.forEach(s => {
      s.classList.remove('completed', 'active', 'rejected');
    });
    lines.forEach(l => l.classList.remove('completed'));

    // Step 1: Submitted - always completed
    steps[0].classList.add('completed');
    lines[0].classList.add('completed');

    switch (status) {
      case 'PENDING':
        steps[1].classList.add('active');
        resultIcon.innerHTML = '?';
        resultLabel.textContent = 'Pending';
        break;
      case 'VERIFIED':
        steps[1].classList.add('completed');
        lines[1].classList.add('completed');
        steps[2].classList.add('completed');
        resultIcon.innerHTML = '\u2713';
        resultLabel.textContent = 'Verified';
        break;
      case 'REJECTED':
        steps[1].classList.add('completed');
        lines[1].classList.add('completed');
        steps[2].classList.add('rejected');
        resultIcon.innerHTML = '\u2717';
        resultLabel.textContent = 'Rejected';
        break;
    }
  }

  function updateConfidenceGauge(score) {
    const gauge = document.getElementById('confidence-gauge');
    const fill = document.getElementById('gauge-fill');
    const value = document.getElementById('gauge-value');

    gauge.style.display = 'block';

    const percent = Math.round(score * 100);
    value.textContent = `${percent}%`;

    // Determine color class
    fill.classList.remove('high', 'medium', 'low');
    if (percent >= 80) {
      fill.classList.add('high');
    } else if (percent >= 60) {
      fill.classList.add('medium');
    } else {
      fill.classList.add('low');
    }

    // Animate fill after a brief delay
    setTimeout(() => {
      fill.style.width = `${percent}%`;
    }, 100);
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  // Initial load
  await loadReport();

  // Cleanup on page unload
  window.addEventListener('beforeunload', stopAutoRefresh);
});

// Copy status link to clipboard
function copyStatusLink() {
  copyToClipboard(window.location.href).then(() => {
    const msg = document.getElementById('copy-success');
    if (msg) {
      msg.style.display = 'block';
      setTimeout(() => { msg.style.display = 'none'; }, 2000);
    }
  });
}

// Navigate to report from error state
function goToReport() {
  const input = document.getElementById('status-track-id');
  const id = input.value.trim();
  if (id) {
    window.location.href = `status.html?id=${id}`;
  }
}
