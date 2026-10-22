(() => {
  "use strict";

  const content = document.getElementById("content");
  const file = new URLSearchParams(location.search).get("file");
  const metadataPattern = /^\uFEFF?<!--\s*portfolio-post\s*\r?\n[\s\S]*?\r?\n-->\s*/;
  const compact = window.matchMedia("(max-width: 800px)");
  const floatingOutline = window.matchMedia("(min-width: 1200px) and (hover: hover) and (pointer: fine)");

  function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }

  function postURL(post) {
    return "post.html?file=" + encodeURIComponent(post.file);
  }

  function courseURL(course) {
    return "index.html?course=" + encodeURIComponent(course.id);
  }

  function showError(message) {
    const box = el("div", "reader-error");
    const link = el("a", "", "← Browse all Logs");
    link.href = "./index.html";
    box.append(el("h1", "", "This log couldn't open."), el("p", "", message), link);
    content.replaceChildren(box);
    content.setAttribute("aria-busy", "false");
    document.getElementById("reader-layout").classList.add("reader-without-sidebar");
    document.title = "Log unavailable — Aryan Mishra";
  }

  function niceDate(iso) {
    const date = new Date(iso + "T12:00:00Z");
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
    }).format(date);
  }

  function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  function renderMarkdown(markdown) {
    const renderer = new marked.Renderer();
    // Markdown and math are supported; authored HTML remains visible text.
    renderer.html = (token) => escapeHTML(typeof token === "string" ? token : token.text);
    const template = document.createElement("template");
    template.innerHTML = marked.parse(markdown, { renderer });
    template.content.querySelectorAll("a, img").forEach((node) => {
      const attribute = node.tagName === "A" ? "href" : "src";
      const value = node.getAttribute(attribute);
      if (!value) return;
      try {
        const url = new URL(value, location.href);
        const protocols = attribute === "href" ? ["http:", "https:", "mailto:", "tel:"] : ["http:", "https:"];
        if (!protocols.includes(url.protocol)) node.removeAttribute(attribute);
        if (node.tagName === "A" && url.origin !== location.origin && ["http:", "https:"].includes(url.protocol)) {
          node.rel = "noopener noreferrer";
        }
      } catch {
        node.removeAttribute(attribute);
      }
      if (node.tagName === "IMG") node.loading = "lazy";
    });
    content.replaceChildren(template.content);
  }

  async function copyCode(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const field = el("textarea", "");
    field.value = text;
    field.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("Copy unavailable");
  }

  function addCodeButtons() {
    content.querySelectorAll("pre").forEach((pre) => {
      const wrapper = el("div", "entry-code");
      const code = pre.querySelector("code");
      const language = Array.from(code?.classList || []).find((name) => name.startsWith("language-"));
      const label = el("span", "entry-code-language", language ? language.slice(9) : "Code");
      const button = el("button", "", "Copy code");
      button.type = "button";
      button.setAttribute("aria-label", "Copy code block");
      button.setAttribute("aria-live", "polite");
      button.addEventListener("click", async () => {
        try {
          await copyCode(code?.textContent || pre.textContent);
          button.textContent = "Copied ✓";
        } catch {
          button.textContent = "Select to copy";
          const range = document.createRange();
          range.selectNodeContents(code || pre);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
        setTimeout(() => { button.textContent = "Copy code"; }, 1800);
      });
      pre.tabIndex = 0;
      pre.setAttribute("aria-label", (language ? language.slice(9) + " " : "") + "code block");
      pre.replaceWith(wrapper);
      wrapper.append(label, pre, button);
    });
  }

  function configureDisclosure(details) {
    details.open = !compact.matches;
  }

  function headingText(heading) {
    const label = heading.cloneNode(true);
    label.querySelectorAll(".katex").forEach((math) => {
      math.replaceWith(math.querySelector("annotation")?.textContent || math.textContent);
    });
    return label.textContent;
  }

  function renderOutline() {
    const headings = Array.from(content.querySelectorAll("h2, h3"));
    if (!headings.length) return;
    const used = new Set();
    const outline = document.getElementById("reader-outline");
    const trigger = document.getElementById("reader-outline-trigger");
    const panel = document.getElementById("reader-outline-panel");
    const bars = document.getElementById("reader-outline-bars");
    const list = document.getElementById("reader-outline-list");
    const links = [];
    const indicators = [];
    let pinned = false;
    let ignoreFocus = false;
    let trackingFrame = 0;

    function setOpen(open) {
      outline.dataset.open = String(open);
      trigger.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
    }

    function setActive(current) {
      links.forEach((link, index) => {
        if (index === current) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
        indicators[index].classList.toggle("is-active", index === current);
      });
    }

    headings.forEach((heading, index) => {
      const text = headingText(heading);
      const base = text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "section-" + (index + 1);
      let id = base;
      let duplicate = 2;
      while (used.has(id) || document.getElementById(id)) id = base + "-" + duplicate++;
      used.add(id);
      heading.id = id;
      const item = el("li", heading.tagName === "H3" ? "reader-outline-sub" : "");
      const link = el("a", "", text);
      link.href = "#" + encodeURIComponent(id);
      link.addEventListener("click", (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        pinned = false;
        setOpen(false);
        setActive(index);
        if (location.hash !== link.hash) history.pushState(null, "", link.href);
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
      });
      item.append(link);
      list.append(item);
      links.push(link);
      const bar = el("span", "reader-outline-bar" + (heading.tagName === "H3" ? " is-sub" : ""));
      bars.append(bar);
      indicators.push(bar);
    });

    trigger.addEventListener("click", () => {
      pinned = !pinned;
      setOpen(pinned);
    });
    outline.addEventListener("pointerenter", () => {
      if (floatingOutline.matches) setOpen(true);
    });
    outline.addEventListener("pointerleave", () => {
      if (floatingOutline.matches && !pinned && !outline.contains(document.activeElement)) setOpen(false);
    });
    outline.addEventListener("focusin", () => {
      if (!ignoreFocus && floatingOutline.matches) setOpen(true);
    });
    outline.addEventListener("focusout", (event) => {
      if (!pinned && floatingOutline.matches && !outline.contains(event.relatedTarget)) setOpen(false);
    });
    document.addEventListener("pointerdown", (event) => {
      if (floatingOutline.matches && !outline.contains(event.target)) {
        pinned = false;
        setOpen(false);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || panel.hidden) return;
      event.preventDefault();
      pinned = false;
      setOpen(false);
      if (outline.contains(document.activeElement)) {
        ignoreFocus = true;
        trigger.focus({ preventScroll: true });
        ignoreFocus = false;
      }
    });
    floatingOutline.addEventListener("change", () => {
      pinned = false;
      setOpen(false);
    });

    function trackHeading() {
      trackingFrame = 0;
      const threshold = Math.min(150, window.innerHeight * .2);
      let current = 0;
      headings.forEach((heading, index) => {
        if (heading.getBoundingClientRect().top <= threshold) current = index;
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 5) current = headings.length - 1;
      setActive(current);
    }

    function scheduleTracking() {
      if (!trackingFrame) trackingFrame = requestAnimationFrame(trackHeading);
    }

    window.addEventListener("scroll", scheduleTracking, { passive: true });
    window.addEventListener("resize", scheduleTracking, { passive: true });
    outline.hidden = false;
    setOpen(false);
    trackHeading();
  }

  function lessonTitle(post) {
    return post.title.replace(/^lesson\s+\d+\s*[:.\-–—]\s*/i, "");
  }

  function renderSeries(post, catalog, course) {
    if (post.kind !== "course" || !course) return false;
    const lessons = catalog.posts.filter((item) => item.kind === "course" && item.course === post.course)
      .sort((a, b) => Number(a.lesson) - Number(b.lesson) || a.title.localeCompare(b.title));
    const position = lessons.findIndex((item) => item.file === post.file);
    const courseHref = courseURL(course);
    const details = document.getElementById("reader-lessons");
    details.hidden = false;
    configureDisclosure(details);
    document.getElementById("reader-lesson-count").textContent = (position + 1) + " / " + lessons.length;
    const title = document.getElementById("reader-course-title");
    title.textContent = course.title;
    title.href = courseHref;
    const lessonList = document.getElementById("reader-lesson-list");
    lessons.forEach((lesson, index) => {
      const item = el("li", "");
      const link = el("a", "");
      link.href = postURL(lesson);
      link.append(el("span", "reader-lesson-number", String(lesson.lesson ?? index + 1).padStart(2, "0")), el("span", "", lessonTitle(lesson)));
      if (index === position) link.setAttribute("aria-current", "page");
      item.append(link);
      lessonList.append(item);
    });

    document.getElementById("entry-series").hidden = lessons.length <= 1;
    const links = document.getElementById("entry-series-links");
    for (const [item, label, className] of [
      [lessons[position - 1], "← Previous lesson", "reader-previous"],
      [lessons[position + 1], "Next lesson →", "reader-next"],
    ]) {
      if (!item) continue;
      const link = el("a", className);
      link.href = postURL(item);
      link.append(el("span", "", label), document.createTextNode(lessonTitle(item)));
      links.append(link);
    }
    document.getElementById("entry-back").href = courseHref;
    document.getElementById("entry-back").textContent = "← Back to course";
    return true;
  }

  async function load() {
    if (!file) return showError("Choose a note or course lesson from Logs to start reading.");
    try {
      const catalogResponse = await fetch("../posts/posts.json", { cache: "no-cache" });
      if (!catalogResponse.ok) throw new Error("The reading library couldn't load. Refresh the page to try again.");
      const catalog = await catalogResponse.json();
      if (!Array.isArray(catalog.posts)) throw new Error("The reading library is temporarily unavailable.");
      if (!Array.isArray(catalog.courses)) catalog.courses = [];
      const post = catalog.posts.find((item) => item.file === file);
      if (!post || typeof post.file !== "string" || !post.file.endsWith(".md") ||
          post.file.split("/").some((segment) => !/^[a-z0-9][a-z0-9._-]*$/i.test(segment))) {
        return showError("This link doesn't match a published log. You can find all available writing in Logs.");
      }
      const response = await fetch("../posts/" + post.file.split("/").map(encodeURIComponent).join("/"));
      if (!response.ok) throw new Error("The article couldn't load. Please refresh or choose another log.");
      const markdown = (await response.text()).replace(metadataPattern, "");
      if (!window.marked) throw new Error("The article renderer couldn't load. Check your connection and refresh the page.");
      if (window.markedKatex && window.katex) {
        marked.use(markedKatex({ throwOnError: false, nonStandard: true }));
      }
      renderMarkdown(markdown);
      if (!content.querySelector("h1")) content.prepend(el("h1", "", post.title));
      addCodeButtons();
      const course = catalog.courses.find((item) => item.id === post.course);
      document.getElementById("entry-kind").textContent = post.kind === "course"
        ? "Lesson " + post.lesson
        : ({ daily: "Daily log", essay: "Essay", "project-log": "Project log" })[post.kind] || "Log";
      document.getElementById("entry-meta").textContent = [niceDate(post.date), post.readMinutes ? post.readMinutes + " min read" : null].filter(Boolean).join(" · ");
      document.getElementById("entry-context").hidden = false;
      document.title = post.title + " — Aryan's Logs";
      document.querySelector('meta[name="description"]').content = post.summary || post.title;
      const hasCourse = renderSeries(post, catalog, course);
      renderOutline();
      document.getElementById("reader-sidebar").hidden = !hasCourse;
      if (!hasCourse) document.getElementById("reader-layout").classList.add("reader-without-sidebar");
      content.setAttribute("aria-label", post.title);
      content.setAttribute("aria-busy", "false");
      if (location.hash) {
        try {
          const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
          if (target && content.contains(target)) target.scrollIntoView();
        } catch {}
      }
    } catch (error) {
      showError(error.message || "This log couldn't load. Please try again.");
    }
  }

  compact.addEventListener("change", () => {
    document.querySelectorAll(".reader-disclosure").forEach(configureDisclosure);
  });

  load();
})();
