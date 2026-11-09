import { COPY, alternateName, displayName, isDeceased, years } from './i18n.js';
import { photoMarkup, initials } from './components.js';
import { getRelation } from './relations.js';
import { CARD_WIDTH, CARD_HEIGHT, V_GAP, TREE_TOP, COUPLE_GAP, layoutTree } from './layout.js';
import { lineageToRoot, searchMembers } from './tree.js';

export function createDesktop(main, tree, prefs, announce) {
  const state = {
    collapsed: new Set(),
    maxGeneration: Infinity,
    selectedId: null,
    lineage: new Set(),
    searchHit: null,
    x: 0,
    y: 0,
    scale: 1,
    dragging: null,
    layout: null
  };

  main.innerHTML = `<div class="desktop-app">
    <section class="tree-masthead" aria-labelledby="desktop-tree-title">
      <img class="masthead-corner masthead-corner--left" src="img/botanical-corner.svg" alt="">
      <img class="masthead-corner masthead-corner--right" src="img/botanical-corner.svg" alt="">
      <img class="tree-emblem" src="img/tree-emblem.svg" alt="">
      <h1 id="desktop-tree-title">${tree.family.titleHindi || tree.family.title}</h1>
      <p class="masthead-summary">${prefs.locale === 'hi' ? (tree.family.titleHindi || tree.family.title) : tree.family.title} <span aria-hidden="true">·</span> ${tree.memberCount} ${COPY[prefs.locale].members} <span aria-hidden="true">·</span> ${tree.generationCount} ${COPY[prefs.locale].generations}</p>
      <span class="masthead-flourish" aria-hidden="true">◇◇</span>
    </section>
    <div class="desktop-toolbar" aria-label="Tree controls">
      <div class="desktop-search-wrap">
        <input id="desktop-search" type="search" aria-label="Search family" autocomplete="off" spellcheck="false">
        <button id="search-button" type="button" aria-label="Search">⌕</button>
        <div id="desktop-search-results" class="desktop-search-results" hidden></div>
      </div>
      <select id="generation-filter" aria-label="Visible generations"></select>
      <button data-action="zoom-out" type="button" aria-label="Zoom out">−</button>
      <button data-action="zoom-in" type="button" aria-label="Zoom in">+</button>
      <button data-action="fit" type="button"></button>
      <button data-action="reset" type="button"></button>
      <span class="toolbar-spacer"></span>
      <button data-action="png" type="button"></button>
    </div>
    <div class="tree-viewport" tabindex="0" aria-label="Interactive family tree"><div class="tree-stage"></div></div>
    <section class="overview-panel" aria-label="Tree overview">
      <header><strong>${COPY[prefs.locale].overview} <small>(${tree.memberCount} ${COPY[prefs.locale].members})</small></strong><span>${tree.generationCount} ${COPY[prefs.locale].generations}</span></header>
      <svg class="minimap" viewBox="0 0 520 170" aria-hidden="true"></svg>
    </section>
    <aside class="detail-panel" aria-labelledby="detail-heading" hidden></aside>
  </div>`;

  const root = main.querySelector('.desktop-app');
  const viewport = root.querySelector('.tree-viewport');
  const stage = root.querySelector('.tree-stage');
  const panel = root.querySelector('.detail-panel');
  const minimap = root.querySelector('.minimap');
  const searchInput = root.querySelector('#desktop-search');
  const searchResults = root.querySelector('#desktop-search-results');
  const generationSelect = root.querySelector('#generation-filter');

  function translate() {
    stage.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    renderMinimap();
  }

  function cardHtml(node) {
    const person = node.member;
    const selected = state.selectedId === person.id;
    const lineage = state.lineage.has(person.id);
    const hit = state.searchHit === person.id;
    const deceased = isDeceased(person);
    const lifeYears = years(person, prefs.locale);
    const t = COPY[prefs.locale];

    const hasSpouses = person.spouses && person.spouses.length > 0;
    const husbandHtml = `<button class="tree-card${deceased ? ' is-deceased' : ''}${selected ? ' is-selected' : ''}${lineage ? ' is-lineage' : ''}${hit ? ' is-search-hit' : ''}" data-person-id="${person.id}" style="left:${node.x}px;top:${node.y}px" aria-label="${displayName(person, prefs.locale)}">
      ${deceased ? `<span class="memory-label"><span aria-hidden="true">◆</span>${t.lovingMemory}</span>` : ''}
      <span class="tree-card__portrait">${photoMarkup(person, prefs.locale)}${deceased ? '<img class="memorial-garland" src="img/memorial-garland.png" alt="" aria-hidden="true">' : ''}</span>
      <span class="tree-card__identity"><strong>${displayName(person, prefs.locale)}</strong><small class="tree-card__alternate">${alternateName(person, prefs.locale)}</small>${lifeYears ? `<small class="tree-card__years">${lifeYears}</small>` : ''}</span>
      ${person.children.length ? `<span class="collapse-button" role="button" tabindex="0" data-collapse="${person.id}" aria-label="${state.collapsed.has(person.id) ? 'Expand' : 'Collapse'} branch">${state.collapsed.has(person.id) ? '+' : '−'}</span>` : ''}
    </button>`;

    if (!hasSpouses) return husbandHtml;

    const spousesHtml = person.spouses.map((spouse, index) => {
      const spouseX = node.x + (index + 1) * (CARD_WIDTH + COUPLE_GAP);
      const badgeX = node.x + CARD_WIDTH + index * (CARD_WIDTH + COUPLE_GAP) + (COUPLE_GAP - 24) / 2;
      const spouseSelected = state.selectedId === spouse.id;
      const spouseLineage = state.lineage.has(spouse.id);
      const spouseHit = state.searchHit === spouse.id;
      const spouseDeceased = isDeceased(spouse);
      const spouseYears = years(spouse, prefs.locale);
      return `<div class="tree-marriage-badge" style="left:${badgeX}px;top:${node.y + 110}px" title="${t.wife}">
        <span class="marriage-icon" aria-hidden="true">⚭</span>
      </div>
      <button class="tree-card tree-card--spouse${spouseDeceased ? ' is-deceased' : ''}${spouseSelected ? ' is-selected' : ''}${spouseLineage ? ' is-lineage' : ''}${spouseHit ? ' is-search-hit' : ''}" data-person-id="${spouse.id}" style="left:${spouseX}px;top:${node.y}px" aria-label="${displayName(spouse, prefs.locale)}">
        ${spouseDeceased ? `<span class="memory-label"><span aria-hidden="true">◆</span>${t.lovingMemory}</span>` : ''}
        <span class="tree-card__portrait">${photoMarkup(spouse, prefs.locale)}${spouseDeceased ? '<img class="memorial-garland" src="img/memorial-garland.png" alt="" aria-hidden="true">' : ''}</span>
        <span class="tree-card__identity">
          <strong>${displayName(spouse, prefs.locale)}</strong>
          <small class="tree-card__alternate">${alternateName(spouse, prefs.locale)}</small>
          ${spouseYears ? `<small class="tree-card__years">${spouseYears}</small>` : ''}
        </span>
      </button>`;
    }).join('');

    return `${husbandHtml}${spousesHtml}`;
  }

  function renderTree() {
    state.layout = layoutTree(tree, state);
    stage.style.width = `${state.layout.width}px`;
    stage.style.height = `${state.layout.height}px`;
    const paths = state.layout.connectors.map(({ from, to }) => {
      const mid = from.y + (to.y - from.y) / 2;
      return `<path d="M ${from.x} ${from.y} V ${mid} H ${to.x} V ${to.y}"/>`;
    }).join('');
    const leaves = state.layout.connectors.map(({ to }) =>
      `<g class="connector-leaf" transform="translate(${to.x - 9} ${to.y - 21})"><path d="M9 22V4"/><path d="M9 13C2 11 1 5 2 1c6 1 9 5 7 12Z"/><path d="M9 16c7-2 9-7 8-12-6 1-9 5-8 12Z"/></g>`
    ).join('');
    const labels = [...new Set(state.layout.nodes.map(node => node.member.depth))].map(depth =>
      `<div class="generation-label" style="top:${TREE_TOP + 20 + depth * (CARD_HEIGHT + V_GAP)}px"><span>${COPY[prefs.locale].generation} ${depth + 1}</span><i aria-hidden="true"></i></div>`
    ).join('');
    stage.innerHTML = `<svg class="connector-layer" width="${state.layout.width}" height="${state.layout.height}">${paths}${leaves}</svg>${labels}${state.layout.nodes.map(cardHtml).join('')}<p class="drag-hint" aria-hidden="true">☜ <em>${COPY[prefs.locale].exploreTree}</em></p>`;

    stage.querySelectorAll('.tree-card').forEach(card => card.addEventListener('click', event => {
      if (event.target.closest('[data-collapse]')) return;
      state.searchHit = null;
      selectPerson(card.dataset.personId);
    }));

    stage.querySelectorAll('[data-collapse]').forEach(control => {
      const toggle = event => {
        event.stopPropagation();
        event.preventDefault();
        const id = control.dataset.collapse;
        state.collapsed.has(id) ? state.collapsed.delete(id) : state.collapsed.add(id);
        renderTree();
      };
      control.addEventListener('click', toggle);
      control.addEventListener('pointerdown', event => event.stopPropagation());
      control.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.stopPropagation();
          event.preventDefault();
          toggle(event);
        }
      });
    });
    renderMinimap();
  }

  function selectPerson(id, keepSearchHit = false) {
    const person = tree.byId.get(id);
    if (!person) return;
    state.selectedId = id;
    if (!keepSearchHit) state.searchHit = null;
    const t = COPY[prefs.locale];
    const viewer = prefs.viewerId || tree.root.id;
    const relatives = person.spouseOf
      ? [tree.byId.get(person.spouseOf), ...(person.children || [])].filter(Boolean)
      : [
          tree.byId.get(person.parentId),
          ...(person.spouses || []),
          ...person.children,
          ...(tree.byId.get(person.parentId)?.children || []).filter(item => item.id !== person.id)
        ].filter(Boolean);

    panel.hidden = false;
    panel.innerHTML = `<button class="detail-panel__close" type="button" aria-label="${t.close}">×</button>${photoMarkup(person, prefs.locale, 'detail-photo', true)}
      <h2 id="detail-heading">${displayName(person, prefs.locale)}</h2><p>${alternateName(person, prefs.locale)}</p><p>${years(person, prefs.locale)}</p><p class="relation-label">${getRelation(viewer, id, tree, prefs.locale)}</p>
      ${isDeceased(person) ? `<p class="memory-label">${t.lovingMemory}</p>` : ''}
      ${person.husband ? `<p class="detail-spouse"><strong>${prefs.locale === 'hi' ? 'पति' : 'Husband'}:</strong> <button class="button secondary" data-related-id="${person.husband.id}">${displayName(person.husband, prefs.locale)}</button></p>` : ''}
      ${person.spouses?.length ? `<p class="detail-spouse"><strong>${t.wife}:</strong> ${person.spouses.map(s => `<button class="button secondary" data-related-id="${s.id}">${displayName(s, prefs.locale)}</button>`).join(' ')}</p>` : ''}
      <p>${person.bio || t.noBio}</p>
      <button class="button quiet" id="lineage-button" type="button">${t.lineage}</button>
      <h3>${t.details}</h3><div class="detail-links">${relatives.map(relative => `<button class="button secondary" data-related-id="${relative.id}">${displayName(relative, prefs.locale)}</button>`).join('')}</div>`;

    panel.querySelector('.detail-panel__close').addEventListener('click', event => {
      event.stopPropagation();
      panel.hidden = true;
      state.selectedId = null;
      renderTree();
    });
    panel.querySelector('#lineage-button').addEventListener('click', event => {
      event.stopPropagation();
      state.lineage = new Set(lineageToRoot(person, tree));
      renderTree();
    });
    panel.querySelectorAll('[data-related-id]').forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      selectPerson(button.dataset.relatedId);
      centerOn(button.dataset.relatedId);
    }));
    renderTree();
    announce(`${t.viewing}: ${displayName(person, prefs.locale)}`);
  }

  function centerOn(id) {
    const person = tree.byId.get(id);
    const husbandId = person?.spouseOf || id;
    const node = state.layout?.nodes.find(item => item.member.id === husbandId);
    if (!node) return;
    const rightOffset = panel.hidden ? 0 : Math.min(180, viewport.clientWidth * 0.15);
    const targetX = person?.spouseOf
      ? node.x + CARD_WIDTH + COUPLE_GAP + CARD_WIDTH / 2
      : node.x + CARD_WIDTH / 2;
    state.x = (viewport.clientWidth / 2 - rightOffset) - targetX * state.scale;
    state.y = viewport.clientHeight / 2 - (node.y + node.height / 2) * state.scale;
    translate();
  }

  function fit() {
    if (!state.layout || !state.layout.width) return;
    const padX = 80;
    const padY = 80;
    const viewW = Math.max(300, viewport.clientWidth - padX);
    const viewH = Math.max(300, viewport.clientHeight - padY);
    const scaleX = viewW / state.layout.width;
    const scaleY = viewH / state.layout.height;
    state.scale = Math.max(0.1, Math.min(1.0, Math.min(scaleX, scaleY)));
    state.x = (viewport.clientWidth - state.layout.width * state.scale) / 2;
    state.y = 24;
    translate();
  }

  function reset() {
    state.scale = 0.85;
    const rootNode = state.layout?.nodes.find(node => node.member.id === tree.root.id);
    if (rootNode) {
      state.x = viewport.clientWidth / 2 - (rootNode.x + rootNode.width / 2) * state.scale;
      state.y = 36;
    } else {
      state.x = (viewport.clientWidth - (state.layout?.width || 0) * state.scale) / 2;
      state.y = 36;
    }
    translate();
  }

  function renderMinimap() {
    if (!state.layout) return;
    const sx = 500 / state.layout.width;
    const sy = 150 / state.layout.height;
    const scale = Math.min(sx, sy);
    const ox = 10, oy = 10;
    const nodes = state.layout.nodes.map(node =>
      `<rect class="node" x="${ox + node.x * scale}" y="${oy + node.y * scale}" width="${Math.max(3, node.width * scale)}" height="${Math.max(3, node.height * scale)}" rx="2"/>`
    ).join('');
    const vx = ox + (-state.x / state.scale) * scale;
    const vy = oy + (-state.y / state.scale) * scale;
    const vw = viewport.clientWidth / state.scale * scale;
    const vh = viewport.clientHeight / state.scale * scale;
    minimap.innerHTML = `${nodes}<rect class="view" x="${vx}" y="${vy}" width="${vw}" height="${vh}"/>`;
  }

  function setLabels() {
    const t = COPY[prefs.locale];
    searchInput.placeholder = t.searchPlaceholder;
    root.querySelector('[data-action="fit"]').textContent = t.fit;
    root.querySelector('[data-action="reset"]').textContent = t.reset;
    root.querySelector('[data-action="png"]').textContent = t.png;

    const currentVal = generationSelect.value || (state.maxGeneration === Infinity ? 'all' : String(state.maxGeneration));
    generationSelect.innerHTML = `<option value="all">${t.allGenerations}</option>${tree.generations.map((gen, index) => {
      const num = index + 1;
      const label = index === 0
        ? (prefs.locale === 'hi' ? `पीढ़ी 1 (मूल पूर्वज)` : `Gen 1 · Root only`)
        : (prefs.locale === 'hi' ? `पीढ़ी 1–${num} (${gen.length} सदस्य)` : `Gen 1–${num} (${gen.length} members)`);
      return `<option value="${index}">${label}</option>`;
    }).join('')}`;
    generationSelect.value = currentVal;
  }

  function selectSearchResult(person) {
    if (!person) return;
    let cur = person.spouseOf ? (person.husband || tree.byId.get(person.spouseOf)) : person;
    while (cur?.parentId) {
      state.collapsed.delete(cur.parentId);
      cur = tree.byId.get(cur.parentId);
    }
    if (state.maxGeneration !== Infinity && person.depth >= state.maxGeneration) {
      state.maxGeneration = Infinity;
      generationSelect.value = 'all';
    }
    state.searchHit = person.id;
    state.scale = Math.max(state.scale, 0.85);
    selectPerson(person.id, true);
    centerOn(person.id);
    searchResults.hidden = true;
    searchInput.value = displayName(person, prefs.locale);
  }

  function updateSearchResults() {
    const query = searchInput.value.trim();
    const t = COPY[prefs.locale];
    let hits;
    if (!query) {
      hits = [tree.root, ...tree.root.children].filter(Boolean);
    } else {
      hits = searchMembers(query, tree);
    }
    if (!hits.length) {
      searchResults.hidden = false;
      searchResults.innerHTML = `<div class="search-no-results">${t.noResults}</div>`;
      return;
    }
    const itemsHtml = hits.slice(0, 10).map(person => {
      const alt = alternateName(person, prefs.locale);
      const photoHtml = person.photo
        ? `<span class="item-avatar"><img src="${person.photo}" alt="" loading="lazy"></span>`
        : `<span class="item-avatar">${initials(person, prefs.locale)}</span>`;
      const genNum = (person.depth ?? 0) + 1;
      const genBadge = person.spouseOf ? t.wife : `${t.generation} ${genNum}`;
      return `<button type="button" class="desktop-search-item" data-id="${person.id}">
        ${photoHtml}
        <span class="item-text">
          <span class="item-name">${displayName(person, prefs.locale)}</span>
          ${alt ? `<small class="item-sub">${alt}</small>` : ''}
        </span>
        <span class="item-badge">${genBadge}</span>
      </button>`;
    }).join('');

    searchResults.hidden = false;
    searchResults.innerHTML = itemsHtml;
    searchResults.querySelectorAll('.desktop-search-item').forEach(button => {
      button.addEventListener('pointerdown', event => event.stopPropagation());
      button.addEventListener('mousedown', event => event.stopPropagation());
      button.addEventListener('click', event => {
        event.stopPropagation();
        const person = tree.byId.get(button.dataset.id);
        selectSearchResult(person);
      });
    });
  }

  function doSearchTop() {
    const query = searchInput.value.trim();
    if (!query) {
      updateSearchResults();
      return;
    }
    const hits = searchMembers(query, tree);
    if (hits.length) {
      selectSearchResult(hits[0]);
    } else {
      updateSearchResults();
      announce(COPY[prefs.locale].noResults);
    }
  }

  setLabels();
  renderTree();
  requestAnimationFrame(fit);

  root.querySelector('[data-action="fit"]').addEventListener('click', event => {
    event.stopPropagation();
    if (!searchResults.hidden) searchResults.hidden = true;
    fit();
  });
  root.querySelector('[data-action="reset"]').addEventListener('click', event => {
    event.stopPropagation();
    if (!searchResults.hidden) searchResults.hidden = true;
    reset();
  });
  root.querySelector('[data-action="zoom-in"]').addEventListener('click', event => {
    event.stopPropagation();
    if (!searchResults.hidden) searchResults.hidden = true;
    state.scale = Math.min(2.5, state.scale * 1.2);
    translate();
  });
  root.querySelector('[data-action="zoom-out"]').addEventListener('click', event => {
    event.stopPropagation();
    if (!searchResults.hidden) searchResults.hidden = true;
    state.scale = Math.max(0.1, state.scale / 1.2);
    translate();
  });
  root.querySelector('[data-action="png"]').addEventListener('click', async event => {
    const btn = event.currentTarget;
    const originalText = btn.textContent;
    try {
      btn.disabled = true;
      btn.textContent = '📸 Exporting HD...';
      const { exportTreeAsPng } = await import('./export.js');
      await exportTreeAsPng(stage, {
        title: tree.family?.title || 'Jeev Family',
        titleHindi: tree.family?.titleHindi || 'जीव वंशवृक्ष'
      });
      btn.textContent = '✓ Saved!';
      setTimeout(() => { btn.textContent = originalText; }, 2000);
    } catch (error) {
      alert(error.message);
      btn.textContent = originalText;
    } finally {
      btn.disabled = false;
    }
  });

  const stopSelectPropagation = event => {
    event.stopPropagation();
    if (!searchResults.hidden) {
      searchResults.hidden = true;
    }
  };
  generationSelect.addEventListener('change', event => {
    state.maxGeneration = event.target.value === 'all' ? Infinity : Number(event.target.value);
    renderTree();
    fit();
  });
  generationSelect.addEventListener('pointerdown', stopSelectPropagation);
  generationSelect.addEventListener('mousedown', stopSelectPropagation);
  generationSelect.addEventListener('click', stopSelectPropagation);

  const searchWrap = root.querySelector('.desktop-search-wrap');
  const searchButton = root.querySelector('#search-button');

  const stopSearchPropagation = event => {
    event.stopPropagation();
  };

  searchWrap.addEventListener('pointerdown', stopSearchPropagation);
  searchWrap.addEventListener('mousedown', stopSearchPropagation);
  searchWrap.addEventListener('click', event => {
    event.stopPropagation();
    if (event.target === searchWrap || event.target === searchButton) {
      searchInput.focus();
    }
    updateSearchResults();
  });

  searchInput.addEventListener('pointerdown', stopSearchPropagation);
  searchInput.addEventListener('mousedown', stopSearchPropagation);
  searchInput.addEventListener('click', event => {
    event.stopPropagation();
    if (searchInput.value) {
      searchInput.select();
    }
    updateSearchResults();
  });
  searchInput.addEventListener('focus', () => {
    updateSearchResults();
  });
  searchInput.addEventListener('input', updateSearchResults);
  searchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      doSearchTop();
    } else if (event.key === 'Escape') {
      searchResults.hidden = true;
    }
  });

  searchButton.addEventListener('pointerdown', stopSearchPropagation);
  searchButton.addEventListener('mousedown', stopSearchPropagation);
  searchButton.addEventListener('click', event => {
    event.stopPropagation();
    searchInput.focus();
    if (searchInput.value.trim()) {
      doSearchTop();
    } else {
      updateSearchResults();
    }
  });

  searchResults.addEventListener('pointerdown', event => event.stopPropagation());
  searchResults.addEventListener('mousedown', event => event.stopPropagation());

  const onDocClick = event => {
    if (!searchResults.hidden && !event.target.closest('.desktop-search-wrap')) {
      searchResults.hidden = true;
    }
  };
  document.addEventListener('click', onDocClick);

  viewport.addEventListener('pointerdown', event => {
    if (event.target.closest('.tree-card')) return;
    state.dragging = { x: event.clientX, y: event.clientY, ox: state.x, oy: state.y };
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-dragging');
  });
  viewport.addEventListener('pointermove', event => {
    if (!state.dragging) return;
    state.x = state.dragging.ox + event.clientX - state.dragging.x;
    state.y = state.dragging.oy + event.clientY - state.dragging.y;
    translate();
  });
  viewport.addEventListener('pointerup', () => {
    state.dragging = null;
    viewport.classList.remove('is-dragging');
  });

  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      state.scale = Math.max(0.1, Math.min(2.5, state.scale * (event.deltaY > 0 ? 0.9 : 1.1)));
    } else {
      state.x -= event.deltaX;
      state.y -= event.deltaY;
    }
    translate();
  }, { passive: false });

  viewport.addEventListener('keydown', event => {
    if (!state.selectedId || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const current = tree.byId.get(state.selectedId);
    let next;
    if (event.key === 'ArrowUp') next = tree.byId.get(current.parentId);
    if (event.key === 'ArrowDown') next = current.children[0];
    if (event.key.startsWith('ArrowL') || event.key.startsWith('ArrowR')) {
      const siblings = tree.byId.get(current.parentId)?.children || [current];
      const index = siblings.findIndex(item => item.id === current.id);
      next = siblings[index + (event.key === 'ArrowLeft' ? -1 : 1)];
    }
    if (next) {
      selectPerson(next.id);
      centerOn(next.id);
      event.preventDefault();
    }
  });

  viewport.addEventListener('click', event => {
    if (!event.target.closest('.tree-card') && state.searchHit) {
      state.searchHit = null;
      renderTree();
    }
  });

  minimap.addEventListener('click', event => {
    event.stopPropagation();
    const rect = minimap.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width * state.layout.width;
    const py = (event.clientY - rect.top) / rect.height * state.layout.height;
    state.x = viewport.clientWidth / 2 - px * state.scale;
    state.y = viewport.clientHeight / 2 - py * state.scale;
    translate();
  });

  return {
    destroy() {
      document.removeEventListener('click', onDocClick);
    },
    refresh() {
      setLabels();
      renderTree();
      if (state.selectedId) selectPerson(state.selectedId);
    },
    fit
  };
}
