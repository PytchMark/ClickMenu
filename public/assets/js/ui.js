// UI Utility — Premium SaaS
const UI = (() => {
  const toastContainer = (() => {
    let el = document.querySelector('.toast-container');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast-container';
      document.body.appendChild(el);
    }
    return el;
  })();

  const toast = (msg, type = 'info') => {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    t.innerHTML = `<i class="fas ${icon}" style="margin-right:8px;"></i>${msg}`;
    toastContainer.appendChild(t);
    setTimeout(() => {
      t.classList.add('toast-hide');
      setTimeout(() => t.remove(), 300);
    }, 4000);
  };

  const setLoading = (btn, loading) => {
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    } else if (btn.dataset.originalText) {
      btn.innerHTML = btn.dataset.originalText;
    }
  };

  const skeleton = (container, count = 3) => {
    if (!container) return;
    container.innerHTML = Array.from({ length: count }, () =>
      '<div class="skeleton-row"></div>'
    ).join('');
  };

  const showError = (container, message) => {
    if (!container) return;
    container.innerHTML = `
      <div style="padding:24px;border-radius:14px;border:1px solid rgba(225,29,72,0.2);background:rgba(225,29,72,0.06);color:#fb7185;text-align:center;font-size:0.9rem;">
        <i class="fas fa-exclamation-triangle" style="margin-right:8px;"></i>${message}
      </div>
    `;
  };

  const showEmpty = (container, message, icon = 'fa-inbox') => {
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state" data-testid="empty-state">
        <i class="fas ${icon}" style="font-size:2rem;display:block;margin-bottom:12px;opacity:0.4;"></i>
        ${message}
      </div>
    `;
  };

  return { toast, setLoading, skeleton, showError, showEmpty };
})();
