(() => {
  "use strict";
  const canvas =
    [...document.querySelectorAll(".work-canvas")].find(
      (element) =>
        element.querySelector(".connections") &&
        element.querySelector(".work-card"),
    ) || document.querySelector("#work-canvas");
  const cards = [...canvas.querySelectorAll(".work-card")];
  const cardById = new Map(cards.map((card) => [card.dataset.node, card]));
  const svg = canvas.querySelector(".connections");
  const reset = document.querySelector("#reset-focus");
  const announcement = document.querySelector("#focus-announcement");
  const about = document.querySelector("#about");
  const aboutToggle = document.querySelector(".about-toggle");
  const smallScreen = window.matchMedia("(max-width: 600px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Draw only the connections actually listed in the latest HTML.
  const edges = [];
  const edgeKeys = new Set();
  cards.forEach((card) => {
    card.querySelectorAll(".card-details [data-connect]").forEach((link) => {
      const from = card.dataset.node;
      const to = link.dataset.connect;
      const key = [from, to].sort().join("::");
      if (from !== to && cardById.has(to) && !edgeKeys.has(key)) {
        edgeKeys.add(key);
        edges.push([from, to]);
      }
    });
  });

  let active = null;
  let activeThread = null;
  let detailOpen = null;
  let connectionPath = [];
  let resizeFrame;
  let escapeFocusTarget = null;

  function clearEscapeFocus() {
    escapeFocusTarget?.classList.remove("is-escape-focus");
    escapeFocusTarget = null;
  }

  function suppressEscapeOutline(target) {
    clearEscapeFocus();
    if (!target) return;
    escapeFocusTarget = target;
    target.classList.add("is-escape-focus");
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") clearEscapeFocus();
    },
    true,
  );
  document.addEventListener("pointerdown", clearEscapeFocus, true);
  document.addEventListener("focusin", (event) => {
    if (event.target !== escapeFocusTarget) clearEscapeFocus();
  });

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
    // Keep decorative labels in the actual gaps as card heights change.
    if (innerWidth > 900 && cards.length >= 6) {
      const labels = [...canvas.querySelectorAll(".connection-label")];
      const rows = [];
      for (let i = 0; i < cards.length; i += 3)
        rows.push(cards.slice(i, i + 3));
      const rowBottom = (row) =>
        Math.max(...row.map((card) => card.offsetTop + card.offsetHeight));
      const rowTop = (row) => Math.min(...row.map((card) => card.offsetTop));
      [0, 1].forEach((index) => {
        if (!labels[index] || !rows[index + 1]) return;
        const gapStart = rowBottom(rows[index]);
        const gapEnd = rowTop(rows[index + 1]);
        labels[index].style.top =
          `${Math.round(gapStart + (gapEnd - gapStart - labels[index].offsetHeight) / 2)}px`;
      });
      if (labels[2] && rows[2]) {
        const gapStart = rowBottom(rows[1]);
        const gapEnd = rowTop(rows[2]);
        labels[2].style.top = `${Math.round(gapStart + (gapEnd - gapStart - labels[2].offsetHeight) * 0.28)}px`;
      }
    }
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.replaceChildren();
    const pathEdges = new Set(
      connectionPath
        .slice(1)
        .map((id, index) => [connectionPath[index], id].sort().join("::")),
    );
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
      if (
        pathEdges.size
          ? pathEdges.has([from, to].sort().join("::"))
          : active && (from === active || to === active)
      )
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
  const threadButtons = [...document.querySelectorAll(".thread-filter")];
  function cardKind(card) {
    if (card.classList.contains("project-card")) return "project";
    if (card.classList.contains("experience-card")) return "experience";
    const label = card
      .querySelector(".card-type")
      ?.textContent.trim()
      .toLowerCase();
    return label === "project" || label === "experience" ? label : null;
  }
  function render(speak = false) {
    canvas.classList.toggle("has-focus", Boolean(active));
    canvas.classList.toggle("has-connection-thread", connectionPath.length > 1);
    reset.hidden = !active && !activeThread;
    cards.forEach((card) => {
      const selected = card.dataset.node === active;
      const reading = card.dataset.node === detailOpen;
      card.classList.toggle("is-active", selected);
      card.classList.toggle(
        "is-in-thread",
        !selected &&
          connectionPath.length > 1 &&
          connectionPath.includes(card.dataset.node),
      );
      card.classList.toggle("is-details-open", reading);
      card
        .querySelector(".card-trigger")
        .setAttribute("aria-pressed", String(selected));
      card
        .querySelector(".card-read-more")
        .setAttribute("aria-expanded", String(reading));
      card.querySelector(".card-details").hidden = !reading;
    });
    drawConnections();
    if (speak) {
      const title = cardById
        .get(active)
        ?.querySelector("h3")
        .textContent.trim();
      announcement.textContent = detailOpen
        ? `${title} details open. Use the connection buttons to follow a thread, or close details.`
        : active
          ? `${title} focused. Choose Read more to see the details.`
          : activeThread
            ? `Showing ${activeThread} cards.`
            : "Showing all projects and experiences.";
    }
  }

  function setThread(kind, clearSelection = true, speak = true) {
    if (kind && !cards.some((card) => cardKind(card) === kind)) kind = null;
    if (clearSelection) {
      active = null;
      detailOpen = null;
      connectionPath = [];
    }
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
      const muted = Boolean(kind && cardKind(card) !== kind);
      card.classList.toggle("thread-muted", muted);
      card.inert = muted;
    });
    render(false);
    if (speak)
      announcement.textContent = kind
        ? `Showing ${kind} cards. Choose a card to focus it.`
        : "Showing all projects and experiences.";
  }

  function closeDetails(returnFocus = true) {
    if (!detailOpen) return;
    const card = cardById.get(detailOpen);
    detailOpen = null;
    render(true);
    if (returnFocus)
      card.querySelector(".card-read-more").focus({ preventScroll: true });
  }

  // The supplied card content stays in the HTML; only the close control is added.
  cards.forEach((card) => {
    const details = card.querySelector(".card-details");
    const name = card.querySelector("h3").textContent.trim();
    const header = document.createElement("div");
    header.className = "detail-overlay-head";
    const heading = document.createElement("div");
    const type = document.createElement("span");
    type.className = "detail-overlay-type";
    type.textContent = card.querySelector(".card-type").textContent.trim();
    const title = document.createElement("h4");
    title.className = "detail-overlay-title";
    title.textContent = name;
    heading.append(type, title);
    const close = document.createElement("button");
    close.className = "detail-overlay-close";
    close.type = "button";
    close.setAttribute("aria-label", `Close details for ${name}`);
    close.textContent = "×";
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      closeDetails();
    });
    header.append(heading, close);
    details.prepend(header);
    details.setAttribute("role", "region");
    details.setAttribute("aria-label", `${name} details`);

    card.querySelector(".card-trigger").addEventListener("click", () => {
      active = active === card.dataset.node ? null : card.dataset.node;
      detailOpen = null;
      connectionPath = [];
      render(true);
    });
    card.querySelector(".card-read-more").addEventListener("click", () => {
      if (activeThread && cardKind(card) !== activeThread)
        setThread(null, false, false);
      active = card.dataset.node;
      connectionPath = connectionPath.at(-1) === active ? connectionPath : [];
      detailOpen = active;
      details.scrollTop = 0;
      render(true);
      close.focus({ preventScroll: true });
    });
  });

  canvas.addEventListener("click", (event) => {
    const connection = event.target.closest("[data-connect]");
    if (connection && canvas.contains(connection)) {
      const from = connection.closest(".work-card")?.dataset.node;
      const to = connection.dataset.connect;
      const target = cardById.get(to);
      if (!from || !target) return;
      if (activeThread && cardKind(target) !== activeThread)
        setThread(null, false, false);
      const previous = connectionPath.at(-1) === from ? connectionPath : [from];
      connectionPath = [...previous, to];
      active = to;
      detailOpen = null;
      render(true);
      const rect = target.getBoundingClientRect();
      if (rect.bottom < 56 || rect.top > innerHeight - 56) {
        target.scrollIntoView({
          behavior: reducedMotion.matches ? "auto" : "smooth",
          block: "center",
        });
      }
      target.querySelector(".card-trigger").focus({ preventScroll: true });
      return;
    }
    if (!event.target.closest(".work-card") && active) {
      active = null;
      detailOpen = null;
      connectionPath = [];
      render(true);
    }
  });
  reset.addEventListener("click", () => setThread(null));
  threadButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.thread;
      setThread(activeThread === kind ? null : kind);
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (detailOpen) {
      const readMore = cardById
        .get(detailOpen)
        ?.querySelector(".card-read-more");
      closeDetails();
      suppressEscapeOutline(readMore);
      return;
    }
    if (active || activeThread) {
      const previous = cardById.get(active);
      const filter = threadButtons.find(
        (button) => button.dataset.thread === activeThread,
      );
      setThread(null);
      const target = previous?.querySelector(".card-trigger") || filter;
      target?.focus({ preventScroll: true });
      suppressEscapeOutline(target);
    }
  });
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(drawConnections);
  });

  setThread(null, true, false);
  announcement.textContent = "";
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) setThread(null);
  });
  document.querySelectorAll('a[href="#work"]').forEach((link) => {
    link.addEventListener("click", () => setThread(null));
  });
  if (document.fonts) document.fonts.ready.then(drawConnections);
})();
