/* Use drawn arrows so mobile platforms cannot substitute emoji glyphs. */
(() => {
  "use strict";

  const controls = "a, button, [role='button'], .round-arrow";
  const excluded = "svg, math, pre, code, kbd, samp, script, style, textarea, [contenteditable]:not([contenteditable='false'])";
  const arrowPattern = /[↗↖↘↙→←↑↓↵][\uFE0E\uFE0F]?/g;
  const paths = {
    "↗": "M7 17 17 7M7 7h10v10",
    "↖": "M17 17 7 7M7 17V7h10",
    "↘": "M7 7 17 17M7 17h10V7",
    "↙": "M17 7 7 17M7 7v10h10",
    "→": "M4 12h16m-6-6 6 6-6 6",
    "←": "M20 12H4m6-6-6 6 6 6",
    "↑": "M12 20V4m-6 6 6-6 6 6",
    "↓": "M12 4v16m-6-6 6 6 6-6",
    "↵": "M20 5v8H4m6-6-6 6 6 6",
  };

  function drawArrow(character) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ui-icon-arrow");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute("d", paths[character]);
    svg.append(path);
    return svg;
  }

  function hydrate(control) {
    if (control.closest(excluded)) return;
    const walker = document.createTreeWalker(control, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.parentElement.closest(excluded)) return NodeFilter.FILTER_REJECT;
        arrowPattern.lastIndex = 0;
        return arrowPattern.test(node.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      let position = 0;
      arrowPattern.lastIndex = 0;
      for (const match of node.data.matchAll(arrowPattern)) {
        fragment.append(document.createTextNode(node.data.slice(position, match.index)));
        fragment.append(drawArrow(match[0][0]));
        position = match.index + match[0].length;
      }
      fragment.append(document.createTextNode(node.data.slice(position)));
      node.replaceWith(fragment);
    }
  }

  function start() {
    document.querySelectorAll(controls).forEach(hydrate);
    const observer = new MutationObserver((records) => {
      const changed = new Set();
      function collect(node) {
        const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        if (!element?.isConnected || element.closest(excluded)) return;
        const control = element.closest(controls);
        if (control) changed.add(control);
        if (node.nodeType === Node.ELEMENT_NODE) {
          element.querySelectorAll(controls).forEach((nested) => changed.add(nested));
        }
      }
      for (const record of records) {
        if (record.type === "characterData") collect(record.target);
        else record.addedNodes.forEach(collect);
      }
      changed.forEach(hydrate);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
