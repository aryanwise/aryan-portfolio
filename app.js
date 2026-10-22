(() => {
  'use strict';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const verticalNetwork = matchMedia('(max-width: 767px)');
  const about = document.querySelector('#about');
  const aboutToggle = document.querySelector('.about-toggle');
  const aboutSlot = document.createComment('Expanded bio position on desktop');
  about?.before(aboutSlot);
  function placeAbout() {
    const terminal = document.querySelector('#hero-terminal');
    if (!about || !terminal) return;
    const focused = about.contains(document.activeElement) ? document.activeElement : null;
    if (verticalNetwork.matches) terminal.before(about);
    else aboutSlot.after(about);
    focused?.focus({preventScroll:true});
  }
  placeAbout();
  verticalNetwork.addEventListener('change', placeAbout);
  function showAbout(open) {
    if (!about || !aboutToggle) return;
    about.hidden = !open;
    aboutToggle.setAttribute('aria-expanded', String(open));
    aboutToggle.querySelector('span:last-child').textContent = open ? 'A little less' : 'Read a little more';
  }
  aboutToggle?.addEventListener('click', () => showAbout(about.hidden));
  document.querySelector('#about-link')?.addEventListener('click', () => showAbout(true));
  window.addEventListener('hashchange', () => {if (location.hash === '#about') showAbout(true);});
  if (location.hash === '#about') showAbout(true);

  const work = document.querySelector('#work');
  if (!work) return;
  const board = document.querySelector('#work-board');
  const network = document.querySelector('#network-view');
  const graph = document.querySelector('#network-graph');
  const neurons = document.querySelector('#network-neurons');
  const inspector = document.querySelector('#node-inspector');
  const svg = document.querySelector('#network-connections');
  const announcement = document.querySelector('#focus-announcement');
  const entries = [...board.querySelectorAll('.work-entry')];
  const metadata = {
    adsa: {short:'A.D.S.A.', field:'AUTONOMOUS DATA SCIENCE', metrics:[['8B','model parameters'],['Isolated','code execution']], fact:'Sandboxed Python execution', art:'agent'},
    openbooklm: {short:'OpenbookLM', field:'LOCAL AI / IN PROGRESS', metrics:[['Local-first','research & inference'],['In progress','actively building']], fact:'Work in progress', art:'graph'},
    polymarket: {short:'Polymarket', field:'SIGNAL PIPELINES', metrics:[['5m–5h','ingestion intervals'],['6h','verification cache']], fact:'5m–5h ingestion intervals', art:'signal'},
    rover: {short:'4WD Rover', field:'AUTONOMY / EMBEDDED', metrics:[['180°','ultrasonic scanning'],['4WD','motor platform']], fact:'180° ultrasonic scanning', art:'radar'},
    zombie: {short:'Zombie Shooter RL', field:'REINFORCEMENT LEARNING', metrics:[['5,000+','training episodes'],['Q-learning','tabular policy']], fact:'5,000+ training episodes', art:'learning'},
    gomoku: {short:'Gomoku AI', field:'ADVERSARIAL SEARCH', metrics:[['10 sec','turn budget'],['Minimax','with alpha-beta pruning']], fact:'10-second search budget', art:'board'},
    careergenie: {short:'CareerGenie', field:'RECRUITER INTELLIGENCE', metrics:[['10%','lower tooling costs'],['GitHub','technical signal engine']], fact:'10% lower tooling costs'},
    teleperformance: {short:'Teleperformance', field:'DATA AGENTS / FORECASTING', metrics:[['32%','lower sMAPE vs. baseline'],['Zero-shot','no model retraining']], fact:'32% lower forecasting sMAPE'},
    fertrado: {short:'FERTRADO', field:'GROUNDED REGULATORY AI', metrics:[['Local Qwen','model serving'],['Citations','source-grounded retrieval']], fact:'Local inference + cited retrieval'},
    infovirgin: {short:'Infovirgin', field:'DATA SCIENCE / ANALYTICS', metrics:[['75%','less data preparation'],['45+','standardized attributes']], fact:'75% less reporting preparation'}
  };
  const escape = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const compact = text => text.replace(/\s+/g,' ').trim();
  const records = entries.map(entry => {
    const id = entry.dataset.node;
    const meta = metadata[id];
    const record = {id, entry, kind:entry.dataset.kind, title:compact(entry.querySelector('h3').textContent), description:compact(entry.querySelector('.work-entry-description').textContent), role:entry.querySelector('.work-entry-role')?.textContent || '', tags:[...entry.querySelectorAll('.work-entry-stack .tags span')].map(tag => compact(tag.textContent)), source:entry.querySelector('.project-github-link')?.href, related:[...entry.querySelectorAll('[data-connect]')].map(button => button.dataset.connect), ...meta};
    entry.querySelector('.work-entry-trigger').setAttribute('aria-label', `Details about ${record.title}`);
    entry.querySelector('.work-card-field').textContent = meta.field;
    entry.querySelector('.work-card-fact').textContent = meta.fact;
    entry.querySelector('.work-card-tags').innerHTML = record.tags.slice(0,3).map(tag => `<span>${escape(tag)}</span>`).join('');
    return record;
  });
  const byId = new Map(records.map(record => [record.id,record]));
  let category = 'project';
  let selectedId = 'adsa';
  let openCardId = null;
  let view = 'cards';
  let paused = false;
  let inViewport = true;
  let drawFrame = 0;
  const storageKey = 'aryan-portfolio-work-view';

  const art = {
    agent:'<rect x="20" y="45" width="62" height="30" rx="3"/><rect x="109" y="45" width="62" height="30" rx="3"/><rect x="198" y="45" width="62" height="30" rx="3"/><path d="M82 60h27m62 0h27m-57-15V26H51v19"/><path d="m103 56 6 4-6 4m89-8 6 4-6 4"/><g stroke="none" fill="currentColor"><text x="51" y="63">PLAN</text><text x="140" y="63">EXECUTE</text><text x="229" y="63">REPORT</text><text x="96" y="20" opacity=".6">SELF-CORRECT</text></g>',
    graph:'<path d="m50 32 88 28-88 29m88-29 87-30m-87 30 87 29M50 32v57m175-59v59"/><circle cx="138" cy="60" r="19"/><circle cx="50" cy="32" r="11"/><circle cx="50" cy="89" r="11"/><circle cx="225" cy="30" r="11"/><circle cx="225" cy="89" r="11"/><g stroke="none" fill="currentColor"><text x="138" y="63">LOCAL</text><text x="50" y="35">.PY</text><text x="50" y="92">.MD</text><text x="225" y="33">.TS</text><text x="225" y="92">.PDF</text></g>',
    signal:'<path d="M23 25v65h238" opacity=".3"/><path d="m23 76 21-6 19 5 18-30 20 12 20-9 20 20 20-45 20 14 20-5 20 23 20-35 20 11"/><path d="M23 66q40-22 70-12t60-7 108-4" stroke-dasharray="3 5" opacity=".4"/><g stroke="none" fill="currentColor"><text x="66" y="106">INGEST</text><text x="140" y="106">VERIFY</text><text x="219" y="106">SYNTHESIZE</text></g>',
    radar:'<g transform="translate(140,96)"><path d="M-85 0a85 85 0 0 1 170 0m-60 0a25 25 0 0 0-50 0m-30 0a55 55 0 0 1 110 0M0 0l-61-60M0 0l61-60M-85 0H85M0 0v-85" opacity=".5"/><path d="M0 0 55-66"/><circle r="5" fill="currentColor"/><circle cx="36" cy="-44" r="4" fill="currentColor"/></g><g fill="currentColor" stroke="none"><text x="35" y="110">0°</text><text x="245" y="110">180°</text><text x="140" y="19">SENSE → DECIDE → ACT</text></g>',
    learning:'<path d="M25 23v69h235" opacity=".3"/><path d="m25 86 8-12 9 9 11-18 9 8 10-16 9 7 10-19 12 10 13-14 10 5 12-13 12 6 11-12 12 8 12-13 10 5 12-9 12 2 12-7 12 4 12-6" opacity=".5"/><path d="M25 85Q90 65 123 47t137-22" stroke-width="2"/><g fill="currentColor" stroke="none"><text x="140" y="108">EXPLORATION → POLICY</text></g>',
    board:'<path d="M101 20v80m20-80v80m20-80v80m20-80v80m20-80v80M101 20h80m-80 20h80m-80 20h80m-80 20h80m-80 20h80" opacity=".4"/><g fill="currentColor"><circle cx="121" cy="40" r="7"/><circle cx="141" cy="60" r="7"/><circle cx="161" cy="80" r="7"/></g><g fill="none"><circle cx="141" cy="40" r="7"/><circle cx="121" cy="80" r="7"/></g><circle cx="181" cy="100" r="9" stroke-dasharray="2 3"/>'
  };
  records.forEach(record => {
    const container = record.entry.querySelector('.work-card-art');
    if (record.art) container.innerHTML = `<svg viewBox="0 0 280 120" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><g font-family="monospace" font-size="7" text-anchor="middle">${art[record.art]}</g></svg>`;
  });

  function announce(message) {if (announcement) announcement.textContent = message;}
  function closeCards() {
    const focusedDetails = document.activeElement?.closest('.work-entry-details');
    const returnTrigger = focusedDetails?.closest('.work-entry')?.querySelector('.work-entry-trigger');
    records.forEach(({entry}) => {
      entry.classList.remove('is-open');
      entry.querySelector('.work-entry-trigger').setAttribute('aria-expanded','false');
      entry.querySelector('.work-entry-trigger').innerHTML = 'Details <span aria-hidden="true">↗</span>';
      entry.querySelector('.work-entry-details').hidden = true;
    });
    openCardId = null;
    returnTrigger?.focus({preventScroll:true});
  }
  function visibleRecords() {return records.filter(record => record.kind === category);}
  function updateInspector() {
    const record = byId.get(selectedId);
    const list = visibleRecords();
    const index = list.indexOf(record);
    inspector.innerHTML = `<p class="inspector-label"><span>03 / A CLOSER LOOK</span><span class="inspector-index">${String(index+1).padStart(2,'0')} / ${String(list.length).padStart(2,'0')}</span></p><p class="inspector-field">${escape(record.field)}</p><h3 id="inspector-title">${escape(record.title)}</h3>${record.role ? `<p class="inspector-role">${escape(record.role)}</p>` : ''}<p class="inspector-description">${escape(record.description)}</p><div class="inspector-metrics">${record.metrics.map(([value,label]) => `<div class="inspector-metric"><strong>${escape(value)}</strong><span>${escape(label)}</span></div>`).join('')}</div><div class="inspector-tags" aria-label="Technologies">${record.tags.slice(0,4).map(tag => `<span>${escape(tag)}</span>`).join('')}</div><div class="inspector-actions"><button type="button" class="inspector-more" data-detail="${record.id}">Read the breakdown <span aria-hidden="true">&nbsp;↗</span></button>${record.source ? `<a class="inspector-source" href="${escape(record.source)}" target="_blank" rel="noopener noreferrer">Source code ↗</a>` : ''}</div><div class="inspector-related"><span>CONNECTED TO</span><br>${record.related.map(id => { const other=byId.get(id); return other ? `<button type="button" data-open-node="${id}">${escape(other.short)} ↗</button>` : ''; }).join('')}</div>`;
    document.querySelector('#network-selection').textContent = `${String(index+1).padStart(2,'0')} / ${String(list.length).padStart(2,'0')} NODES`;
    inspector.scrollTop = 0;
  }
  function renderNeurons() {
    const list = visibleRecords();
    neurons.style.setProperty('--network-rows', Math.ceil(list.length / 2));
    neurons.innerHTML = list.map((record,index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const totalRows = Math.ceil(list.length / 2);
      const y = totalRows === 3 ? 25 + row * 27 : 35 + row * 35;
      return `<button type="button" class="work-neuron" data-neuron="${record.id}" aria-pressed="${record.id === selectedId}" aria-label="${escape(record.title)}${record.id==='openbooklm'?', work in progress':''}" aria-controls="node-inspector" style="left:${column === 0 ? 48 : 79}%;top:${y}%;--node-delay:${index*30}ms"><span class="neuron-dot">${String(index+1).padStart(2,'0')}</span><span class="neuron-label">${escape(record.short)}${record.id==='openbooklm'?'<small class="neuron-wip">IN PROGRESS</small>':''}</span></button>`;
    }).join('');
    document.querySelector('#network-caption').textContent = `Each neuron is ${category === 'project'?'a project':'an experience'}. Select one to look inside.`;
    scheduleDraw();
  }
  function setCategory(next, notify=true) {
    if (next !== 'project' && next !== 'experience') return;
    closeCards(); category = next;
    if (byId.get(selectedId)?.kind !== category) selectedId = visibleRecords()[0].id;
    document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.mode === category)));
    records.forEach(record => {record.entry.hidden = record.kind !== category;});
    renderNeurons(); updateInspector();
    if (notify) announce(`Showing ${category === 'project'?'projects':'experience'}. Select a ${view === 'visual'?'neuron':'card'} for details.`);
  }
  function setView(next, save=true) {
    if (!['visual','cards'].includes(next)) return;
    view = next; work.dataset.view = view;
    network.hidden = view !== 'visual'; board.hidden = view !== 'cards';
    document.querySelectorAll('[data-work-view]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.workView === view)));
    document.querySelector('#work-view-hint').textContent = view === 'visual' ? 'Pick an input. Follow a connection. Explore the work.' : 'The same work, with a little less wiring. Pick a card for details.';
    if (save) {try {localStorage.setItem(storageKey,view);} catch {} }
    scheduleDraw(); syncMotion();
  }
  function selectNode(id, focus=false) {
    const record = byId.get(id);
    if (!record) return false;
    if (record.kind !== category) setCategory(record.kind,false);
    selectedId = id;
    neurons.querySelectorAll('[data-neuron]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.neuron === id)));
    updateInspector(); scheduleDraw();
    if (focus) neurons.querySelector(`[data-neuron="${id}"]`)?.focus({preventScroll:true});
    announce(`${record.title} selected. ${record.fact}.`);
    return true;
  }
  function openCard(id, scroll=false) {
    const record = byId.get(id); if (!record) return;
    closeCards(); openCardId = id;
    record.entry.classList.add('is-open'); record.entry.querySelector('.work-entry-details').hidden = false;
    record.entry.querySelector('.work-entry-trigger').setAttribute('aria-expanded','true');
    record.entry.querySelector('.work-entry-trigger').innerHTML = 'Close details <span aria-hidden="true">−</span>';
    if (scroll) record.entry.scrollIntoView({behavior:reduceMotion.matches?'auto':'smooth',block:'start'});
  }
  function openNode(id) {
    if (!byId.has(id)) return false;
    selectNode(id);
    if (view === 'cards') openCard(id);
    const target = view === 'cards' ? byId.get(id).entry : network;
    target.scrollIntoView({behavior:reduceMotion.matches?'auto':'smooth',block:'start'});
    if (view === 'visual') neurons.querySelector(`[data-neuron="${id}"]`)?.focus({preventScroll:true});
    else byId.get(id).entry.querySelector('.work-entry-trigger').focus({preventScroll:true});
    return true;
  }
  window.PortfolioWork = {openNode, showAbout};

  function scheduleDraw() {cancelAnimationFrame(drawFrame); drawFrame = requestAnimationFrame(drawConnections);}
  function drawConnections() {
    if (network.hidden) return;
    const bounds = graph.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
    const center = element => {const rect=element.getBoundingClientRect(); return {x:rect.left-bounds.left+rect.width/2,y:rect.top-bounds.top+rect.height/2};};
    const inputButton = graph.querySelector(`.network-input[data-mode="${category}"]`);
    const input = center(inputButton.querySelector('.neuron-dot'));
    if (verticalNetwork.matches) {
      const rect = inputButton.getBoundingClientRect();
      input.x = rect.left - bounds.left + rect.width / 2;
      input.y = rect.bottom - bounds.top;
    }
    const end = center(graph.querySelector('.network-output-port'));
    const path = (a,b) => verticalNetwork.matches
      ? `M${a.x},${a.y} C${a.x},${a.y+(b.y-a.y)*.45} ${b.x},${b.y-(b.y-a.y)*.45} ${b.x},${b.y}`
      : `M${a.x},${a.y} C${a.x+(b.x-a.x)*.45},${a.y} ${b.x-(b.x-a.x)*.45},${b.y} ${b.x},${b.y}`;
    let paths = '';
    neurons.querySelectorAll('.work-neuron').forEach((button,index) => {
      const dot = button.querySelector('.neuron-dot');
      const point = center(dot);
      const active = button.dataset.neuron === selectedId;
      const radius = dot.getBoundingClientRect().width / 2;
      const inputPath = path(input, verticalNetwork.matches ? {x:point.x, y:point.y-radius} : point);
      let outputPath = path(point,end);
      if (verticalNetwork.matches) {
        // Follow the outer gutter into the panel below, keeping the selected
        // output trace away from the other nodes and their labels.
        const side = index % 2 === 0 ? 1 : -1;
        const rail = side === 1 ? 10 : bounds.width - 10;
        outputPath = `M${point.x-side*radius},${point.y} H${rail+side*12} Q${rail},${point.y} ${rail},${point.y+12} V${end.y-22} Q${rail},${end.y} ${rail+side*22},${end.y} H${end.x}`;
      }
      paths += `<path class="network-path${active?' is-selected':''}" d="${inputPath}"/>`;
      if (active || !verticalNetwork.matches) paths += `<path class="network-path${active?' is-selected':''}" d="${outputPath}" opacity="${active?'.8':'.38'}"/>`;
      if (active) paths += `<path class="network-signal" d="${inputPath}"/><path class="network-signal" d="${outputPath}" style="animation-delay:-2s"/>`;
    });
    svg.innerHTML = paths;
  }
  function syncMotion() {network.classList.toggle('is-paused',paused || !inViewport || document.hidden || reduceMotion.matches || view !== 'visual');}
  new ResizeObserver(scheduleDraw).observe(graph);
  new IntersectionObserver(entries => {inViewport=entries[0].isIntersecting;syncMotion();}).observe(network);
  document.addEventListener('visibilitychange',syncMotion);
  reduceMotion.addEventListener('change',syncMotion);
  verticalNetwork.addEventListener('change',scheduleDraw);
  document.querySelector('#network-motion').addEventListener('click',event => {
    paused=!paused;
    event.currentTarget.setAttribute('aria-pressed',String(paused));
    event.currentTarget.setAttribute('aria-label',`${paused?'Resume':'Pause'} graph animation`);
    event.currentTarget.innerHTML = `${paused?'Resume':'Pause'} <svg class="network-motion-icon" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">${paused?'<path d="m7 4 9 6-9 6Z"/>':'<path d="M7 4v12M13 4v12"/>'}</svg>`;
    syncMotion();
  });
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click',() => setCategory(button.dataset.mode)));
  document.querySelectorAll('[data-work-view]').forEach(button => button.addEventListener('click',() => {setView(button.dataset.workView); announce(`${view === 'visual'?'Visual':'Cards'} view selected.`);}));
  neurons.addEventListener('click',event => {const button=event.target.closest('[data-neuron]');if(button)selectNode(button.dataset.neuron);});
  neurons.addEventListener('keydown',event => {
    if (!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    const buttons=[...neurons.querySelectorAll('[data-neuron]')];const index=buttons.indexOf(event.target);if(index<0)return;
    event.preventDefault();const step=event.key==='ArrowDown'?2:event.key==='ArrowUp'?-2:event.key==='ArrowLeft'?-1:1;
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+step+buttons.length)%buttons.length;
    selectNode(buttons[next].dataset.neuron,true);
  });
  records.forEach(record => record.entry.querySelector('.work-entry-trigger').addEventListener('click',() => {if(openCardId===record.id)closeCards();else {selectNode(record.id);openCard(record.id,true);}}));

  const dialog=document.createElement('dialog');dialog.className='work-detail-dialog';dialog.setAttribute('aria-labelledby','detail-dialog-title');
  dialog.innerHTML='<div class="detail-dialog-header"><h2 id="detail-dialog-title"></h2><button type="button" class="detail-dialog-close" aria-label="Close project details">×</button></div><div class="detail-dialog-body"></div>';
  document.body.append(dialog);
  let beforeDialogOverflow='';
  function showDetails(id) {
    const record=byId.get(id);if(!record)return;
    dialog.querySelector('h2').textContent=record.title;
    const content=record.entry.querySelector('.work-entry-details').cloneNode(true);content.hidden=false;content.removeAttribute('id');content.removeAttribute('aria-labelledby');content.removeAttribute('role');
    dialog.querySelector('.detail-dialog-body').replaceChildren(content);
    beforeDialogOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    dialog.showModal();
  }
  dialog.querySelector('.detail-dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{document.body.style.overflow=beforeDialogOverflow;});
  document.addEventListener('click',event=>{
    const detail=event.target.closest('[data-detail]');if(detail){showDetails(detail.dataset.detail);return;}
    const target=event.target.closest('[data-open-node],[data-connect]');if(!target)return;
    const id=target.dataset.openNode||target.dataset.connect;
    if(dialog.open)dialog.close();
    openNode(id);
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&openCardId&&!dialog.open){closeCards();announce('Card details closed.');}});
  let initialView;try{initialView=localStorage.getItem(storageKey);}catch{}
  setCategory('project',false);
  setView(initialView || (matchMedia('(min-width:768px)').matches?'visual':'cards'),false);
  function openLinkedWork() {
    const id = location.hash.slice(1);
    if (byId.has(id)) openNode(id);
  }
  window.addEventListener('hashchange', openLinkedWork);
  if (byId.has(location.hash.slice(1))) requestAnimationFrame(openLinkedWork);
})();
