(() => {
  "use strict";

  const board = document.querySelector("#work-board");
  const about = document.querySelector("#about");
  const aboutToggle = document.querySelector(".about-toggle");
  const aboutLink = document.querySelector("#about-link");
  const announcement = document.querySelector("#focus-announcement");

  function showAbout(open) {
    if (!about || !aboutToggle) return;
    about.hidden = !open;
    aboutToggle.setAttribute("aria-expanded", String(open));
    aboutToggle.querySelector("span:last-child").textContent = open
      ? "A little less"
      : "Read a little more";
  }

  aboutToggle?.addEventListener("click", () => showAbout(about.hidden));
  aboutLink?.addEventListener("click", () => showAbout(true));
  if (location.hash === "#about") showAbout(true);
  if (!board) return;

  const workSection = board.closest(".work-section");
  const launchButton = document.querySelector("#open-work");
  const closeWorkButton = document.querySelector("#close-work");
  const openControls = document.querySelector(".work-open-controls");
  const modes = [...document.querySelectorAll(".work-mode-button")];
  const entries = [...board.querySelectorAll(".work-entry")];
  const entryById = new Map(entries.map((entry) => [entry.dataset.node, entry]));
  const boardHeader = board.querySelector(".work-board-header");
  const boardTitle = board.querySelector("#work-board-title");
  const boardCount = board.querySelector("#work-board-count");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let mode = "experience";
  let openId = null;
  let escapeFocusTarget = null;

  function clearEscapeFocus() {
    escapeFocusTarget?.classList.remove("is-escape-focus");
    escapeFocusTarget = null;
  }

  function suppressEscapeOutline(target) {
    clearEscapeFocus();
    escapeFocusTarget = target;
    target.classList.add("is-escape-focus");
  }

  document.addEventListener("pointerdown", clearEscapeFocus, true);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") clearEscapeFocus();
  }, true);
  document.addEventListener("focusin", (event) => {
    if (event.target !== escapeFocusTarget) clearEscapeFocus();
  });

  function closeEntry(returnFocus = false) {
    const entry = entryById.get(openId);
    if (!entry) return;
    openId = null;
    entry.classList.remove("is-open");
    const trigger = entry.querySelector(".work-entry-trigger");
    trigger.setAttribute("aria-expanded", "false");
    entry.querySelector(".work-entry-details").hidden = true;
    if (returnFocus) trigger.focus({ preventScroll: true });
  }

  function setMode(nextMode, announce = true) {
    if (nextMode !== "experience" && nextMode !== "project") return;
    closeEntry();
    mode = nextMode;
    modes.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
    });
    entries.forEach((entry) => {
      entry.hidden = entry.dataset.kind !== mode;
    });
    const count = entries.filter((entry) => entry.dataset.kind === mode).length;
    const label = mode === "experience" ? "Experience" : "Projects";
    boardTitle.textContent = label;
    boardCount.textContent = String(count).padStart(2, "0") + " entries";
    board.scrollTop = 0;
    if (announce && announcement) {
      announcement.textContent = `Showing ${label.toLowerCase()}. Select a card for details.`;
    }
  }

  function openWork(focusMode = true, scrollToWork = true) {
    if (workSection.classList.contains("is-open")) return;
    setMode("experience", false);
    workSection.classList.add("is-open");
    board.inert = false;
    board.removeAttribute("aria-hidden");
    launchButton.hidden = true;
    launchButton.setAttribute("aria-expanded", "true");
    openControls.hidden = false;
    if (focusMode) modes[0].focus({ preventScroll: true });
    if (scrollToWork) {
      requestAnimationFrame(() => {
        workSection.scrollIntoView({
          behavior: reducedMotion.matches ? "instant" : "smooth",
          block: "start",
        });
      });
    }
    if (announcement) announcement.textContent = "Work window open. Showing experience.";
  }

  function closeWork(viaEscape = false) {
    if (!workSection.classList.contains("is-open")) return;
    closeEntry();
    workSection.classList.remove("is-open");
    board.inert = true;
    board.setAttribute("aria-hidden", "true");
    openControls.hidden = true;
    launchButton.hidden = false;
    launchButton.setAttribute("aria-expanded", "false");
    launchButton.focus({ preventScroll: true });
    if (viaEscape) suppressEscapeOutline(launchButton);
    if (announcement) announcement.textContent = "Work window closed.";
  }

  function scrollEntryIntoBoard(entry) {
    requestAnimationFrame(() => {
      if (openId !== entry.dataset.node) return;
      const offset = entry.getBoundingClientRect().top
        - board.getBoundingClientRect().top
        + board.scrollTop
        - boardHeader.offsetHeight - 15;
      board.scrollTo({
        top: Math.max(0, offset),
        behavior: reducedMotion.matches ? "instant" : "smooth",
      });
    });
  }

  function openEntry(entry, focusTrigger = false) {
    if (!workSection.classList.contains("is-open")) openWork(false, false);
    if (entry.hidden) setMode(entry.dataset.kind, false);
    closeEntry();
    openId = entry.dataset.node;
    entry.classList.add("is-open");
    const trigger = entry.querySelector(".work-entry-trigger");
    trigger.setAttribute("aria-expanded", "true");
    entry.querySelector(".work-entry-details").hidden = false;
    if (focusTrigger) trigger.focus({ preventScroll: true });
    scrollEntryIntoBoard(entry);
    if (announcement) {
      announcement.textContent =
        `${entry.querySelector("h3").textContent.trim()} details open.`;
    }
  }

  entries.forEach((entry) => {
    entry.querySelector(".work-entry-trigger").addEventListener("click", () => {
      if (openId === entry.dataset.node) {
        closeEntry();
        if (announcement) announcement.textContent = "Details closed.";
      } else {
        openEntry(entry);
      }
    });
  });

  modes.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.mode !== mode) setMode(button.dataset.mode);
    });
  });

  launchButton.addEventListener("click", () => openWork());
  closeWorkButton.addEventListener("click", () => closeWork());

  board.addEventListener("click", (event) => {
    const link = event.target.closest("[data-connect]");
    if (!link) return;
    const target = entryById.get(link.dataset.connect);
    if (!target) return;
    openEntry(target, true);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !workSection.classList.contains("is-open")) return;
    if (openId) {
      const trigger = entryById.get(openId).querySelector(".work-entry-trigger");
      closeEntry(true);
      suppressEscapeOutline(trigger);
      if (announcement) announcement.textContent = "Details closed.";
    } else {
      closeWork(true);
    }
    event.preventDefault();
  });

  setMode("experience", false);
  board.inert = true;
  if (announcement) announcement.textContent = "";
})();
