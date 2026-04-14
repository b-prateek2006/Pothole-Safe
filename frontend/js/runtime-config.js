// Set this for split deployments (for example: https://your-backend.up.railway.app/api)
window.POTHOLESAFE_API_BASE = window.POTHOLESAFE_API_BASE || 'https://web-production-73792.up.railway.app/api';

(function initRuntimeConfig() {
  const configured = (window.POTHOLESAFE_API_BASE || '').trim();
  if (configured) {
    window.POTHOLESAFE_API_BASE = configured.replace(/\/$/, '');
    return;
  }

  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  window.POTHOLESAFE_API_BASE = isLocal ? 'http://localhost:3000/api' : '/api';
})();
