import '../styles/tracker.css';
import '../styles/main.css';
import { store } from './dataStore.js';
import { trackingStore } from './trackingStore.js';
import {
  TYPE_COLORS, VERSION_DATA,
  GAME_DEX_LIMITS, NO_SHINY_GAMES, REGIONS, ALL_GAMES, GAME_GROUPS
} from './constants.js';
import { renderPokemonDetail } from './components/pokemonDetail.js';

// ===== Config =====
const PER_PAGE = 25;
const MILESTONES = [3, 5, 10, 50];

// ===== State =====
let currentPage = 1;
let searchQuery  = '';
let trackFilter  = 'all';   // 'all' | 'caught' | 'missing' | 'shiny' | 'shiny-missing'
let selectedGame   = null;  // game key string or null
let selectedRegion = null;  // region key string or null
let debounceTimer  = null;

// ===== DOM refs =====
const searchEl        = document.getElementById('tracker-search');
const tableBody       = document.getElementById('pokemon-table-body');
const noResults       = document.getElementById('tracker-no-results');
const resultCount     = document.getElementById('tracker-result-count');
const paginationEl    = document.getElementById('tracker-pagination');
const progressWrap    = document.getElementById('tracker-progress-wrap');
const progressBar     = document.getElementById('tracker-progress-bar');
const progressText    = document.getElementById('tracker-progress-text');
const contextBadge    = document.getElementById('context-badge');
const contextLabel    = document.getElementById('context-label');
const clearContextBtn = document.getElementById('clear-context');
const modal           = document.getElementById('tracker-modal');
const modalBody       = document.getElementById('tracker-modal-body');
const modalClose      = document.getElementById('tracker-modal-close');
const importInput     = document.getElementById('import-input');

// ===== Boot =====
async function init() {
  setupEventListeners();
  renderSidebar();
  trackingStore.subscribe(() => {
    updateStats();
    renderSidebar();
    renderTable();
  });

  store.loadAll((loaded, total) => {
    const pct = Math.round((loaded / total) * 100);
    progressBar.style.width = pct + '%';
    progressText.textContent = `Loading Pokémon… ${loaded} / ${total}`;
    renderTable();
  }).then(() => {
    progressWrap.hidden = true;
    renderTable();
  }).catch(err => {
    console.error('Load failed:', err);
    progressText.textContent = 'Failed to load. Please refresh.';
  });

  updateStats();
}

// ===== Stats bar =====
function updateStats() {
  const national = trackingStore.getNationalDexCaught();
  const total    = trackingStore.getTotalCaught();
  const unique   = trackingStore.getUniqueShiny();
  const totSh    = trackingStore.getTotalShiny();
  const games    = trackingStore.getGamesPlayed();

  document.getElementById('stat-national').textContent = national;
  document.getElementById('stat-total').textContent    = total;
  document.getElementById('stat-shiny').textContent    = '✨ ' + unique;
  document.getElementById('stat-shiny-total').textContent = totSh + ' total';
  document.getElementById('stat-games').textContent    = games;

  ['sc-national','sc-total','sc-shiny','sc-games'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('has-data', national > 0 || total > 0 || unique > 0 || games > 0);
  });

  // filter badges
  const allPokemon = store.getAll();
  let inRange = getPokemonForContext(allPokemon);

  // Apply search query to badge counts too
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    inRange = inRange.filter(p =>
      p.name.toLowerCase().includes(q) ||
      String(p.id).includes(q) ||
      ('#' + String(p.id).padStart(3,'0')).includes(q)
    );
  }

  const caught = inRange.filter(p => isCaughtInCtx(p.id));
  const shiny  = inRange.filter(p => isShinyInCtx(p.id));

  setEl('fc-all',          inRange.length);
  setEl('fc-caught',       caught.length);
  setEl('fc-missing',      inRange.length - caught.length);
  setEl('fc-shiny',        shiny.length);
  setEl('fc-shiny-missing',inRange.length - shiny.length);
}

// ===== Sidebar =====
function renderSidebar() {
  renderGamesSubtracker();
  renderRegionsSubtracker();
  renderMilestones();
}

function renderGamesSubtracker() {
  const el = document.getElementById('games-subtracker');
  let html = '';
  for (const g of ALL_GAMES) {
    const limit   = GAME_DEX_LIMITS[g.key] || 0;
    const caught  = trackingStore.getCaughtForGame(g.key);
    const pct     = limit > 0 ? Math.min((caught / limit) * 100, 100) : 0;
    const isActive = selectedGame === g.key;
    const color = VERSION_DATA[g.key]?.color || '#888';
    html += `
      <div class="sub-tracker-item${isActive ? ' active' : ''}" data-game="${g.key}" role="button" tabindex="0">
        <div class="sub-tracker-header">
          <span class="sub-tracker-name" style="${isActive ? `color:${color}` : ''}">${g.label}</span>
          <span class="sub-tracker-count">${caught}/${limit}</span>
        </div>
        <div class="sub-tracker-bar-bg">
          <div class="sub-tracker-bar-fill${caught === 0 ? ' dim' : ''}" style="width:${pct}%;${caught > 0 ? `background:linear-gradient(90deg,${color},${color}aa)` : ''}"></div>
        </div>
      </div>`;
  }
  el.innerHTML = html;
}

function renderRegionsSubtracker() {
  const el = document.getElementById('regions-subtracker');
  let html = '';
  for (const [key, r] of Object.entries(REGIONS)) {
    const total  = r.maxId - r.minId + 1;
    const caught = trackingStore.getCaughtForRegion(r.minId, r.maxId);
    const pct    = Math.min((caught / total) * 100, 100);
    const isActive = selectedRegion === key;
    html += `
      <div class="sub-tracker-item${isActive ? ' active' : ''}" data-region="${key}" role="button" tabindex="0">
        <div class="sub-tracker-header">
          <span class="sub-tracker-name">${r.name}</span>
          <span class="sub-tracker-count">${caught}/${total}</span>
        </div>
        <div class="sub-tracker-bar-bg">
          <div class="sub-tracker-bar-fill${caught === 0 ? ' dim' : ''}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }
  el.innerHTML = html;
}

function renderMilestones() {
  const el      = document.getElementById('milestones-tracker');
  const unique  = trackingStore.getUniqueCaughtCount();
  let html = '';
  for (const goal of MILESTONES) {
    const done   = unique >= goal;
    const pct    = Math.min((unique / goal) * 100, 100);
    html += `
      <div class="milestone-item${done ? ' done' : ''}">
        <div class="milestone-header">
          <span class="milestone-label">${goal} unique caught</span>
          ${done
            ? '<span class="milestone-done-badge">✓ Done</span>'
            : `<span class="milestone-count">${unique}/${goal}</span>`}
        </div>
        <div class="milestone-bar-bg">
          <div class="milestone-bar-fill" style="width:${done ? 100 : pct}%"></div>
        </div>
      </div>`;
  }
  el.innerHTML = html;
}

// ===== Context helpers =====
function getPokemonForContext(all) {
  if (selectedGame) {
    const limit = GAME_DEX_LIMITS[selectedGame] || 1025;
    return all.filter(p => p.id <= limit);
  }
  if (selectedRegion) {
    const r = REGIONS[selectedRegion];
    return all.filter(p => p.id >= r.minId && p.id <= r.maxId);
  }
  return all;
}

function isCaughtInCtx(pokemonId) {
  if (selectedGame) return trackingStore.isCaught(selectedGame, pokemonId);
  return trackingStore.isCaughtAny(pokemonId);
}

function isShinyInCtx(pokemonId) {
  if (selectedGame) return trackingStore.isShiny(selectedGame, pokemonId);
  return trackingStore.isShinyAny(pokemonId);
}

// ===== Filtering =====
function getFilteredList() {
  const all  = store.getAll();
  let list   = getPokemonForContext(all);

  // search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      String(p.id).includes(q) ||
      ('#' + String(p.id).padStart(3,'0')).includes(q)
    );
  }

  // track filter
  switch (trackFilter) {
    case 'caught':
      list = list.filter(p => isCaughtInCtx(p.id)); break;
    case 'missing':
      list = list.filter(p => !isCaughtInCtx(p.id)); break;
    case 'shiny':
      list = list.filter(p => isShinyInCtx(p.id)); break;
    case 'shiny-missing':
      list = list.filter(p => !isShinyInCtx(p.id)); break;
  }

  list.sort((a,b) => a.id - b.id);
  return list;
}

// ===== Render Table =====
function renderTable() {
  const filtered   = getFilteredList();
  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start    = (currentPage - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);

  // result count
  if (store.fullyLoaded) {
    resultCount.innerHTML = `<strong>${start + 1}–${Math.min(start + PER_PAGE, total)}</strong> of <strong>${total}</strong>`;
  } else {
    resultCount.innerHTML = `Loading… (${store.getAll().length} loaded)`;
  }

  noResults.hidden = total > 0 || store.isLoading;
  tableBody.innerHTML = pageItems.map(p => createRow(p)).join('');
  renderPagination(totalPages);
  updateStats();
}

function createRow(p) {
  const caught   = isCaughtInCtx(p.id);
  const shiny    = isShinyInCtx(p.id);
  const note     = trackingStore.getNote(p.id);
  const idStr    = '#' + String(p.id).padStart(4,'0');

  // sprite: greyed out unless caught in current context
  const spriteClass = caught ? 'row-sprite caught' : 'row-sprite';

  // shiny badge: clickable only in game view when caught
  let shinyBtnHtml = '';
  if (selectedGame && !NO_SHINY_GAMES.has(selectedGame)) {
    const shinyClass = `shiny-badge${shiny ? ' active' : ''} clickable`;
    shinyBtnHtml = `<span class="${shinyClass}" data-shiny-id="${p.id}" data-shiny-game="${selectedGame}" title="Toggle shiny">✨</span>`;
  } else if (shiny) {
    shinyBtnHtml = `<span class="shiny-badge active" title="Shiny caught!">✨</span>`;
  } else {
    shinyBtnHtml = `<span class="shiny-badge" style="visibility:hidden">✨</span>`;
  }

  const typesHtml = (p.types || []).map(t => {
    const c = TYPE_COLORS[t] || { bg:'#888', text:'#fff' };
    return `<span class="type-pill-small" style="background:${c.bg};color:${c.text}">${capitalize(t)}</span>`;
  }).join('');

  const notePreview = note ? `<span class="notes-preview" title="${escHtml(note)}">${escHtml(note)}</span>` : `<span style="color:var(--text-muted);font-style:italic;font-size:0.75rem">—</span>`;

  // Row class
  const rowClass = caught ? 'caught-row' : '';

  // data attrs for click handling
  return `
    <tr class="${rowClass}" data-pokemon-id="${p.id}">
      <td class="td-id">${idStr}</td>
      <td class="td-sprite">
        <div class="sprite-wrap">
          <img class="${spriteClass}" src="${p.spriteSmall || p.sprite}" alt="${p.name}" loading="lazy">
        </div>
      </td>
      <td class="td-shiny">${shinyBtnHtml}</td>
      <td class="td-name${caught ? '' : ' uncaught'}">${capitalize(p.name)}</td>
      <td class="td-type">${typesHtml}</td>
      <td class="td-notes">${notePreview}</td>
      <td class="td-view">
        <button class="view-btn" data-view-id="${p.id}" title="Open Pokémon details">View</button>
      </td>
    </tr>`;
}

// ===== Pagination =====
function renderPagination(totalPages) {
  if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

  const visible = 5;
  let pages = [];
  if (totalPages <= visible + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    let s = Math.max(2, currentPage - 2);
    let e = Math.min(totalPages - 1, currentPage + 2);
    if (currentPage <= 3) { s = 2; e = Math.min(6, totalPages - 1); }
    else if (currentPage >= totalPages - 2) { s = Math.max(2, totalPages - 5); e = totalPages - 1; }
    if (s > 2) pages.push('...');
    for (let i = s; i <= e; i++) pages.push(i);
    if (e < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  let html = `<button class="page-btn-t page-arrow" ${currentPage===1?'disabled':''} data-page="${currentPage-1}">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
  </button>`;
  for (const p of pages) {
    if (p === '...') { html += `<span class="page-ellipsis-t">…</span>`; }
    else { html += `<button class="page-btn-t${p===currentPage?' active':''}" data-page="${p}">${p}</button>`; }
  }
  html += `<button class="page-btn-t page-arrow" ${currentPage===totalPages?'disabled':''} data-page="${currentPage+1}">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
  </button>`;
  paginationEl.innerHTML = html;
}

// ===== Context badge =====
function updateContextBadge() {
  if (selectedGame) {
    const g = VERSION_DATA[selectedGame];
    contextLabel.textContent = (g?.name || selectedGame) + ' — click row to instantly catch';
    contextBadge.hidden = false;
  } else if (selectedRegion) {
    const r = REGIONS[selectedRegion];
    contextLabel.textContent = r.name + ' Region';
    contextBadge.hidden = false;
  } else {
    contextBadge.hidden = true;
  }
}

// ===== Tracker Modal =====
function openTrackerModal(pokemonId) {
  const p = store.getById(pokemonId);
  if (!p) return;

  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('visible'));
  document.body.style.overflow = 'hidden';
  modalBody.innerHTML = renderTrackerModalContent(p);

  // Wire up notes save
  const textarea  = document.getElementById('modal-notes-ta');
  const saveBtn   = document.getElementById('modal-notes-save');
  const savedFlash = document.getElementById('modal-saved-flash');

  if (saveBtn && textarea) {
    saveBtn.addEventListener('click', () => {
      trackingStore.setNote(p.id, textarea.value);
      if (savedFlash) { savedFlash.classList.add('show'); setTimeout(() => savedFlash.classList.remove('show'), 1500); }
    });
  }
}

function closeTrackerModal() {
  modal.classList.remove('visible');
  setTimeout(() => {
    modal.hidden = true;
    modalBody.innerHTML = '';
    document.body.style.overflow = '';
  }, 300);
}

function renderTrackerModalContent(p) {
  const note   = trackingStore.getNote(p.id);
  const sprite = p.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;

  const typesHtml = (p.types || []).map(t => {
    const c = TYPE_COLORS[t] || { bg:'#888', text:'#fff' };
    return `<span class="type-pill-small" style="background:${c.bg};color:${c.text};margin-right:5px">${capitalize(t)}</span>`;
  }).join('');

  // Only show games where this Pokemon could exist (id <= game's limit)
  const availableGames = ALL_GAMES.filter(g => p.id <= (GAME_DEX_LIMITS[g.key] || 0));

  const gamesHtml = availableGames.length > 0
    ? `<div class="game-tracking-grid">${availableGames.map(g => renderGameCard(p.id, g)).join('')}</div>`
    : `<p style="color:var(--text-muted);font-size:0.85rem">No game data available.</p>`;

  return `
    <div class="modal-poke-header" style="--detail-color:${TYPE_COLORS[p.types?.[0]]?.bg || '#888'}">
      <img class="modal-poke-sprite" src="${sprite}" alt="${p.name}">
      <div class="modal-poke-info">
        <div class="modal-poke-id">${'#' + String(p.id).padStart(4,'0')}</div>
        <div class="modal-poke-name">${capitalize(p.name)}</div>
        <div class="modal-poke-types">${typesHtml}</div>
      </div>
      <button onclick="window.openFullTrackerDetail(${p.id})" class="view-btn" style="align-self:center; border:none; cursor:pointer;">Full Info</button>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Notes</div>
      <textarea class="notes-textarea" id="modal-notes-ta" placeholder="Add personal notes for ${capitalize(p.name)}…">${escHtml(note)}</textarea>
      <div style="display:flex;align-items:center;margin-top:8px">
        <button class="notes-save-btn" id="modal-notes-save">Save Note</button>
        <span class="notes-saved-flash" id="modal-saved-flash">✓ Saved!</span>
      </div>
    </div>

    <div class="modal-section" style="border-bottom:none">
      <div class="modal-section-title">Catch Tracking — Per Game</div>
      <p style="color:var(--text-muted);font-size:0.78rem;margin-bottom:12px">Only showing games where ${capitalize(p.name)} can be obtained.</p>
      ${gamesHtml}
    </div>`;
}

function renderGameCard(pokemonId, game) {
  const caught = trackingStore.isCaught(game.key, pokemonId);
  const shiny  = trackingStore.isShiny(game.key, pokemonId);
  const noShiny = NO_SHINY_GAMES.has(game.key);
  const color = VERSION_DATA[game.key]?.color || '#888';

  return `
    <div class="game-track-card${caught ? ' caught-card' : ''}" id="gtc-${game.key}-${pokemonId}">
      <div class="game-track-header">
        <span class="game-track-name" style="${caught ? `color:${color}` : ''}">${game.label}</span>
        <div class="game-track-toggles">
          <button class="track-toggle-btn caught-btn${caught ? ' on' : ''}"
            onclick="window.trackerToggleCaught('${game.key}', ${pokemonId})"
            title="Toggle Caught">
            ${caught ? '✓ Caught' : '○ Catch'}
          </button>
          ${!noShiny ? `
            <button class="track-toggle-btn shiny-btn${shiny ? ' on' : ''}"
              onclick="window.trackerToggleShiny('${game.key}', ${pokemonId})"
              title="Toggle Shiny" ${!caught ? 'disabled style="opacity:0.4"' : ''}>
              ${shiny ? '✨ Shiny' : '✨'}
            </button>` : ''}
        </div>
      </div>
    </div>`;
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Search
  searchEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery  = searchEl.value.trim();
      currentPage  = 1;
      renderTable();
      updateStats();
    }, 280);
  });

  // Tracking filter buttons — use delegation so it works after any DOM re-render
  document.getElementById('tracker-sidebar').addEventListener('click', e => {
    const btn = e.target.closest('.tracking-filter-btn');
    if (!btn) return;
    document.querySelectorAll('.tracking-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    trackFilter = btn.dataset.filter;
    currentPage = 1;
    renderTable();
  });

  // Game sub-tracker clicks (delegated)
  document.getElementById('games-subtracker').addEventListener('click', e => {
    const item = e.target.closest('[data-game]');
    if (!item) return;
    const key = item.dataset.game;
    if (selectedGame === key) {
      selectedGame = null;
    } else {
      selectedGame   = key;
      selectedRegion = null;
    }
    currentPage = 1;
    updateContextBadge();
    renderSidebar();
    renderTable();
  });

  // Region sub-tracker clicks (delegated)
  document.getElementById('regions-subtracker').addEventListener('click', e => {
    const item = e.target.closest('[data-region]');
    if (!item) return;
    const key = item.dataset.region;
    if (selectedRegion === key) {
      selectedRegion = null;
    } else {
      selectedRegion = key;
      selectedGame   = null;
    }
    currentPage = 1;
    updateContextBadge();
    renderSidebar();
    renderTable();
  });

  // Clear context — also exposed as window.clearTrackerContext for inline onclick
  const doClearContext = () => {
    selectedGame   = null;
    selectedRegion = null;
    trackFilter    = 'all';
    // Reset filter button active states to "All Pokémon"
    document.querySelectorAll('.tracking-filter-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.tracking-filter-btn[data-filter="all"]');
    if (allBtn) allBtn.classList.add('active');
    updateContextBadge();
    renderSidebar();
    renderTable();
  };
  if (clearContextBtn) clearContextBtn.addEventListener('click', doClearContext);
  window.clearTrackerContext = doClearContext;

  // Table clicks (delegated from tbody)
  tableBody.addEventListener('click', e => {
    // Shiny badge (game view only)
    const shinyBadge = e.target.closest('[data-shiny-id]');
    if (shinyBadge) {
      e.stopPropagation();
      const id   = parseInt(shinyBadge.dataset.shinyId);
      const game = shinyBadge.dataset.shinyGame;
      if (!trackingStore.isCaught(game, id)) return; // must be caught first
      trackingStore.toggleShiny(game, id);
      return;
    }

    // View button
    const viewBtn = e.target.closest('.view-btn');
    if (viewBtn) {
      e.stopPropagation();
      return; // handled by href or separate
    }

    // Row click
    const row = e.target.closest('tr[data-pokemon-id]');
    if (!row) return;
    const id = parseInt(row.dataset.pokemonId);
    if (!id) return;

    if (selectedGame) {
      // Instant toggle in game view
      trackingStore.toggleCaught(selectedGame, id);
    } else {
      // Open tracker modal in main/region view
      openTrackerModal(id);
    }
  });

  // View button delegation (opened from table)
  tableBody.addEventListener('click', e => {
    const viewBtn = e.target.closest('.view-btn[data-view-id]');
    if (!viewBtn) return;
    e.stopPropagation();
    const id = parseInt(viewBtn.dataset.viewId);
    if (id) openTrackerModal(id);
  });

  // Pagination
  paginationEl.addEventListener('click', e => {
    const btn = e.target.closest('.page-btn-t');
    if (!btn || btn.disabled) return;
    const page = parseInt(btn.dataset.page);
    if (!isNaN(page)) {
      currentPage = page;
      renderTable();
      document.getElementById('tracker-content').scrollIntoView({ behavior:'smooth', block:'start' });
    }
  });

  // Modal close
  modalClose.addEventListener('click', closeTrackerModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeTrackerModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeTrackerModal(); });

  // Export
  document.getElementById('export-btn').addEventListener('click', () => {
    const data = trackingStore.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `poketracker-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import
  document.getElementById('import-btn').addEventListener('click', () => {
    if (confirm('⚠️ Importing will REPLACE your entire current progress. This cannot be undone. Continue?')) {
      importInput.click();
    }
  });

  importInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        trackingStore.importData(ev.target.result);
        alert('✓ Import successful! Your progress has been restored.');
      } catch (err) {
        alert('✗ Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset file input
  });
}

// ===== Global Handlers (called from inline onclick in modal) =====
window.trackerToggleCaught = function(game, pokemonId) {
  trackingStore.toggleCaught(game, pokemonId);
  // Refresh the game card in the modal
  const cardEl = document.getElementById(`gtc-${game}-${pokemonId}`);
  if (cardEl) {
    const p = store.getById(pokemonId);
    if (p) {
      const g = ALL_GAMES.find(x => x.key === game);
      if (g) cardEl.outerHTML = renderGameCard(pokemonId, g);
    }
  }
};

window.trackerToggleShiny = function(game, pokemonId) {
  if (!trackingStore.isCaught(game, pokemonId)) return;
  trackingStore.toggleShiny(game, pokemonId);
  const cardEl = document.getElementById(`gtc-${game}-${pokemonId}`);
  if (cardEl) {
    const g = ALL_GAMES.find(x => x.key === game);
    if (g) cardEl.outerHTML = renderGameCard(pokemonId, g);
  }
};

// ===== Utilities =====
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

// --- Support switching in full detail ---
window.openModal = (id) => openTrackerModal(id);
window.currentPokemonId = 0; // expected by pokemonDetail.js

window.openFullTrackerDetail = async function(id) {
  window.currentPokemonId = id;
  const html = await renderPokemonDetail(id, false);
  document.getElementById('tracker-modal-body').innerHTML = html;
};

// ===== Go =====
init().catch(err => console.error('Tracker init failed:', err));
