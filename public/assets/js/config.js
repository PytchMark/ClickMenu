// Configuration for ClickMenu
const Config = (() => {
  // Detect if running on GitHub Pages
  const isGitHubPages = window.location.hostname.includes('github.io');
  
  // API base URL - empty string uses same origin
  const API_BASE_URL = '';
  
  // Enable mock mode on GitHub Pages or if API is unavailable
  const MOCK_MODE = isGitHubPages;
  
  return {
    API_BASE_URL,
    MOCK_MODE,
    isGitHubPages,
  };
})();
