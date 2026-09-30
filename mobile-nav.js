(() => {
  "use strict";

  const header = document.querySelector(".site-header");
  const mainNav = header?.querySelector('nav[aria-label="Main navigation"]');
  if (!header || !mainNav) return;

  const isHome = Boolean(document.getElementById("open-work"));

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "mobile-menu-button";
  toggle.setAttribute("aria-label", "Open menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "mobile-site-menu");

  for (let i = 0; i < 3; i++) {
    const line = document.createElement("span");
    line.setAttribute("aria-hidden", "true");
    toggle.append(line);
  }

  const menu = document.createElement("nav");
  menu.id = "mobile-site-menu";
  menu.className = "mobile-site-menu";
  menu.setAttribute("aria-label", "Mobile navigation");
  menu.hidden = true;

  const items = isHome
    ? [
        ["Work", "#work"],
        ["About me", "#about"],
        ["Blogs", "blog/index.html"],
      ]
    : [
        ["Work", "../index.html#work"],
        ["About me", "../index.html#about"],
        ["Blogs", "index.html"],
      ];

  items.forEach(([label, href], index) => {
    const link = document.createElement("a");
    link.href = href;
    link.dataset.navTarget = ["work", "about", "blogs"][index];

    const number = document.createElement("span");
    number.className = "mobile-site-menu-number";
    number.textContent = "0" + (index + 1);
    number.setAttribute("aria-hidden", "true");

    const arrow = document.createElement("span");
    arrow.className = "mobile-site-menu-arrow";
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden", "true");

    link.append(number, document.createTextNode(label), arrow);
    menu.append(link);
  });

  header.append(toggle, menu);

  function setMenuOpen(open) {
    menu.hidden = !open;
    header.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  function openWork(event) {
    if (!isHome) return;
    event?.preventDefault();

    const work = document.getElementById("work");

    if (!work?.classList.contains("is-open")) {
      document.getElementById("open-work").click();
    } else {
      document.querySelector(".work-open-controls")?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }
  }

  toggle.addEventListener("click", () => setMenuOpen(menu.hidden));

  menu.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;

    setMenuOpen(false);

    if (link.dataset.navTarget === "work") openWork(event);

    if (link.dataset.navTarget === "about" && isHome) {
      if (document.getElementById("about")?.hidden) {
        document.querySelector(".about-toggle")?.click();
      }
    }
  });

  // Make the existing desktop Work link open the window too.
  mainNav.querySelectorAll('a[href="#work"]').forEach((link) => {
    link.addEventListener("click", openWork);
  });

  document.addEventListener("pointerdown", (event) => {
    if (!menu.hidden && !header.contains(event.target)) {
      setMenuOpen(false);
    }
  });

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape" || menu.hidden) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      setMenuOpen(false);
      toggle.focus({ preventScroll: true });
    },
    true,
  );

  matchMedia("(max-width: 700px)").addEventListener("change", () =>
    setMenuOpen(false),
  );

  function openDeepLink() {
    if (!isHome) return;

    // Arriving from a blog's Work link opens the existing work window.
    if (location.hash === "#work") openWork();

    if (
      location.hash === "#about" &&
      document.getElementById("about")?.hidden
    ) {
      document.querySelector(".about-toggle")?.click();
    }
  }

  if (document.readyState === "complete") openDeepLink();
  else
    document.addEventListener("DOMContentLoaded", openDeepLink, { once: true });

  window.addEventListener("hashchange", openDeepLink);
})();
