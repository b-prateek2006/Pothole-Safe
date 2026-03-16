document.addEventListener('DOMContentLoaded', () => {
  const mapStatus = document.getElementById('map-status');

  // Default center: Bangalore
  const defaultLat = 12.97;
  const defaultLng = 77.59;

  const map = L.map('map').setView([defaultLat, defaultLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  const markers = L.markerClusterGroup();

  // Custom pothole icon
  const potholeIcon = L.divIcon({
    html: '<div class="pothole-marker"></div>',
    className: 'pothole-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  // Try to center on user location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 13),
      () => {} // Keep default center on failure
    );
  }

  // Load pothole reports
  loadReports();

  async function loadReports() {
    try {
      const reports = await apiGet('/reports');
      mapStatus.textContent = `Showing ${reports.length} verified pothole${reports.length !== 1 ? 's' : ''}`;

      reports.forEach((report) => {
        const marker = L.marker([report.latitude, report.longitude], { icon: potholeIcon });

        const imgSrc = report.imagePath
          ? `${API_BASE}/files/${report.imagePath}`
          : '';

        const popupContent = `
          <div class="popup-content">
            ${imgSrc ? `<img src="${imgSrc}" alt="Pothole" class="popup-image">` : ''}
            <p><strong>Status:</strong> ${report.verificationStatus}</p>
            <p><strong>Confidence:</strong> ${(report.confidenceScore * 100).toFixed(0)}%</p>
            <p><strong>Reported:</strong> ${new Date(report.createdAt).toLocaleDateString()}</p>
            ${report.description ? `<p>${report.description}</p>` : ''}
          </div>
        `;
        marker.bindPopup(popupContent, { maxWidth: 250 });
        markers.addLayer(marker);
      });

      map.addLayer(markers);
    } catch (err) {
      mapStatus.textContent = 'Could not load pothole reports. Is the server running?';
    }
  }
});