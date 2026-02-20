// ClickMenu Brand Config System
// Cloud Run: reads from /api/config endpoint (env vars)
// GitHub Pages: falls back to defaults below
const Config = (() => {
  const isGitHubPages = window.location.hostname.includes('github.io');
  const API_BASE_URL = '';
  const MOCK_MODE = isGitHubPages;

  // Defaults (used by GitHub Pages or before config loads)
  let brandName = 'ClickMenuJA';
  let brandLogoUrl = 'https://res.cloudinary.com/dd8pjjxsm/image/upload/v1771556041/IMG-20260219-WA0080_msvwo2.jpg';

  const loadBrandConfig = async () => {
    if (isGitHubPages) return;
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.brandName) brandName = data.brandName;
        if (data.brandLogoUrl) brandLogoUrl = data.brandLogoUrl;
      }
    } catch (e) {
      // Silently fall back to defaults
    }
  };

  const applyBranding = () => {
    document.querySelectorAll('[data-brand-name]').forEach(el => {
      el.textContent = brandName;
    });
    document.querySelectorAll('[data-brand-logo]').forEach(el => {
      el.src = brandLogoUrl;
      el.alt = brandName;
    });
    document.querySelectorAll('[data-brand-title]').forEach(el => {
      document.title = el.dataset.brandTitle.replace('{{brand}}', brandName);
    });
  };

  const init = async () => {
    await loadBrandConfig();
    applyBranding();
  };

  return {
    API_BASE_URL,
    MOCK_MODE,
    isGitHubPages,
    get brandName() { return brandName; },
    get brandLogoUrl() { return brandLogoUrl; },
    init,
    applyBranding,
  };
})();

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Config.init());
} else {
  Config.init();
}
