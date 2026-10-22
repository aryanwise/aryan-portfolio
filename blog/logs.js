(() => {
  "use strict";
  const PAGE_SIZE = 8;
  const COURSE_PAGE_SIZE = 6;
  const $ = (id) => document.getElementById(id);
  // Keep the browsing menu broad; detailed tags still work in search.
  const TOPICS = [
    { name: "Computer Vision", tags: /^(computer vision|opencv|yolo(?:v\d+)?|object detection|segmentation|image processing)$/ },
    { name: "Machine Learning", tags: /^(machine learning|ml|pandas|data exploration|data science|decision trees?|model validation|underfitting|overfitting|random forests?|linear regression|scikit.learn)$/ },
    { name: "Deep Learning", tags: /^(deep learning|neural networks?|pytorch|tensorflow|cnns?|convolutional neural networks?|transformers?|llms?|nlp)$/ },
    { name: "Applied Math", tags: /^(applied math|math|mathematics|calculus|linear algebra|probability|statistics|optimization)$/ },
    { name: "Autonomous & Robotics", tags: /^(autonomous (?:&|and) robotics|autonomy|autonomous systems|robotics|robots?|ros2?|slam|control|control systems|path planning|navigation)$/ },
    { name: "Larp", tags: /^(larp|general yap|personal|reflection|reflections|life|thoughts)$/ },
  ];
  let catalog;
  let filters = readFilters();
  let postLimit = PAGE_SIZE;
  let courseLimit = COURSE_PAGE_SIZE;
  let searchTimer;
  let carouselFrame;
  let courseResultsKey = "";

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function topicName(value) {
    if (!value) return "";
    const tag = value.trim().toLowerCase();
    return TOPICS.find((topic) => topic.name.toLowerCase() === tag || topic.tags.test(tag))?.name || "";
  }
  function postTopics(post) {
    const topics = [...new Set((post.tags || []).map(topicName).filter(Boolean))];
    return topics.length ? topics : ["Larp"];
  }
  function readFilters() {
    const params = new URLSearchParams(location.search);
    const view = ["daily", "larp"].includes(params.get("view")) ? "notes" : params.get("view");
    return {
      view: ["all", "courses", "notes"].includes(view) ? view : "all",
      course: params.get("course") || "", q: params.get("q") || "",
      topic: topicName(params.get("topic")),
      sort: ["latest", "oldest", "az"].includes(params.get("sort")) ? params.get("sort") : "latest",
    };
  }
  function browseURL(view = "all", course = "") {
    const params = new URLSearchParams();
    if (course) params.set("course", course);
    else if (view !== "all") params.set("view", view === "notes" ? "larp" : view);
    return "index.html" + (params.size ? "?" + params : "");
  }
  function postURL(post) { return "post.html?file=" + encodeURIComponent(post.file); }
  function writeFilters(replace = false) {
    const url = new URL(location.href);
    url.search = "";
    url.hash = "";
    if (filters.course) url.searchParams.set("course", filters.course);
    else if (filters.view !== "all") url.searchParams.set("view", filters.view === "notes" ? "larp" : filters.view);
    if (filters.q.trim()) url.searchParams.set("q", filters.q.trim());
    if (filters.topic) url.searchParams.set("topic", filters.topic);
    if (filters.sort !== "latest") url.searchParams.set("sort", filters.sort);
    if (url.href !== location.href) history[replace ? "replaceState" : "pushState"]({}, "", url);
  }
  function resetLimits() { postLimit = PAGE_SIZE; courseLimit = COURSE_PAGE_SIZE; }
  function choose(view, course = "") {
    clearTimeout(searchTimer);
    filters = { view, course, q: "", topic: "", sort: "latest" };
    resetLimits(); writeFilters(); render();
    $("journal-main").focus({ preventScroll: true });
    // Switching a tab keeps the controls in place; opening a course brings its title into view.
    if (course) $("course-focus").scrollIntoView({ block: "start" });
  }
  function count(value, singular, plural = singular + "s") { return value + " " + (value === 1 ? singular : plural); }
  function niceDate(value) {
    const date = new Date(value + "T12:00:00Z");
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
  }
  function lessonTitle(post) { return post.title.replace(/^lesson\s+\d+\s*[:.\-–—]\s*/i, ""); }
  function courseLessons(course) {
    return catalog.posts.filter((post) => post.kind === "course" && post.course === course.id)
      .sort((a, b) => Number(a.lesson) - Number(b.lesson) || a.title.localeCompare(b.title));
  }
  function searchText(post) { return [post.title, post.summary, ...(post.tags || []), ...postTopics(post)].join(" ").toLowerCase(); }
  function matches(text, topics) {
    return filters.q.toLowerCase().trim().split(/\s+/).filter(Boolean).every((term) => text.includes(term)) && (!filters.topic || topics.includes(filters.topic));
  }
  function sortPosts(posts) {
    return posts.sort((a, b) => filters.sort === "az" ? a.title.localeCompare(b.title)
      : (filters.sort === "oldest" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || a.title.localeCompare(b.title));
  }
  function courseFacts(course) {
    const lessons = courseLessons(course);
    return { lessons, minutes: lessons.reduce((sum, post) => sum + (Number(post.readMinutes) || 1), 0), date: lessons.reduce((latest, post) => post.date > latest ? post.date : latest, "") };
  }
  function updateCarousel() {
    const rail = $("course-grid");
    const overflow = rail.classList.contains("is-carousel") && !$("course-section").hidden && rail.scrollWidth > rail.clientWidth + 2;
    $("course-carousel-controls").hidden = !overflow;
    rail.tabIndex = overflow ? 0 : -1;
    $("previous-course").disabled = !overflow || rail.scrollLeft <= 2;
    $("next-course").disabled = !overflow || rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2;
  }
  function scheduleCarousel() {
    if (carouselFrame) return;
    carouselFrame = requestAnimationFrame(() => { carouselFrame = 0; updateCarousel(); });
  }
  function moveCarousel(direction) {
    const rail = $("course-grid");
    const card = rail.querySelector(".journal-course");
    const distance = card ? card.getBoundingClientRect().width + (parseFloat(getComputedStyle(rail).columnGap) || 0) : rail.clientWidth;
    rail.scrollBy({ left: distance * direction, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  function courseCard(course) {
    const facts = courseFacts(course);
    const card = el("a", "journal-course");
    card.href = browseURL("courses", course.id); card.dataset.course = course.id;
    const body = el("div", "journal-course-body");
    const meta = el("div", "journal-entry-meta", count(facts.lessons.length, "lesson") + " · " + facts.minutes + " min");
    const heading = el("div", "journal-course-heading");
    const arrow = el("span", "", "↗"); arrow.setAttribute("aria-hidden", "true");
    heading.append(el("h3", "", course.title), arrow);
    body.append(meta, heading);
    card.append(body, el("p", "", course.description));
    return card;
  }
  function postCard(post, inCourse) {
    const card = el("a", "journal-card" + (inCourse ? " is-lesson" : ""));
    card.href = postURL(post);
    if (inCourse) {
      const number = el("span", "journal-lesson-index", String(post.lesson).padStart(2, "0"));
      number.setAttribute("aria-hidden", "true"); card.append(number);
    }
    const body = el("div", "journal-card-body");
    const meta = el("div", "journal-entry-meta");
    if (inCourse) meta.append(el("span", "", "Lesson " + post.lesson));
    else meta.append(el("span", "", niceDate(post.date)));
    meta.append(el("span", "", post.readMinutes + " min read"));
    body.append(meta, el("h3", "", inCourse ? lessonTitle(post) : post.title), el("p", "", post.summary));
    card.append(body); return card;
  }
  function emptyState(title, message, reset = true) {
    const box = el("div", "journal-empty");
    box.append(el("h3", "", title), el("p", "", message));
    if (reset) {
      const button = el("button", "", "Clear filters"); button.type = "button"; button.dataset.reset = "true"; box.append(button);
    } else {
      const link = el("a", "", "Browse courses"); link.href = browseURL("courses"); link.dataset.choose = "courses"; box.append(link);
    }
    return box;
  }
  function render() {
    if (!catalog) return;
    const course = catalog.courses.find((item) => item.id === filters.course);
    const searching = !!(filters.q.trim() || filters.topic);
    const activeView = filters.course ? "courses" : filters.view;
    document.querySelectorAll(".journal-tabs button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.view === activeView)));
    $("journal-search").value = filters.q;
    $("journal-search").placeholder = filters.course ? "Search lessons…" : "Search logs…";
    $("journal-search").setAttribute("aria-label", filters.course ? "Search lessons in this course" : "Search logs and courses");
    $("journal-topic").value = filters.topic;
    $("clear-search").hidden = !filters.q;
    $("reset-filters").hidden = !searching;
    $("course-focus").hidden = !course;
    $("load-more").hidden = true; $("more-courses").hidden = true;
    $("course-carousel-controls").hidden = true;
    $("posts-feed").classList.toggle("is-course", !!course);
    document.title = course ? course.title : "Logs";
    if (filters.course && !course) {
      $("course-section").hidden = true; $("feed-section").hidden = false;
      $("feed-heading").textContent = "Courses"; $("feed-count").textContent = ""; $("search-status").textContent = "";
      $("posts-feed").replaceChildren(emptyState("This course isn't here yet.", "It may have moved or hasn't been published.", false));
      return;
    }
    let posts = catalog.posts.filter((post) => matches(searchText(post), postTopics(post)));
    if (course) posts = posts.filter((post) => post.kind === "course" && post.course === course.id).sort((a, b) => a.lesson - b.lesson);
    else posts = sortPosts(posts.filter((post) => post.kind !== "course"));
    const courses = catalog.courses.filter((item) => {
      const lessons = courseLessons(item);
      return matches([item.title, item.description, ...lessons.map(searchText)].join(" ").toLowerCase(), lessons.flatMap(postTopics));
    });
    courses.sort((a, b) => filters.sort === "az" ? a.title.localeCompare(b.title)
      : (filters.sort === "oldest" ? courseFacts(a).date.localeCompare(courseFacts(b).date) : courseFacts(b).date.localeCompare(courseFacts(a).date)) || a.title.localeCompare(b.title));
    $("course-section").hidden = !!filters.course || filters.view === "notes" || (filters.view === "all" && !courses.length);
    $("feed-section").hidden = !filters.course && (filters.view === "courses" || (!posts.length && courses.length > 0 && filters.view === "all"));
    if (course) {
      const facts = courseFacts(course);
      $("course-focus-title").textContent = course.title; $("course-focus-description").textContent = course.description;
      $("course-focus-meta").textContent = count(facts.lessons.length, "lesson") + " · " + facts.minutes + " min total";
    }
    $("courses-heading").textContent = "Courses";
    $("course-count").textContent = courses.length;
    const isCarousel = filters.view === "all" && !filters.course;
    const shownCourses = isCarousel ? courses : courses.slice(0, courseLimit);
    const nextCourseKey = JSON.stringify([filters.view, filters.course, filters.q.trim(), filters.topic, filters.sort, ...shownCourses.map((item) => item.id)]);
    const previousScroll = nextCourseKey === courseResultsKey ? $("course-grid").scrollLeft : 0;
    courseResultsKey = nextCourseKey;
    $("course-grid").classList.toggle("is-single", shownCourses.length === 1);
    $("course-grid").classList.toggle("is-carousel", isCarousel);
    if (isCarousel) {
      $("course-grid").setAttribute("role", "region");
      $("course-grid").setAttribute("aria-label", "Courses");
      $("course-grid").setAttribute("aria-roledescription", "carousel");
    } else {
      $("course-grid").removeAttribute("role");
      $("course-grid").removeAttribute("aria-label");
      $("course-grid").removeAttribute("aria-roledescription");
    }
    $("course-grid").replaceChildren(...shownCourses.map(courseCard));
    $("course-grid").scrollLeft = previousScroll;
    if (!courses.length) $("course-grid").append(emptyState("No courses here yet.", searching ? "Try another topic or a broader search." : "I'll add them as I go.", searching));
    $("more-courses").hidden = isCarousel || courses.length <= courseLimit || $("course-section").hidden;
    $("feed-heading").textContent = course ? "Lessons" : "Larp";
    $("feed-count").textContent = posts.length;
    $("posts-feed").replaceChildren(...posts.slice(0, postLimit).map((post) => postCard(post, !!course)));
    if (!posts.length) $("posts-feed").append(emptyState(searching ? "Nothing here matches yet." : "A fresh page.", searching ? "Try a broader search or another topic." : "More things as I figure them out.", searching));
    $("load-more").hidden = posts.length <= postLimit || $("feed-section").hidden;
    $("load-more").textContent = course ? "More lessons ↓" : "More Larp ↓";
    $("search-status").textContent = searching ? [!$("course-section").hidden ? count(courses.length, "course") : "", !$("feed-section").hidden ? count(posts.length, course ? "lesson" : "entry", course ? "lessons" : "entries") : ""].filter(Boolean).join(" · ") : "";
    scheduleCarousel();
  }
  function clearFilters() {
    clearTimeout(searchTimer); filters.q = ""; filters.topic = "";
    resetLimits(); writeFilters(); render(); $("journal-search").focus();
  }
  document.addEventListener("click", (event) => {
    const anchor = event.target.closest("a[data-course], a[data-choose]");
    if (anchor && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault(); if (catalog) choose(anchor.dataset.choose || "courses", anchor.dataset.course || "");
    }
    if (event.target.closest("[data-reset]")) clearFilters();
  });
  document.querySelectorAll(".journal-tabs button").forEach((button) => button.addEventListener("click", () => { if (catalog) choose(button.dataset.view); }));
  $("journal-search").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { filters.q = $("journal-search").value; resetLimits(); writeFilters(true); render(); }, 140);
  });
  $("journal-search").addEventListener("keydown", (event) => { if (event.key === "Escape") clearFilters(); });
  $("clear-search").addEventListener("click", () => {
    clearTimeout(searchTimer); filters.q = ""; resetLimits(); writeFilters(); render(); $("journal-search").focus();
  });
  $("reset-filters").addEventListener("click", clearFilters);
  $("journal-topic").addEventListener("change", () => {
    clearTimeout(searchTimer); filters.q = $("journal-search").value; filters.topic = $("journal-topic").value;
    resetLimits(); writeFilters(); render();
  });
  for (const [id, type] of [["load-more", "posts"], ["more-courses", "courses"]]) {
    $(id).addEventListener("click", () => {
      const previous = type === "posts" ? postLimit : courseLimit;
      if (type === "posts") postLimit += PAGE_SIZE; else courseLimit += COURSE_PAGE_SIZE;
      render();
      const card = $(type === "posts" ? "posts-feed" : "course-grid").querySelectorAll("a")[previous];
      if (card) { card.focus({ preventScroll: true }); card.scrollIntoView({ block: "nearest" }); }
    });
  }
  window.addEventListener("popstate", () => { clearTimeout(searchTimer); filters = readFilters(); resetLimits(); render(); });
  $("previous-course").addEventListener("click", () => moveCarousel(-1));
  $("next-course").addEventListener("click", () => moveCarousel(1));
  $("course-grid").addEventListener("scroll", scheduleCarousel, { passive: true });
  $("course-grid").addEventListener("keydown", (event) => {
    const rail = $("course-grid");
    if (event.target !== rail || !rail.classList.contains("is-carousel")) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault(); moveCarousel(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
  if ("ResizeObserver" in window) new ResizeObserver(scheduleCarousel).observe($("course-grid"));
  else window.addEventListener("resize", scheduleCarousel, { passive: true });
  TOPICS.forEach((topic) => { const option = el("option", "", topic.name); option.value = topic.name; $("journal-topic").append(option); });
  async function load() {
    try {
      const response = await fetch("../posts/posts.json", { cache: "no-cache" });
      if (!response.ok) throw new Error("Catalog unavailable");
      const data = await response.json();
      if (!Array.isArray(data.posts) || !Array.isArray(data.courses)) throw new Error("Invalid catalog");
      catalog = data; render();
    } catch {
      $("course-section").hidden = true; $("feed-section").hidden = false;
      $("feed-heading").textContent = "Logs";
      const box = el("div", "journal-empty");
      box.append(el("h3", "", "The diary couldn't open."), el("p", "", "Check your connection and give it another try."));
      const retry = el("button", "", "Try again"); retry.type = "button"; retry.addEventListener("click", load); box.append(retry);
      $("posts-feed").replaceChildren(box);
    }
  }
  load();
})();
