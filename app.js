(() => {
  "use strict";
  const canvas = document.querySelector("#work-canvas");
  const cards = [...canvas.querySelectorAll(".work-card")];
  const svg = canvas.querySelector(".connections");
  const reset = document.querySelector("#reset-focus");
  const announcement = document.querySelector("#focus-announcement");
  const about = document.querySelector("#about");
  const aboutToggle = document.querySelector(".about-toggle");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const smallScreen = window.matchMedia("(max-width: 600px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const edges = [
    ["openstudylm", "careergenie"],
    ["openstudylm", "fertrado"],
    ["openstudylm", "rover"],
    ["careergenie", "sentiment"],
    ["sentiment", "teleperformance"],
  ];
  let active = null;
  let activeThread = null;
  let pinned = false;
  let hoverTimer;
  let leaveTimer;
  let resizeFrame;

  function showAbout(open) {
    about.hidden = !open;
    aboutToggle.setAttribute("aria-expanded", String(open));
    aboutToggle.querySelector("span:last-child").textContent = open
      ? "A little less"
      : "Read a little more";
  }
  aboutToggle.addEventListener("click", () => showAbout(about.hidden));
  document
    .querySelector("#about-link")
    .addEventListener("click", () => showAbout(true));
  if (location.hash === "#about") showAbout(true);

  function updateCanvasHeight() {
    if (smallScreen.matches) {
      canvas.style.minHeight = "";
      return;
    }
    const base = innerWidth <= 800 ? 1440 : innerWidth <= 1050 ? 980 : 910;
    const lowest = Math.max(
      ...cards.map((card) => card.offsetTop + card.offsetHeight),
    );
    canvas.style.minHeight = `${Math.max(base, lowest + 80)}px`;
  }
  function drawConnections() {
    updateCanvasHeight();
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.replaceChildren();
    edges.forEach(([from, to]) => {
      const a = document.getElementById(from);
      const b = document.getElementById(to);
      const ac = {
        x: a.offsetLeft + a.offsetWidth / 2,
        y: a.offsetTop + a.offsetHeight / 2,
      };
      const bc = {
        x: b.offsetLeft + b.offsetWidth / 2,
        y: b.offsetTop + b.offsetHeight / 2,
      };
      const dx = bc.x - ac.x,
        dy = bc.y - ac.y;
      let sx, sy, ex, ey, c1x, c1y, c2x, c2y;
      if (Math.abs(dx) > Math.abs(dy) * 0.65 && !smallScreen.matches) {
        const sign = Math.sign(dx);
        sx = ac.x + (sign * a.offsetWidth) / 2;
        sy = ac.y;
        ex = bc.x - (sign * b.offsetWidth) / 2;
        ey = bc.y;
        const bend = Math.max(40, Math.abs(ex - sx) * 0.5);
        c1x = sx + sign * bend;
        c1y = sy;
        c2x = ex - sign * bend;
        c2y = ey;
      } else {
        const sign = Math.sign(dy) || 1;
        sx = ac.x;
        sy = ac.y + (sign * a.offsetHeight) / 2;
        ex = bc.x;
        ey = bc.y - (sign * b.offsetHeight) / 2;
        const bend = Math.max(35, Math.abs(ey - sy) * 0.5);
        c1x = sx;
        c1y = sy + sign * bend;
        c2x = ex;
        c2y = ey - sign * bend;
      }
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute(
        "d",
        `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`,
      );
      if (active && (from === active || to === active))
        path.classList.add("is-connected");
      svg.append(path);
      [
        [sx, sy],
        [ex, ey],
      ].forEach(([cx, cy]) => {
        const dot = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle",
        );
        dot.setAttribute("cx", cx);
        dot.setAttribute("cy", cy);
        dot.setAttribute("r", 3);
        svg.append(dot);
      });
    });
  }
  function focusCard(id, pin = false, speak = false) {
    clearTimeout(hoverTimer);
    clearTimeout(leaveTimer);
    active = id;
    pinned = pin && Boolean(id);
    canvas.classList.toggle("has-focus", Boolean(id));
    reset.hidden = !id && !activeThread;
    cards.forEach((card) => {
      const selected = card.dataset.node === id;
      card.classList.toggle("is-active", selected);
      card
        .querySelector(".card-trigger")
        .setAttribute("aria-expanded", String(selected));
      card.querySelector(".card-details").hidden = !selected;
    });
    drawConnections();
    if (speak)
      announcement.textContent = id
        ? `${document.getElementById(id).querySelector("h3").textContent}. Details expanded. Use Show all cards or Escape to reset.`
        : activeThread
          ? `Showing the ${activeThread} thread.`
          : "Showing all projects and experiences.";
  }
  cards.forEach((card) => {
    const trigger = card.querySelector(".card-trigger");
    card.addEventListener("pointerenter", () => {
      clearTimeout(leaveTimer);
      if (!finePointer.matches || pinned) return;
      hoverTimer = setTimeout(() => focusCard(card.dataset.node), 130);
    });
    card.addEventListener("pointerleave", () => {
      clearTimeout(hoverTimer);
      if (!finePointer.matches || pinned) return;
      leaveTimer = setTimeout(() => {
        if (!pinned) focusCard(null);
      }, 160);
    });
    trigger.addEventListener("click", () => {
      const wasPinned = active === card.dataset.node && pinned;
      focusCard(wasPinned ? null : card.dataset.node, !wasPinned, true);
    });
  });
  document.querySelectorAll("[data-connect]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = button.dataset.connect;
      focusCard(id, true, true);
      const target = document.getElementById(id);
      target.querySelector(".card-trigger").focus({ preventScroll: true });
      target.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "center",
      });
    });
  });
  reset.addEventListener("click", () => {
    const previous = active;
    focusCard(null, false, true);
    if (previous)
      document
        .getElementById(previous)
        .querySelector(".card-trigger")
        .focus({ preventScroll: true });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && active) {
      const previous = active;
      focusCard(null, false, true);
      document
        .getElementById(previous)
        .querySelector(".card-trigger")
        .focus({ preventScroll: true });
    }
  });
  canvas.addEventListener("click", (event) => {
    if (!event.target.closest(".work-card")) focusCard(null, false, true);
  });
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(drawConnections);
  });
  const threadButtons = [...document.querySelectorAll(".thread-filter")];

  function setThread(kind, closeCard = true) {
    if (closeCard) focusCard(null);
    activeThread = kind;
    canvas.classList.toggle("has-thread", Boolean(kind));
    canvas.dataset.thread = kind || "";

    threadButtons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.thread === kind),
      );
    });

    cards.forEach((card) => {
      const muted = Boolean(kind) && !card.classList.contains(`${kind}-card`);
      card.classList.toggle("thread-muted", muted);
      card.inert = muted;
    });

    reset.hidden = !active && !kind;
    drawConnections();
    announcement.textContent = kind
      ? `Showing ${kind} cards. Click the filter again or Show all cards to reset.`
      : "Showing all projects and experiences.";
  }

  threadButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.thread;
      setThread(activeThread === kind ? null : kind);
    });
  });

  reset.addEventListener("click", () => setThread(null, false), true);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !activeThread) return;
    const button = threadButtons.find(
      (item) => item.dataset.thread === activeThread,
    );
    setThread(null, false);
    button?.focus({ preventScroll: true });
  });

  canvas.addEventListener(
    "click",
    (event) => {
      const related = event.target.closest("[data-connect]");
      if (!related || !activeThread) return;

      const target = document.getElementById(related.dataset.connect);
      if (target && !target.classList.contains(`${activeThread}-card`)) {
        setThread(null, false);
      }
    },
    true,
  );
  if (document.fonts) document.fonts.ready.then(drawConnections);
  drawConnections();

  const emoteButton = document.querySelector(".emote-button");
  const emoteImage = emoteButton.querySelector(".emote-image");
  const emoteCaption = document.querySelector("#emote-caption");
  const emotes = [
    { key: "smile", label: "a relaxed smile", caption: "nonchalant" },
    { key: "wink", label: "a wink", caption: "a little wink ✳" },
    { key: "wave", label: "a friendly wave", caption: "hey, there!" },
    {
      key: "thinking",
      label: "thinking it through",
      caption: "thinking it through...",
    },
    { key: "laugh", label: "a happy laugh", caption: "this made my day" },
    {
      key: "surprised",
      label: "a pleasant surprise",
      caption: "oh, interesting!",
    },
  ];
  let emoteIndex = 0;

  emoteButton.addEventListener("click", () => {
    emoteIndex = (emoteIndex + 1) % emotes.length;
    const emote = emotes[emoteIndex];

    emoteButton.dataset.emote = emote.key;
    emoteButton.setAttribute(
      "aria-label",
      `Aryan's illustrated portrait: ${emote.label}. Activate for another expression.`,
    );
    emoteCaption.textContent = emote.caption;

    if (!reducedMotion.matches && emoteImage.animate) {
      emoteImage.animate(
        [
          { transform: "translateY(2px) scale(.98)" },
          { transform: "translateY(-7px) scale(1.035)" },
          { transform: "translateY(0) scale(1)" },
        ],
        { duration: 370, easing: "cubic-bezier(.2,.7,.2,1)" },
      );
    }
  });
})();
