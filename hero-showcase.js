/* A quiet cursor-responsive field. Sleeps offscreen and when motion is reduced. */
(() => {
  'use strict';
  const canvas = document.querySelector('#hero-flow-canvas');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = canvas.closest('.intro');
  let width = 0, height = 0, frame = 0, visible = false, last = 0;
  let pointer = null;
  const resize = () => {
    const bounds = hero.getBoundingClientRect();
    width = bounds.width; height = bounds.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw(0);
  };
  function draw(time) {
    context.clearRect(0, 0, width, height);
    if (motion.matches) return;
    context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-text');
    context.globalAlpha = .14;
    context.lineWidth = .7;
    const bounds = pointer ? hero.getBoundingClientRect() : null;
    const pointerX = pointer ? pointer.x - bounds.left : -1000;
    const pointerY = pointer ? pointer.y - bounds.top : -1000;
    for (let y = 25; y < height; y += 40) {
      for (let x = width * .3; x < width; x += 40) {
        const dx = pointerX - x, dy = pointerY - y;
        const distance = Math.hypot(dx, dy);
        const angle = distance < 200 && distance > .1 ? Math.atan2(dy, dx) : Math.sin(x / 150 + time / 5000) * .4;
        const length = distance < 200 ? 4 + (1 - distance / 200) * 7 : 3;
        context.beginPath(); context.moveTo(x, y); context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length); context.stroke();
      }
    }
  }
  function tick(time) {
    if (!visible || document.hidden || motion.matches) { frame = 0; return; }
    if (time - last >= 32) { draw(time); last = time; }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (visible && !document.hidden && !motion.matches) { if (!frame) frame = requestAnimationFrame(tick); }
    else { cancelAnimationFrame(frame); frame = 0; draw(0); }
  }
  hero.addEventListener('pointermove', event => { pointer = {x:event.clientX,y:event.clientY}; }, {passive:true});
  hero.addEventListener('pointerleave', () => {pointer = null;});
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(entries => {visible = entries[0].isIntersecting; sync();}).observe(hero);
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  new MutationObserver(() => draw(performance.now())).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
})();
