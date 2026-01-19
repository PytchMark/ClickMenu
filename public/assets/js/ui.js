const UI = (() => {
  const toastContainerId = "toast-container";

  const ensureToastContainer = () => {
    let container = document.getElementById(toastContainerId);
    if (!container) {
      container = document.createElement("div");
      container.id = toastContainerId;
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  };

  const toast = (message, variant = "success") => {
    const container = ensureToastContainer();
    const toastEl = document.createElement("div");
    toastEl.className = `toast toast-${variant}`;
    toastEl.textContent = message;
    container.appendChild(toastEl);
    setTimeout(() => {
      toastEl.classList.add("toast-hide");
    }, 2600);
    setTimeout(() => {
      toastEl.remove();
    }, 3400);
  };

  const setLoading = (element, isLoading) => {
    if (!element) return;
    element.disabled = isLoading;
    element.dataset.loading = isLoading ? "true" : "false";
  };

  const skeleton = (count = 3) => {
    return Array.from({ length: count })
      .map(
        () => `
        <div class="skeleton-card">
          <div class="skeleton-thumb"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      `
      )
      .join("");
  };

  return {
    toast,
    setLoading,
    skeleton,
  };
})();
