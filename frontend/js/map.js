document.addEventListener('DOMContentLoaded', () => {
  const mapStatus = document.getElementById('map-status');
  const filterBtns = document.querySelectorAll('.filter-btn');

  // Default center: Bangalore
  const defaultLat = 12.97;
  const defaultLng = 77.59;

  const map = L.map('map').setView([defaultLat, defaultLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  let markers = L.markerClusterGroup();
  let currentFilter = 'VERIFIED';
  let allReports = [];

  // Color-coded marker icons
  function createMarkerIcon(status) {
    const statusClass = status.toLowerCase();
    return L.divIcon({
      html: `<div class="pothole-marker ${statusClass}"></div>`,
      className: 'pothole-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }

  // Try to center on user location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 13),
      () => {} // Keep default center on failure
    );
  }

  // Filter button handlers
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderMarkers();
    });
  });

  // Load all reports initially
  loadReports();

  async function loadReports() {
    try {
      // Try to get all reports (for admin) or fall back to verified only
      try {
        const allData = await apiGet('/admin/reports?page=1&limit=1000');
        allReports = allData.reports || [];
      } catch {
        // Not logged in as admin, get verified reports only
        const verified = await apiGet('/reports');
        allReports = verified;
      }
      renderMarkers();
    } catch (err) {
      mapStatus.textContent = 'Could not load pothole reports. Is the server running?';
    }
  }

  function renderMarkers() {
    // Clear existing markers
    markers.clearLayers();
    map.removeLayer(markers);
    markers = L.markerClusterGroup();

    // Filter reports
    const filtered = currentFilter === 'ALL'
      ? allReports
      : allReports.filter(r => r.verificationStatus === currentFilter);

    // Update status text
    const statusLabel = currentFilter === 'ALL' ? '' : currentFilter.toLowerCase() + ' ';
    mapStatus.textContent = `Showing ${filtered.length} ${statusLabel}pothole${filtered.length !== 1 ? 's' : ''}`;

    // Add markers
    filtered.forEach((report) => {
      const icon = createMarkerIcon(report.verificationStatus);
      const marker = L.marker([report.latitude, report.longitude], { icon });

      const imgSrc = report.imagePath
        ? `${API_BASE}/files/${report.imagePath}`
        : '';

      const confidence = report.confidenceScore != null
        ? `${(report.confidenceScore * 100).toFixed(0)}%`
        : 'N/A';

      const statusBadgeClass = report.verificationStatus.toLowerCase();

      const popupContent = `
        <div class="popup-content">
          ${imgSrc ? `<img src="${imgSrc}" alt="Pothole" class="popup-image">` : ''}
          <p><strong>Status:</strong> <span class="status-badge status-${statusBadgeClass}">${report.verificationStatus}</span></p>
          <p><strong>Confidence:</strong> ${confidence}</p>
          <p><strong>Reported:</strong> ${new Date(report.createdAt).toLocaleDateString()}</p>
          ${report.description ? `<p>${report.description}</p>` : ''}
        </div>
      `;
      marker.bindPopup(popupContent, { maxWidth: 250 });
      markers.addLayer(marker);
    });

    map.addLayer(markers);
  }
});
