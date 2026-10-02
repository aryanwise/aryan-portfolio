(() => {
  "use strict";

  // On GitHub Pages leave this empty. Configure an HTTPS serverless endpoint
  // using window.AskAryanConfig = { endpoint: 'https://your-service.example/api/chat' }
  // BEFORE this script loads. Keep the Groq key on that server, never here.
  const script = document.currentScript;
  const base = new URL(
    "./",
    script?.src || new URL("./chatbot/chatbot.js", document.baseURI),
  );
  const endpoint = String(
    window.AskAryanConfig?.endpoint || script?.dataset.endpoint || "",
  ).trim();
  const storageKey = "ask-aryan-conversation-v1";
  const allowedActions = new Set([
    "message",
    "show_projects",
    "show_experience",
    "show_skills",
    "show_education",
    "open_project",
    "open_experience",
    "highlight_item",
    "reset_canvas",
  ]);
  const stopWords = new Set([
    "about",
    "again",
    "aryan",
    "does",
    "have",
    "here",
    "his",
    "how",
    "into",
    "more",
    "much",
    "show",
    "some",
    "that",
    "their",
    "them",
    "these",
    "this",
    "those",
    "what",
    "when",
    "where",
    "which",
    "with",
    "work",
    "your",
  ]);
  const state = {
    data: null,
    items: new Map(),
    view: "overview",
    previousView: "overview",
    selected: null,
    filterIds: null,
    tab: "chat",
    busy: false,
    history: [],
    lastFocus: null,
    loading: null,
  };

  // This template is fixed markup. All questions, JSON content and endpoint
  // responses enter the document through textContent, never HTML parsing.
  const host = document.createElement("div");
  host.className = "aryan-chatbot-root";
  host.innerHTML = `
    <button class="aryan-chatbot-launcher" type="button" data-action="open"
      aria-label="Open Ask Aryan, an interactive guide to Aryan's portfolio"
      aria-controls="aryan-chatbot-dialog" aria-expanded="false">
      <span class="aryan-chatbot-launcher-prompt">Don't feel like reading about me?</span>
      <span class="aryan-chatbot-launcher-label">ASK ARYAN</span>
    </button>
    <button class="aryan-chatbot-backdrop" type="button" data-action="minimize"
      aria-label="Minimize Ask Aryan" tabindex="-1"></button>
    <section class="aryan-chatbot-panel" id="aryan-chatbot-dialog" role="dialog"
      aria-modal="true" aria-labelledby="aryan-chatbot-title" aria-hidden="true" tabindex="-1" data-tab="chat">
      <header class="aryan-chatbot-header">
        <div class="aryan-chatbot-heading">
          <h2 id="aryan-chatbot-title">Ask Aryan<span aria-hidden="true">.</span></h2>
          <p>Interactive portfolio · questions into connections</p>
        </div>
        <div class="aryan-chatbot-header-actions">
          <button class="aryan-chatbot-icon-button" type="button" data-action="minimize"
            aria-label="Minimize assistant" title="Minimize">−</button>
          <button class="aryan-chatbot-icon-button" type="button" data-action="close"
            aria-label="Close assistant" title="Close">×</button>
        </div>
      </header>
      <div class="aryan-chatbot-tabs" role="tablist" aria-label="Assistant views">
        <button class="aryan-chatbot-tab" type="button" role="tab" id="aryan-chatbot-chat-tab"
          data-tab="chat" aria-selected="true" aria-controls="aryan-chatbot-chat-panel">Chat</button>
        <button class="aryan-chatbot-tab" type="button" role="tab" id="aryan-chatbot-explore-tab"
          data-tab="explore" aria-selected="false" aria-controls="aryan-chatbot-explore-panel">Explore</button>
      </div>
      <div class="aryan-chatbot-layout">
        <section class="aryan-chatbot-chat" id="aryan-chatbot-chat-panel" role="tabpanel"
          aria-labelledby="aryan-chatbot-chat-tab">
          <div class="aryan-chatbot-chat-toolbar">
            <span class="aryan-chatbot-kicker">A conversation with the work</span>
            <button class="aryan-chatbot-small-button" type="button" data-action="clear">New conversation</button>
          </div>
          <div class="aryan-chatbot-log" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text"></div>
          <div class="aryan-chatbot-suggestions">
            <p class="aryan-chatbot-suggestions-title">Try a question</p>
            <div class="aryan-chatbot-suggestions-list"></div>
          </div>
          <form class="aryan-chatbot-form">
            <label for="aryan-chatbot-input" class="sr-only">Ask a question about Aryan's portfolio</label>
            <textarea class="aryan-chatbot-input" id="aryan-chatbot-input" rows="1" maxlength="500"
              placeholder="Ask about a project, a skill, an experience…"></textarea>
            <button class="aryan-chatbot-send" type="submit" aria-label="Send question" title="Send">↗</button>
          </form>
        </section>
        <section class="aryan-chatbot-explore" id="aryan-chatbot-explore-panel" role="tabpanel"
          aria-labelledby="aryan-chatbot-explore-tab">
          <div class="aryan-chatbot-explore-toolbar">
            <span class="aryan-chatbot-kicker">The connected portfolio</span>
          </div>
          <div class="aryan-chatbot-canvas"></div>
        </section>
      </div>
    </section>`;
  document.body.append(host);
  const $ = (selector) => host.querySelector(selector);
  const launcher = $(".aryan-chatbot-launcher");
  const intro = document.querySelector(".aryan-chatbot-intro");
  if (intro) {
    intro.append(launcher);
    launcher.addEventListener("click", open);
  }
  const panel = $(".aryan-chatbot-panel");
  const log = $(".aryan-chatbot-log");
  const canvas = $(".aryan-chatbot-canvas");
  const suggestionsList = $(".aryan-chatbot-suggestions-list");
  const input = $(".aryan-chatbot-input");
  const sendButton = $(".aryan-chatbot-send");
  const page = document.querySelector(".page-shell");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }
  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\ba[.\s-]*d[.\s-]*s[.\s-]*a\b/g, "adsa")
      .replace(/[^a-z0-9+]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }
  function tokens(value) {
    return [
      ...new Set(
        normalize(value)
          .split(" ")
          .filter((word) => word.length > 2 && !stopWords.has(word)),
      ),
    ];
  }
  function saveHistory() {
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify(state.history.slice(-40)),
      );
    } catch {
      /* Private browsing can disable sessionStorage. */
    }
  }
  function readHistory() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved
        .slice(-40)
        .filter(
          (entry) =>
            entry &&
            ["user", "assistant"].includes(entry.role) &&
            typeof entry.text === "string",
        )
        .map((entry) => ({
          role: entry.role,
          text: entry.text.slice(0, 1400),
        }));
    } catch {
      return [];
    }
  }
  function appendAssistantMarkdown(container, source) {
    function addInline(target, text) {
      for (const part of text.split(/(\*\*[^*\n]+\*\*)/g)) {
        if (!part) continue;

        if (part.startsWith("**") && part.endsWith("**")) {
          target.append(el("strong", "", part.slice(2, -2)));
        } else {
          target.append(document.createTextNode(part));
        }
      }
    }

    let list = null;

    for (const raw of String(source).replace(/\r\n?/g, "\n").split("\n")) {
      const line = raw.trim();
      if (!line) {
        list = null;
        continue;
      }

      const bullet = line.match(/^[-*]\s+(.+)/);
      const number = line.match(/^\d+[.)]\s+(.+)/);

      if (bullet || number) {
        const tag = number ? "ol" : "ul";
        if (!list || list.localName !== tag) {
          list = el(tag);
          container.append(list);
        }

        const item = el("li");
        addInline(item, (bullet || number)[1]);
        list.append(item);
      } else {
        list = null;
        const paragraph = el("p");
        addInline(paragraph, line);
        container.append(paragraph);
      }
    }
  }
  function addMessage(role, message, remember = true) {
    const row = el("div", `aryan-chatbot-message aryan-chatbot-${role}`);
    row.append(
      el(
        "span",
        "aryan-chatbot-message-role",
        role === "user" ? "You" : "Ask Aryan",
      ),
    );
    const content = el(
      role === "assistant" ? "div" : "p",
      "aryan-chatbot-message-text",
    );

    if (role === "assistant") {
      appendAssistantMarkdown(content, message);
    } else {
      content.textContent = String(message);
    }

    row.append(content);
    log.append(row);
    log.scrollTop = log.scrollHeight;
    if (remember) {
      state.history.push({ role, text: String(message).slice(0, 1400) });
      state.history = state.history.slice(-40);
      saveHistory();
    }
  }
  function setSuggestions(questions) {
    suggestionsList.replaceChildren();
    [...new Set(questions)].slice(0, 8).forEach((question) => {
      const button = el("button", "aryan-chatbot-suggestion", question);
      button.type = "button";
      button.dataset.question = question;
      suggestionsList.append(button);
    });
  }
  function contextualSuggestions() {
    if (state.selected) {
      return [
        "What technologies does it use?",
        "What is this work about?",
        "Show related projects",
        "Show me his other projects",
      ];
    }
    return state.data?.faq.slice(0, 8).map((item) => item.question) || [];
  }
  function setBusy(value) {
    state.busy = value;
    input.disabled = value;
    sendButton.disabled = value;
    sendButton.textContent = value ? "…" : "↗";
    sendButton.setAttribute(
      "aria-label",
      value ? "Waiting for response" : "Send question",
    );
  }

  function setTab(tab, focus = false) {
    state.tab = tab === "explore" ? "explore" : "chat";
    panel.dataset.tab = state.tab;
    host.querySelectorAll(".aryan-chatbot-tab").forEach((button) => {
      button.setAttribute(
        "aria-selected",
        String(button.dataset.tab === state.tab),
      );
      button.tabIndex = button.dataset.tab === state.tab ? 0 : -1;
      if (state.tab === "explore" && button.dataset.tab === "explore") {
        button.classList.remove("aryan-chatbot-has-update");
      }
      if (focus && button.dataset.tab === state.tab) button.focus();
    });
  }
  function open() {
    if (host.classList.contains("aryan-chatbot-open")) return;
    state.lastFocus = document.activeElement;
    host.classList.add("aryan-chatbot-open");
    launcher.classList.add("aryan-chatbot-launcher-open");
    panel.inert = false;
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    document.body.classList.add("aryan-chatbot-scroll-lock");
    if (page) page.inert = true;
    requestAnimationFrame(() => {
      if (host.classList.contains("aryan-chatbot-open")) {
        (state.tab === "explore" &&
        window.matchMedia("(max-width: 680px)").matches
          ? $('.aryan-chatbot-tab[data-tab="explore"]')
          : input
        ).focus();
      }
    });
  }
  function close(reset = false, restoreFocus = true) {
    if (!host.classList.contains("aryan-chatbot-open")) return;
    host.classList.remove("aryan-chatbot-open");
    launcher.classList.remove("aryan-chatbot-launcher-open");
    panel.inert = true;
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
    document.body.classList.remove("aryan-chatbot-scroll-lock");
    if (page) page.inert = false;
    if (reset) {
      state.view = "overview";
      state.selected = null;
      state.filterIds = null;
      setTab("chat");
      renderCanvas();
    }
    if (restoreFocus) launcher.focus({ preventScroll: true });
  }

  function navigation() {
    const group = el("div", "aryan-chatbot-navigation");
    [
      ["projects", "Projects"],
      ["experience", "Experience"],
      ["skills", "Skills"],
      ["education", "Education"],
    ].forEach(([view, title]) => {
      const button = el("button", "aryan-chatbot-nav-button", title);
      button.type = "button";
      button.dataset.view = view;
      if (state.view === view) button.setAttribute("aria-current", "page");
      group.append(button);
    });
    return group;
  }
  function cardButton(item) {
    const button = el("button", "aryan-chatbot-card");
    button.type = "button";
    button.dataset.itemId = item.id;
    button.setAttribute("aria-label", `Explore ${item.title}`);
    button.append(
      el(
        "span",
        "aryan-chatbot-card-category",
        item.kind === "project" ? "Project" : "Experience",
      ),
    );
    button.append(el("span", "aryan-chatbot-card-title", item.title));
    button.append(el("span", "aryan-chatbot-card-description", item.field));
    button.append(el("span", "aryan-chatbot-card-link", "Explore work ↗"));
    return button;
  }
  function renderProjectCard(item) {
    return cardButton(item);
  }
  function renderExperienceCard(item) {
    return cardButton(item);
  }
  function renderCards(items) {
    if (!items.length)
      return el("p", "aryan-chatbot-empty", "Nothing is listed here yet.");
    const grid = el("div", "aryan-chatbot-cards");
    items.forEach((item) =>
      grid.append(
        item.kind === "project"
          ? renderProjectCard(item)
          : renderExperienceCard(item),
      ),
    );
    return grid;
  }
  function viewHeader(title, intro) {
    const fragment = document.createDocumentFragment();
    fragment.append(el("h2", "aryan-chatbot-view-heading", title));
    if (intro) fragment.append(el("p", "aryan-chatbot-view-intro", intro));
    fragment.append(navigation());
    return fragment;
  }
  function renderSkills() {
    canvas.append(
      viewHeader(
        "The things I work with.",
        "Methods and tools named on this portfolio.",
      ),
    );
    [
      ["Core skills", state.data.skills.core],
      ["Tools in the work", state.data.skills.toolsFromPortfolio],
    ].forEach(([title, values]) => {
      canvas.append(el("h3", "aryan-chatbot-detail-subheading", title));
      const chips = el("div", "aryan-chatbot-chips");
      values.forEach((value) =>
        chips.append(el("span", "aryan-chatbot-chip", value)),
      );
      canvas.append(chips);
    });
  }
  function renderEducation() {
    canvas.append(
      viewHeader("Learning in progress.", "Education listed for Aryan."),
    );
    state.data.education.items.forEach((item) => {
      const section = el("div", "aryan-chatbot-detail");
      section.append(el("h3", "aryan-chatbot-card-title", item.qualification));
      section.append(el("p", "", item.institution));
      if (item.note) section.append(el("p", "", item.note));
      canvas.append(section);
    });
  }
  function renderAbout() {
    canvas.append(
      viewHeader("A bit about Aryan.", state.data.about.introduction),
    );
    const section = el("div", "aryan-chatbot-detail");
    section.append(el("p", "", state.data.about.about));
    section.append(el("h3", "aryan-chatbot-detail-subheading", "Interests"));
    const interests = el("div", "aryan-chatbot-chips");
    state.data.about.interests.forEach((interest) =>
      interests.append(el("span", "aryan-chatbot-chip", interest)),
    );
    section.append(interests);
    section.append(
      el("h3", "aryan-chatbot-detail-subheading", "Away from the screen"),
    );
    section.append(el("p", "", state.data.about.hobbies.join(" · ")));
    canvas.append(section);
  }
  function renderDetailView(item) {
    const detail = el("div", "aryan-chatbot-detail");
    const back = el("button", "aryan-chatbot-back", "← Back to the work");
    back.type = "button";
    back.dataset.action = "back";
    const top = el("div", "aryan-chatbot-detail-top");
    top.append(
      back,
      el(
        "span",
        "aryan-chatbot-kicker",
        item.kind === "project" ? "Selected project" : "Selected experience",
      ),
    );
    detail.append(top);
    detail.append(el("h2", "aryan-chatbot-view-heading", item.title));
    detail.append(el("p", "", item.description));
    const chips = el("div", "aryan-chatbot-chips");
    item.technologies.forEach((tech) =>
      chips.append(el("span", "aryan-chatbot-chip", tech)),
    );
    detail.append(chips);
    if (item.details.length || item.highlights.length) {
      detail.append(
        el("h3", "aryan-chatbot-detail-subheading", "A closer look"),
      );
      item.details.forEach((text) => detail.append(el("p", "", text)));
      if (item.highlights.length) {
        const list = el("ul", "aryan-chatbot-detail-list");
        item.highlights.forEach((point) => list.append(el("li", "", point)));
        detail.append(list);
      }
    }
    const related = item.related
      .map((id) => state.items.get(id))
      .filter(Boolean);
    if (related.length) {
      detail.append(
        el("h3", "aryan-chatbot-detail-subheading", "Follow the connection"),
      );
      const group = el("div", "aryan-chatbot-related");
      related.forEach((other) => {
        const button = el("button", "", `${other.title} ↗`);
        button.type = "button";
        button.dataset.itemId = other.id;
        group.append(button);
      });
      detail.append(group);
    }
    const portfolio = el(
      "button",
      "aryan-chatbot-portfolio-link",
      "View on portfolio ↗",
    );
    portfolio.type = "button";
    portfolio.dataset.focusId = item.id;
    detail.append(portfolio);
    canvas.append(detail);
  }
  function renderCanvas() {
    if (!state.data) return;
    canvas.replaceChildren();
    const view = state.view;
    if (view === "detail" && state.selected) {
      const item = state.items.get(state.selected);
      if (item) renderDetailView(item);
    } else if (view === "skills") renderSkills();
    else if (view === "education") renderEducation();
    else if (view === "about") renderAbout();
    else if (
      view === "projects" ||
      view === "experience" ||
      view === "highlights"
    ) {
      const items =
        view === "projects"
          ? state.data.projects
          : view === "experience"
            ? state.data.experience
            : [...state.data.projects, ...state.data.experience];
      const shown = state.filterIds?.length
        ? items.filter((item) => state.filterIds.includes(item.id))
        : items;
      canvas.append(
        viewHeader(
          view === "projects"
            ? "Ideas made tangible."
            : view === "experience"
              ? "Experience, in practice."
              : "A closer connection.",
          view === "highlights"
            ? "Work connected through the question you asked."
            : "Select a card for the full story, or follow it to the original portfolio.",
        ),
      );
      canvas.append(renderCards(shown));
    } else {
      canvas.append(
        viewHeader(
          "Explore by asking.",
          "Questions reveal the projects, experience and skills behind this portfolio. Start with a question, or pick a card to explore.",
        ),
      );
      const featured = ["openbooklm", "careergenie", "rover", "teleperformance"]
        .map((id) => state.items.get(id))
        .filter(Boolean);
      canvas.append(renderCards(featured));
    }
    canvas.scrollTop = 0;
  }
  function showView(view, ids = null, switchMobile = true) {
    state.view = view;
    state.selected = null;
    state.filterIds = ids?.length ? ids : null;
    renderCanvas();
    setSuggestions(contextualSuggestions());
    if (switchMobile && window.matchMedia("(max-width: 680px)").matches)
      setTab("explore");
  }
  function showItem(id, switchMobile = true) {
    const item = state.items.get(id);
    if (!item) return false;
    if (state.view !== "detail") state.previousView = state.view;
    state.selected = id;
    state.view = "detail";
    state.filterIds = null;
    renderCanvas();
    setSuggestions(contextualSuggestions());
    if (switchMobile && window.matchMedia("(max-width: 680px)").matches)
      setTab("explore");
    return true;
  }
  function focusPortfolioCard(id) {
    const card = [...document.querySelectorAll(".work-entry[data-node]")].find(
      (element) => element.dataset.node === id,
    );
    if (!card) return false;

    const work = card.closest(".work-section");
    const trigger = card.querySelector(".work-entry-trigger");
    const modeButton = document.querySelector(
      '.work-mode-button[data-mode="' + card.dataset.kind + '"]',
    );
    if (!work || !trigger || !modeButton) return false;

    close(false, false);

    const wasOpen = work.classList.contains("is-open");
    if (!wasOpen) document.querySelector("#open-work")?.click();
    if (modeButton.getAttribute("aria-pressed") !== "true") modeButton.click();
    if (trigger.getAttribute("aria-expanded") !== "true") trigger.click();

    if (wasOpen) {
      document.querySelector(".work-open-controls")?.scrollIntoView({
        behavior: reduceMotion.matches ? "auto" : "smooth",
        block: "start",
      });
    }

    trigger.focus({ preventScroll: true });
    return true;
  }

  function handleAssistantAction(response) {
    const action = allowedActions.has(response.action)
      ? response.action
      : "message";
    const ids = Array.isArray(response.items)
      ? response.items
          .filter((id) => typeof id === "string" && state.items.has(id))
          .slice(0, 9)
      : [];
    switch (action) {
      case "show_projects":
        showView("projects", ids, false);
        break;
      case "show_experience":
        showView("experience", ids, false);
        break;
      case "show_skills":
        showView("skills", null, false);
        break;
      case "show_education":
        showView("education", null, false);
        break;
      case "open_project":
        if (state.items.get(ids[0])?.kind === "project")
          showItem(ids[0], false);
        break;
      case "open_experience":
        if (state.items.get(ids[0])?.kind === "experience")
          showItem(ids[0], false);
        break;
      case "highlight_item":
        if (ids.length) showView("highlights", ids, false);
        break;
      case "reset_canvas":
        showView("overview", null, false);
        break;
      default:
        if (response.items?.includes("about")) showView("about", null, false);
    }
    if (
      action !== "message" &&
      state.tab === "chat" &&
      window.matchMedia("(max-width: 680px)").matches
    ) {
      $('.aryan-chatbot-tab[data-tab="explore"]').classList.add(
        "aryan-chatbot-has-update",
      );
    }
    if (Array.isArray(response.suggestions)) {
      const safe = response.suggestions.filter(
        (q) => typeof q === "string" && q.length <= 110,
      );
      if (safe.length) setSuggestions(safe);
    }
  }

  function scoreItem(item, words, query) {
    const title = normalize(item.title);
    const aliases = item.searchTerms.map(normalize);
    const tech = item.technologies.map(normalize);
    const field = normalize(item.field);
    const description = normalize(item.description);
    let score = query.includes(title) && title.length > 3 ? 18 : 0;
    if (aliases.some((alias) => alias.length > 3 && query.includes(alias)))
      score += 11;
    for (const word of words) {
      if (title.split(" ").includes(word)) score += 7;
      if (aliases.some((alias) => alias.split(" ").includes(word))) score += 5;
      if (tech.some((name) => name.split(" ").includes(word))) score += 5;
      if (field.split(" ").includes(word)) score += 3;
      if (description.split(" ").includes(word)) score += 1;
    }
    return score;
  }
  function rankedItems(question) {
    const query = normalize(question);
    const words = tokens(question);
    return [...state.items.values()]
      .map((item) => ({ item, score: scoreItem(item, words, query) }))
      .sort((a, b) => b.score - a.score);
  }
  function findFaq(question) {
    const query = normalize(question);
    const exact = state.data.faq.find(
      (entry) => normalize(entry.question) === query,
    );
    if (exact) return exact;
    const qs = tokens(question);
    if (qs.length < 2) return null;
    return (
      state.data.faq.find((entry) => {
        const entryTokens = tokens(entry.question);
        const shared = qs.filter((word) => entryTokens.includes(word)).length;
        return (
          shared >= 2 &&
          shared / Math.max(qs.length, entryTokens.length) >= 0.85
        );
      }) || null
    );
  }
  function searchLocal(question) {
    const query = normalize(question);
    const selected = state.items.get(state.selected);
    const complex =
      /\b(connect\w*|compar\w*|evolv\w*|best|better|why|learn\w*|challeng\w*|next steps|recommend\w*)\b/i.test(
        question,
      );
    if (selected && !complex) {
      if (
        /\b(tech\w*|technolog\w*|stack|tools?|languages?|built with)\b/i.test(
          question,
        )
      ) {
        return {
          answer: `${selected.title} uses ${selected.technologies.join(", ")}.`,
          action: "message",
        };
      }
      if (/\b(related|connected)\b/i.test(question)) {
        const related = selected.related
          .map((id) => state.items.get(id))
          .filter(Boolean);
        if (related.length)
          return {
            answer: `This ${selected.kind} connects to ${related.map((item) => item.title).join(", ")}.`,
            action: "highlight_item",
            items: related.map((item) => item.id),
          };
      }
      if (
        /\b(about|summary|overview|does it do)\b/i.test(question) &&
        /\b(this|it|project|work|experience)\b/i.test(question)
      ) {
        return { answer: selected.description, action: "message" };
      }
    }
    if (complex) return null;
    if (/\b(education|university|degree|study|studied|school)\b/.test(query)) {
      return {
        answer:
          "Aryan is studying for a BSc in Data Science, AI & Digital Business at GISMA University of Applied Sciences.",
        action: "show_education",
      };
    }
    if (/\b(hobbies|hobby|interests|interested|swimming|books)\b/.test(query)) {
      return {
        answer:
          state.data.about.interests.join(", ") +
          ". Away from work: " +
          state.data.about.hobbies.join(", ") +
          ".",
        action: "message",
        items: ["about"],
      };
    }
    if (
      /\bprojects?\b/.test(query) &&
      /\b(ai|artificial intelligence|machine learning|llm)\b/.test(query)
    ) {
      return {
        answer:
          "OpenbookLM and A.D.S.A. are two projects focused on local AI and autonomous data science.",
        action: "show_projects",
        items: ["openbooklm", "adsa"],
      };
    }
    const results = rankedItems(question);
    const top = results[0];
    const exactNamed = results.find(({ item }) => {
      const names = [item.title, item.id, ...item.searchTerms]
        .map(normalize)
        .filter((name) => name.length > 4 && name !== "machine learning");
      return names.some(
        (name) =>
          query.includes(name) && (name.includes(" ") || name.length >= 6),
      );
    });
    if (/^(does|do|has|have|is)\b/.test(query) && top.score >= 6) {
      const evidence = results
        .filter(
          ({ item, score }) =>
            score >= 6 &&
            item.technologies.some((tech) => query.includes(normalize(tech))),
        )
        .slice(0, 4);
      if (evidence.length)
        return {
          answer: `Yes — ${evidence.map(({ item }) => item.title).join(" and ")} ${evidence.length === 1 ? "mentions" : "mention"} it in the portfolio.`,
          action: "highlight_item",
          items: evidence.map(({ item }) => item.id),
        };
    }
    if (exactNamed && top.score >= 7) {
      const item = exactNamed.item;
      return {
        answer: item.description,
        action: item.kind === "project" ? "open_project" : "open_experience",
        items: [item.id],
      };
    }
    if (
      /\b(experience|internship|internships|companies|worked)\b/.test(query)
    ) {
      return {
        answer:
          "Explore Aryan’s work at CareerGenie, Teleperformance, FERTRADO and Infovirgin Technology Solutions",
        action: "show_experience",
      };
    }
    if (/\b(skills|tech stack|technologies|toolkit)\b/.test(query)) {
      return {
        answer: "Here are the skills and tools mentioned on Aryan’s portfolio.",
        action: "show_skills",
      };
    }
    if (/\b(projects|portfolio)\b/.test(query) && top.score < 6) {
      return {
        answer: "Here are the selected projects from Aryan’s portfolio.",
        action: "show_projects",
      };
    }
    if (top.score < 6) return null;
    const matches = results
      .filter((entry) => entry.score >= 6 && entry.score >= top.score * 0.65)
      .slice(0, 4);
    if (/^(does|do|has|have|is)\b/.test(query)) {
      const technology = [
        ...state.data.skills.core,
        ...state.data.skills.toolsFromPortfolio,
      ].find((skill) => query.includes(normalize(skill)));
      const evidence = matches.filter(({ item }) =>
        item.technologies.some((tech) => query.includes(normalize(tech))),
      );
      if (evidence.length)
        return {
          answer: `Yes — ${evidence.map(({ item }) => item.title).join(" and ")} ${evidence.length === 1 ? "mentions" : "mention"} it in the portfolio.`,
          action: "highlight_item",
          items: evidence.map(({ item }) => item.id),
        };
      if (technology)
        return {
          answer: `Yes — ${technology} is listed among Aryan’s skills.`,
          action: "show_skills",
        };
    }
    if (matches.length === 1 || top.score > (results[1]?.score || 0) * 1.8) {
      const item = top.item;
      return {
        answer: item.description,
        action: item.kind === "project" ? "open_project" : "open_experience",
        items: [item.id],
      };
    }
    const items = matches.map(({ item }) => item);
    return {
      answer: `I found ${items.map((item) => item.title).join(", ")} in Aryan’s portfolio.`,
      action: items.every((item) => item.kind === "project")
        ? "show_projects"
        : items.every((item) => item.kind === "experience")
          ? "show_experience"
          : "highlight_item",
      items: items.map((item) => item.id),
    };
  }

  async function askExternalAssistant(question, context) {
    if (!endpoint) return null;
    const url = new URL(endpoint, location.href);
    if (
      url.protocol !== "https:" &&
      !(url.hostname === "localhost" || url.hostname === "127.0.0.1")
    ) {
      throw new Error("Use an HTTPS endpoint for the external assistant.");
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context }),
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`Assistant endpoint returned ${response.status}.`);
      const result = await response.json();
      if (
        !result ||
        typeof result.answer !== "string" ||
        !result.answer.trim()
      ) {
        throw new Error("Assistant response needs a nonempty answer.");
      }
      return result;
    } finally {
      clearTimeout(timer);
    }
  }
  function externalContext(question) {
    const shortlist = rankedItems(question)
      .filter(({ score }) => score > 0)
      .slice(0, 4)
      .map(({ item }) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        description: item.description,
        technologies: item.technologies,
        details: item.details,
        highlights: item.highlights,
        related: item.related,
      }));
    const selected = state.items.get(state.selected);
    if (selected && !shortlist.some((item) => item.id === selected.id))
      shortlist.unshift(selected);
    return {
      about: state.data.about,
      skills: state.data.skills,
      education: state.data.education,
      items: shortlist.slice(0, 4),
      recentMessages: state.history.slice(-6),
    };
  }
  function trollReply(question) {
    const q = normalize(question);
    const targeted = (text) => /\b(aryan|he|him|his)\b/.test(text);
    const insult = (text) =>
      /\b(stupid|dumb|dumbass|idiot|moron|loser|useless|incompetent|fucker|fuck|asshole|trash|pathetic|clown)\b/.test(
        text,
      );

    // ask() has already saved the current user message at this point.
    const userMessages = state.history.filter((entry) => entry.role === "user");
    const previous = normalize(userMessages.at(-2)?.text);

    if (/^(why|why not|how come)$/.test(q) && targeted(previous)) {
      if (/\b(gay|sexuality|orientation)\b/.test(previous)) {
        return "Because someone's sexuality isn't a measure of their work. Aryan's projects are right here—pick one and bring a real question.";
      }
      if (insult(previous)) {
        return "Because an insult isn't an argument. Aryan brought the projects; you can at least bring a critique.";
      }
    }

    if (!targeted(q)) return null;

    if (/\bnigg(?:a|er)\b/.test(q)) {
      return "Using a slur through Aryan's own chatbot is a bold strategy. His work is right here—try arguing with that instead.";
    }

    if (/\b(gay|sexuality|orientation)\b/.test(q)) {
      return "If that's supposed to be a roast, it missed. Aryan's work is right here—pick a project and ask something worth answering.";
    }

    if (/\bstupid\b/.test(q)) {
      return "Calling Aryan stupid through a chatbot he built is a bold strategy. Pick a project and try that argument again.";
    }

    if (insult(q)) {
      return "Calling Aryan names through a chatbot he built is a bold strategy. He brought the projects; you brought an insult. Pick a card and try again.";
    }

    return null;
  }
  async function ask(question, directFaq = null) {
    if (!state.data || state.busy) return;
    const text = String(question).trim().slice(0, 500);
    if (!text) return;
    addMessage("user", text);
    input.value = "";
    const comeback = trollReply(text);
    if (comeback) {
      addMessage("assistant", comeback);
      return;
    }
    const exactFaq =
      directFaq ||
      state.data.faq.find(
        (entry) => normalize(entry.question) === normalize(text),
      );
    let result = exactFaq;

    if (!result && endpoint) {
      setBusy(true);

      try {
        const remote = await askExternalAssistant(text, externalContext(text));

        // A classified jab takes priority over a local project match.
        // Genuine questions still use the existing local actions when available.
        result =
          remote.kind === "jab" || remote.kind === "identity"
            ? remote
            : findFaq(text) || searchLocal(text) || remote;
      } catch {
        result = findFaq(text) ||
          searchLocal(text) || {
            answer:
              "The online assistant could not respond right now. Try a specific project or skill.",
            action: "message",
          };
      } finally {
        setBusy(false);
      }
    }

    if (!result) {
      result = findFaq(text) ||
        searchLocal(text) || {
          answer:
            "I can show you what is in the portfolio, but the open-ended assistant is not connected yet.",
          action: "message",
        };
    }
    addMessage("assistant", String(result.answer).slice(0, 1400));
    handleAssistantAction(result);
  }
  async function loadKnowledge() {
    if (state.loading) return state.loading;
    const names = [
      "faq",
      "about",
      "projects",
      "experience",
      "skills",
      "education",
    ];
    state.loading = Promise.all(
      names.map(async (name) => {
        const response = await fetch(new URL(`data/${name}.json`, base));
        if (!response.ok) throw new Error(`Cannot load ${name}.json`);
        return [name, await response.json()];
      }),
    )
      .then((pairs) => {
        state.data = Object.fromEntries(pairs);
        state.items = new Map(
          [
            ...state.data.projects.map((item) => ({
              ...item,
              kind: "project",
            })),
            ...state.data.experience.map((item) => ({
              ...item,
              kind: "experience",
            })),
          ].map((item) => [item.id, item]),
        );
        renderCanvas();
        setSuggestions(contextualSuggestions());
        setBusy(false);
        if (state.history.length === 0) {
          addMessage(
            "assistant",
            "Hi, I’m a guide to Aryan’s portfolio. Ask about a project or skill, and I’ll pull the relevant work into the canvas beside our conversation.",
          );
        }
      })
      .catch(() => {
        state.loading = null;
        addMessage(
          "assistant",
          "The portfolio data could not load. Open this site through GitHub Pages or a local web server, then try again.",
        );
        const retry = el(
          "button",
          "aryan-chatbot-suggestion",
          "Retry loading portfolio",
        );
        retry.type = "button";
        retry.dataset.action = "retry";
        suggestionsList.replaceChildren(retry);
      });
    return state.loading;
  }

  panel.inert = true;
  setBusy(true);
  canvas.append(el("p", "aryan-chatbot-empty", "Opening the portfolio…"));
  suggestionsList.append(
    el("span", "aryan-chatbot-empty", "Loading suggested questions…"),
  );
  state.history = readHistory();
  state.history.forEach(({ role, text }) => addMessage(role, text, false));
  loadKnowledge();

  host.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target || !host.contains(target)) return;
    if (target.dataset.tab) return setTab(target.dataset.tab, true);
    if (target.dataset.question) {
      setTab("chat");
      void ask(
        target.dataset.question,
        state.data?.faq.find(
          (entry) => entry.question === target.dataset.question,
        ),
      );
      return;
    }
    if (target.dataset.view) return showView(target.dataset.view);
    if (target.dataset.itemId) return showItem(target.dataset.itemId);
    if (target.dataset.focusId)
      return focusPortfolioCard(target.dataset.focusId);
    switch (target.dataset.action) {
      case "open":
        open();
        break;
      case "minimize":
        close();
        break;
      case "close":
        close(true);
        break;
      case "back":
        showView(
          state.previousView === "detail" ? "overview" : state.previousView,
        );
        break;
      case "retry":
        void loadKnowledge();
        break;
      case "clear":
        if (state.busy) return;
        state.history = [];
        log.replaceChildren();
        saveHistory();
        showView("overview", null, false);
        setTab("chat");
        addMessage(
          "assistant",
          "A fresh page. What would you like to explore?",
        );
        input.focus();
        break;
    }
  });
  $(".aryan-chatbot-form").addEventListener("submit", (event) => {
    event.preventDefault();
    void ask(input.value);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      void ask(input.value);
    }
  });
  host.addEventListener("keydown", (event) => {
    if (
      event.target.getAttribute("role") !== "tab" ||
      !["ArrowLeft", "ArrowRight"].includes(event.key)
    )
      return;
    event.preventDefault();
    setTab(state.tab === "chat" ? "explore" : "chat", true);
  });
  document.addEventListener(
    "keydown",
    (event) => {
      if (!host.classList.contains("aryan-chatbot-open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = [
        ...panel.querySelectorAll(
          "button:not(:disabled), textarea:not(:disabled)",
        ),
      ].filter((item) => item.getClientRects().length && item.tabIndex >= 0);
      if (!focusables.length) return;
      if (event.shiftKey && document.activeElement === focusables[0]) {
        event.preventDefault();
        focusables.at(-1).focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === focusables.at(-1)
      ) {
        event.preventDefault();
        focusables[0].focus();
      }
    },
    true,
  );

  window.PortfolioAssistant = {
    open,
    close: () => close(),
    showProject: (id) => {
      if (state.items.get(id)?.kind !== "project") return false;
      open();
      return showItem(id);
    },
    showExperience: (id) => {
      if (state.items.get(id)?.kind !== "experience") return false;
      open();
      return showItem(id);
    },
    focusPortfolioCard,
  };
})();
