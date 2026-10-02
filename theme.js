/* Small, shared theme controller for the portfolio and blog. */
(() => {
  const storageKey = "aryan-portfolio-theme";
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  function savedTheme() {
    try {
      const value = localStorage.getItem(storageKey);
      return value === "light" || value === "dark" ? value : null;
    } catch {
      return null;
    }
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#090A0A" : "#F3EFE6";

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

  applyTheme(savedTheme() || (prefersDark.matches ? "dark" : "light"));

  document.addEventListener("DOMContentLoaded", () => {
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
  });

  const systemThemeChanged = (event) => {
    if (!savedTheme()) applyTheme(event.matches ? "dark" : "light");
  };
  if (prefersDark.addEventListener) {
    prefersDark.addEventListener("change", systemThemeChanged);
  } else if (prefersDark.addListener) {
    prefersDark.addListener(systemThemeChanged);
  }
})();
