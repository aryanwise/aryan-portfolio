/* Small, shared theme controller for the portfolio and blog. */
(() => {
  const storageKey = "aryan-portfolio-theme";
  const root = document.documentElement;

  function savedTheme() {
    try {
      const value = localStorage.getItem(storageKey);
      return value === "light" || value === "dark" ? value : null;
    } catch {
      return null;
    }
  }

  function applyTheme(theme) {
    theme = theme === "light" ? "light" : "dark";
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#0D0E11" : "#F4F1EA";

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const dark = theme === "dark";
      button.setAttribute("aria-pressed", String(dark));
      button.setAttribute(
        "aria-label",
        dark
          ? "Dark mode is on; switch to light mode"
          : "Light mode is on; switch to dark mode",
      );
      const icon = button.querySelector(".theme-toggle-icon");
      const label = button.querySelector(".theme-toggle-text");
      if (icon) icon.textContent = dark ? "☀" : "☾";
      if (label) label.textContent = dark ? "Light mode" : "Dark mode";
    });
  }

  applyTheme(savedTheme() || "dark");

  function initializeControls() {
    applyTheme(root.dataset.theme);
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = root.dataset.theme === "dark" ? "light" : "dark";
        try {
          localStorage.setItem(storageKey, next);
        } catch {}
        applyTheme(next);
      });
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeControls, { once: true });
  } else {
    initializeControls();
  }

  // Keep the portfolio and notebook consistent when both are open in tabs.
  window.addEventListener("storage", (event) => {
    if (event.key === storageKey || event.key === null) {
      applyTheme(savedTheme() || "dark");
    }
  });
})();
