/* The small terminal and full assistant share the same portfolio knowledge. */
(() => {
  "use strict";

  const terminal = document.getElementById("hero-terminal");
  const output = document.getElementById("terminal-output");
  const form = document.getElementById("terminal-form");
  const input = document.getElementById("terminal-input");
  if (!terminal || !output || !form || !input) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pills = [...terminal.querySelectorAll(".terminal-pill")];
  const submit = form.querySelector('[type="submit"]');
  const clearButton = terminal.querySelector(".dot-close");
  const minimizeButton = terminal.querySelector(".dot-min");
  const expandButton = terminal.querySelector(".dot-max");
  const body = terminal.querySelector(".terminal-body");
  const status = terminal.querySelector(".terminal-status");
  const statusLabel = status?.querySelector("span:last-child");
  const initialOutput = output.cloneNode(true);
  let busy = false;
  let requestId = 0;
  let controller = null;
  let animation = 0;
  let finishAnimation = null;
  let composing = false;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function scrollToLatest() {
    output.scrollTop = output.scrollHeight;
  }

  function setBusy(value) {
    busy = value;
    output.setAttribute("aria-busy", String(value));
    form.setAttribute("aria-busy", String(value));
    if (submit) {
      submit.disabled = value;
      submit.setAttribute("aria-label", value ? "Waiting for answer" : "Ask a question");
    }
    // Keep the input editable while waiting; submitting is guarded below.
    pills.forEach((pill) => { pill.disabled = value; });
    terminal.classList.toggle("is-busy", value);
  }

  function setStatus(available) {
    if (!status) return;
    status.dataset.state = available ? "ready" : "unavailable";
    status.setAttribute("aria-label", available ? "Portfolio assistant ready" : "Assistant unavailable");
    if (statusLabel) statusLabel.textContent = available ? "READY" : "OFFLINE";
  }

  function stopAnimation() {
    cancelAnimationFrame(animation);
    animation = 0;
    if (finishAnimation) finishAnimation();
    finishAnimation = null;
  }

  function revealAnswer(target, text, id) {
    if (reducedMotion.matches) {
      target.textContent = text;
      return Promise.resolve();
    }
    // Reveal in chunks over a short, bounded duration. aria-busy keeps assistive
    // technology from announcing every character as a separate log update.
    return new Promise((resolve) => {
      finishAnimation = resolve;
      const started = performance.now();
      const duration = Math.min(850, text.length * 6);
      const frame = (now) => {
        if (id !== requestId) return resolve();
        const progress = Math.min(1, (now - started) / Math.max(1, duration));
        target.textContent = text.slice(0, Math.ceil(text.length * progress));
        scrollToLatest();
        if (progress < 1 && !reducedMotion.matches) {
          animation = requestAnimationFrame(frame);
        } else {
          target.textContent = text;
          animation = 0;
          finishAnimation = null;
          resolve();
        }
      };
      animation = requestAnimationFrame(frame);
    });
  }

  function safeHref(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value, document.baseURI);
      return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function appendResults(response, turn) {
    const ids = Array.isArray(response.items)
      ? [...new Set(response.items.filter((id) => typeof id === "string"))]
      : [];
    const results = element("div", "terminal-results");
    const linkedDestinations = new Set();
    ids.forEach((id) => {
      const item = window.PortfolioAssistant?.getItem?.(id);
      if (!item || !["project", "experience"].includes(item.kind)) return;
      const card = element("div", "terminal-result");
      const title = element("a", "terminal-result-title", item.title);
      title.href = safeHref(item.portfolioHref || `#${id}`);
      title.addEventListener("click", (event) => {
        event.preventDefault();
        window.PortfolioAssistant?.focusPortfolioCard(id);
      });
      const description = element("p", "terminal-result-description", item.description);
      const actions = element("div", "terminal-result-links");
      const details = element("a", "", item.kind === "project" ? "View project ↗" : "View experience ↗");
      details.href = title.href;
      details.addEventListener("click", (event) => {
        event.preventDefault();
        window.PortfolioAssistant?.focusPortfolioCard(id);
      });
      actions.append(details);
      linkedDestinations.add(title.href);
      const source = safeHref(item.url);
      if (source && new URL(source).hostname === "github.com") {
        const link = element("a", "", "GitHub ↗");
        link.href = source;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        actions.append(link);
        linkedDestinations.add(source);
      }
      card.append(title, description, actions);
      results.append(card);
    });
    if (results.children.length) turn.append(results);
    const links = element("div", "terminal-answer-links");
    (Array.isArray(response.links) ? response.links : []).forEach(({label, href}) => {
      const safe = safeHref(href);
      if (!safe || !label || linkedDestinations.has(safe)) return;
      const link = element("a", "", `${label} ↗`);
      link.href = safe;
      if (new URL(safe).origin !== location.origin && !safe.startsWith("mailto:")) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      if (new URL(safe).hash === "#about") {
        link.addEventListener("click", () => window.PortfolioWork?.showAbout(true));
      }
      links.append(link);
      linkedDestinations.add(safe);
    });
    if (links.children.length) turn.append(links);
    output.classList.toggle("has-results", Boolean(results.children.length || links.children.length));
  }

  async function executeQuery(question) {
    const text = String(question || "").trim().slice(0, 500);
    if (!text || busy) return;
    const id = ++requestId;
    controller = new AbortController();
    setBusy(true);
    input.value = "";
    const command = element("div", "terminal-line command-line");
    command.append(
      element("span", "terminal-prompt-symbol", ">"),
      element("span", "terminal-cmd", ` ${text}`),
    );
    command.firstChild.setAttribute("aria-hidden", "true");
    const loading = element("div", "terminal-line loading-line", "Looking through the portfolio…");
    loading.setAttribute("role", "status");
    const turn = element("div", "terminal-turn");
    turn.append(command, loading);
    output.append(turn);
    scrollToLatest();
    try {
      if (typeof window.PortfolioAssistant?.query !== "function") {
        throw new Error("The assistant is still loading.");
      }
      const response = await window.PortfolioAssistant.query(text, { signal: controller.signal });
      if (id !== requestId) return;
      if (!response?.answer) throw new Error("The assistant returned an empty answer.");
      setStatus(true);
      loading.remove();
      const answer = element("div", "terminal-line response-line");
      turn.append(answer);
      let readableAnswer = String(response.answer).replace(/\*\*([^*]+)\*\*/g, "$1");
      // Collection answers already carry the full list in linked cards below.
      // Keep their introduction short so the projects are immediately visible.
      if (["show_projects", "show_experience"].includes(response.action) && response.items?.length) {
        readableAnswer = readableAnswer.split("\n").find((line) => line.trim()) || readableAnswer;
        if (readableAnswer.length > 160) {
          readableAnswer = `${response.items.length} ${response.action === "show_projects" ? "projects" : "experiences"} to explore. Select one for details.`;
        }
      }
      await revealAnswer(answer, readableAnswer, id);
      if (id !== requestId) return;
      appendResults(response, turn);
      // Keep a long conversation from growing the hero indefinitely.
      while (output.children.length > 10) output.firstElementChild.remove();
      output.scrollTop += turn.getBoundingClientRect().top - output.getBoundingClientRect().top;
    } catch (error) {
      if (id !== requestId || error.name === "AbortError") return;
      loading.remove();
      setStatus(false);
      turn.append(element("div", "terminal-line response-line", "The assistant couldn’t load right now. Try again, or explore the work below."));
    } finally {
      if (id === requestId) {
        loading.remove();
        controller = null;
        setBusy(false);
      }
    }
  }

  function reset() {
    requestId++;
    controller?.abort();
    controller = null;
    stopAnimation();
    output.replaceChildren(...[...initialOutput.childNodes].map((node) => node.cloneNode(true)));
    output.classList.remove("has-results");
    input.value = "";
    setBusy(false);
    output.scrollTop = 0;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!composing) void executeQuery(input.value);
  });
  input.addEventListener("compositionstart", () => { composing = true; });
  input.addEventListener("compositionend", () => { composing = false; });
  pills.forEach((pill) => {
    pill.addEventListener("click", () => void executeQuery(pill.dataset.prompt || pill.textContent));
  });
  const starters = window.PortfolioAssistant?.starters;
  if (Array.isArray(starters)) {
    pills.forEach((pill, index) => {
      if (!starters[index]) return;
      pill.dataset.prompt = starters[index].question;
      pill.replaceChildren(document.createTextNode(starters[index].label + " "));
      const arrow = element("span", "", "↗");
      arrow.setAttribute("aria-hidden", "true");
      pill.append(arrow);
    });
  }
  clearButton?.addEventListener("click", reset);
  minimizeButton?.setAttribute("aria-expanded", String(!body?.hidden));
  minimizeButton?.setAttribute("aria-controls", body?.id || "hero-terminal-body");
  if (body && !body.id) body.id = "hero-terminal-body";
  minimizeButton?.addEventListener("click", () => {
    if (!body) return;
    body.hidden = !body.hidden;
    minimizeButton.setAttribute("aria-expanded", String(!body.hidden));
    minimizeButton.setAttribute("aria-label", body.hidden ? "Expand terminal" : "Minimize terminal");
    minimizeButton.title = body.hidden ? "Expand terminal" : "Minimize terminal";
    terminal.classList.toggle("is-minimized", body.hidden);
  });
  expandButton?.addEventListener("click", () => window.PortfolioAssistant?.open());
  terminal.querySelector(".terminal-full-chat")?.addEventListener("click", () => window.PortfolioAssistant?.open());
  setBusy(false);
  setStatus(Boolean(window.PortfolioAssistant));
  window.PortfolioAssistant?.ready?.().then(
    () => setStatus(true),
    () => setStatus(false),
  );
})();
