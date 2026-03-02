/**
 * Shared rendering engine for filtered Pokedex pages
 * (Game Pokedex, Region Pokedex, Generation Pokedex)
 *
 * Usage:
 *   import { initFilteredPokedex } from './pokedexPage.js';
 *   initFilteredPokedex({ title, pokemonList, numberOverrides });
 *
 * pokemonList: Array<{ id: number }>  (in display order)
 * numberOverrides: Map<id, number>   (optional; for regional numbers)
 */

import '../styles/main.css';
import { fetchPokemonBatch } from './api.js';
import { TYPE_COLORS } from './constants.js';
import { renderPokemonDetail } from './components/pokemonDetail.js';
import { store } from './dataStore.js';
import { isExcluded } from './gameExclusions.js';

const PER_PAGE = 40;

let allPokemon = [];        // normalized, in original order
let numberOverrides = null; // Map<id, regionalNumber>
let currentPage = 1;
let searchQuery = '';
let sortMode = 'default';   // 'default' | 'id-asc' | 'id-desc' | 'name-asc' | 'name-desc'

// ---------- DOM refs (assigned after DOMContentLoaded) ----------
let grid, resultCount, noResults, paginationContainer;
let searchInput, sortSelect, loadingWrap, progressBar, progressText;
let modal, modalBody, modalClose;
let filterToggle, sidebar; // Added for filter toggle

// ----------------------------------------------------------------
// Public entry-point
// ----------------------------------------------------------------
/**
 * Initialize the shared Pokedex page
 */
export async function initFilteredPokedex(config) {
  const {
    title,
    pokemonEntries,
    numberOverride,
    sidebarCategory, // 'generation', 'region', or 'game'
    activeKey
  } = config;

  numberOverrides = numberOverride || null;

  // Set title
  document.title = `${title} — Pokédex`;
  const h1 = document.getElementById('page-title');
  if (h1) h1.textContent = title;

  // Render sidebar if category is provided
  if (sidebarCategory) {
    renderSidebar(sidebarCategory, activeKey);
  }

  // Filter out manual exclusions if this is a game pokedex
  const filteredEntries = (sidebarCategory === 'game' && activeKey)
    ? pokemonEntries.filter(p => !isExcluded(p.id, activeKey))
    : pokemonEntries;

  allPokemon = [];
  let pokemonEntriesToLoad = [...filteredEntries];

  // Grab DOM refs
  grid               = document.getElementById('pokemon-grid');
  resultCount        = document.getElementById('result-count');
  noResults          = document.getElementById('no-results');
  paginationContainer = document.getElementById('pagination');
  searchInput        = document.getElementById('search-input');
  sortSelect         = document.getElementById('sort-select');
  loadingWrap        = document.getElementById('load-progress');
  progressBar        = document.getElementById('load-progress-bar');
  progressText       = document.getElementById('load-progress-text');
  modal              = document.getElementById('detail-modal');
  modalBody          = document.getElementById('modal-body');
  modalClose         = document.getElementById('modal-close');
  filterToggle       = document.getElementById('filter-toggle');
  sidebar            = document.getElementById('filter-sidebar');

  setupEventListeners(filterToggle, sidebar);
  showSkeletons(12);

  // Load pokemon data in batches
  const ids = filteredEntries.map(e => e.id);
  const total = ids.length;
  const BATCH = 50;

  const pokemonMap = new Map(); // id -> normalized

  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    try {
      const results = await fetchPokemonBatch(batch, 10);
      for (const { pokemon, species } of results) {
        const normalized = store.normalizePokemon(pokemon, species);
        store.pokemon.set(pokemon.id, normalized);
        pokemonMap.set(pokemon.id, normalized);
      }
    } catch (e) {
      console.warn('Batch failed:', e);
    }

    // Update progress
    const pct = Math.round((pokemonMap.size / total) * 100);
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressText) progressText.textContent = `Loading Pokémon... ${pokemonMap.size} / ${total}`;

    // Rebuild allPokemon in original order each batch
    allPokemon = filteredEntries
      .map(e => pokemonMap.get(e.id))
      .filter(Boolean);
    renderGrid();
  }

  if (loadingWrap) loadingWrap.hidden = true;
  renderGrid();
}


// ----------------------------------------------------------------
// Rendering
// ----------------------------------------------------------------
function getDisplayNumber(pokemon) {
  if (numberOverrides && numberOverrides.has(pokemon.id)) {
    return String(numberOverrides.get(pokemon.id)).padStart(3, '0');
  }
  return String(pokemon.id).padStart(3, '0');
}

function renderGrid() {
  if (!grid) return;

  let list = [...allPokemon];

  // Search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p => p.name.includes(q) || String(p.id).includes(q));
  }

  // Sort
  switch (sortMode) {
    case 'id-asc':    list.sort((a, b) => a.id - b.id); break;
    case 'id-desc':   list.sort((a, b) => b.id - a.id); break;
    case 'name-asc':  list.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'name-desc': list.sort((a, b) => b.name.localeCompare(a.name)); break;
    // 'default' keeps original order (regional / generation order)
  }

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * PER_PAGE;
  const page  = list.slice(start, start + PER_PAGE);

  grid.innerHTML = '';
  noResults.hidden = total > 0;

  if (total > 0) {
    resultCount.innerHTML = `Showing <strong>${start + 1}–${Math.min(start + PER_PAGE, total)}</strong> of <strong>${total}</strong> Pokémon`;
  }

  for (const p of page) {
    grid.appendChild(createCard(p));
  }

  renderPagination(totalPages);
}

function createCard(pokemon) {
  const card = document.createElement('div');
  card.className = 'pokemon-card';
  card.dataset.pokemonId = pokemon.id;

  const primaryType = pokemon.types[0];
  const typeColor   = TYPE_COLORS[primaryType]?.bg || '#888';
  card.style.setProperty('--type-color', typeColor);

  const displayNum = getDisplayNumber(pokemon);

  card.innerHTML = `
    <div class="card-bg-circle"></div>
    <div class="card-id">#${displayNum}</div>
    <div class="card-sprite-wrap">
      <img
        class="card-sprite"
        src="${pokemon.sprite || pokemon.spriteSmall}"
        alt="${pokemon.name}"
        loading="lazy"
        onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png'"
      />
    </div>
    <h3 class="card-name">${capitalize(pokemon.name)}</h3>
    <div class="card-types">
      ${pokemon.types.map(t => `
        <span class="type-pill" style="background:${TYPE_COLORS[t]?.bg || '#888'};color:${TYPE_COLORS[t]?.text || '#fff'}">
          ${capitalize(t)}
        </span>
      `).join('')}
    </div>
  `;

  return card;
}

function showSkeletons(count) {
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'pokemon-card skeleton-card';
    card.innerHTML = `
      <div class="skeleton-id"></div>
      <div class="skeleton-sprite"></div>
      <div class="skeleton-name"></div>
      <div class="skeleton-types">
        <div class="skeleton-pill"></div>
        <div class="skeleton-pill"></div>
      </div>
    `;
    grid.appendChild(card);
  }
}

// ----------------------------------------------------------------
// Pagination
// ----------------------------------------------------------------
function renderPagination(totalPages) {
  if (!paginationContainer) return;
  if (totalPages <= 1) { paginationContainer.hidden = true; paginationContainer.innerHTML = ''; return; }
  paginationContainer.hidden = false;

  const maxVisible = 7;
  let pages = [];

  if (totalPages <= maxVisible + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    let start = Math.max(2, currentPage - 2);
    let end   = Math.min(totalPages - 1, currentPage + 2);
    if (currentPage <= 4)              { start = 2; end = Math.min(6, totalPages - 1); }
    else if (currentPage >= totalPages - 3) { start = Math.max(2, totalPages - 5); end = totalPages - 1; }
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  let html = `<button class="page-btn page-arrow" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
  </button>`;
  for (const p of pages) {
    html += p === '...'
      ? `<span class="page-ellipsis">…</span>`
      : `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
  }
  html += `<button class="page-btn page-arrow" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
  </button>`;

  paginationContainer.innerHTML = html;
}

// ----------------------------------------------------------------
// Modal
// ----------------------------------------------------------------
async function openModal(id) {
  window.currentPokemonId = id;
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('visible'));
  document.body.style.overflow = 'hidden';
  modalBody.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><p>Loading...</p></div>';
  const html = await renderPokemonDetail(id);
  modalBody.innerHTML = html;
}

function closeModal() {
  modal.classList.remove('visible');
  setTimeout(() => {
    modal.hidden = true;
    modalBody.innerHTML = '';
    document.body.style.overflow = '';
  }, 300);
}

window.openModal = openModal;

// ----------------------------------------------------------------
// Event Listeners
// ----------------------------------------------------------------
let debounceTimer = null;

function setupEventListeners(filterToggle, sidebar) {
  // Filter Toggle
  if (filterToggle && sidebar) {
    filterToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }
  // Search
  searchInput?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = searchInput.value.trim().toLowerCase();
      currentPage = 1;
      renderGrid();
    }, 300);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchInput?.focus(); }
    if (e.key === 'Escape' && modal && !modal.hidden) closeModal();
  });

  // Sort
  sortSelect?.addEventListener('change', () => {
    sortMode = sortSelect.value;
    currentPage = 1;
    renderGrid();
  });

  // Pagination
  paginationContainer?.addEventListener('click', e => {
    const btn = e.target.closest('.page-btn');
    if (!btn || btn.disabled) return;
    const page = parseInt(btn.dataset.page);
    if (isNaN(page)) return;
    currentPage = page;
    renderGrid();
    document.getElementById('pokemon-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Card click → modal
  grid?.addEventListener('click', async e => {
    const card = e.target.closest('.pokemon-card');
    if (!card) return;
    const id = parseInt(card.dataset.pokemonId);
    if (!id) return;
    openModal(id);
  });

  // Evo member click inside modal
  modalBody?.addEventListener('click', async e => {
    const evoMember = e.target.closest('.evo-member');
    if (!evoMember) return;
    const id = parseInt(evoMember.dataset.pokemonId);
    if (!id) return;
    openModal(id);
  });

  // Modal close
  modalClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
}

// ----------------------------------------------------------------
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/**
 * Render category-specific sidebar
 */
function renderSidebar(category, activeKey) {
  const sidebarContent = document.getElementById('sidebar-content');
  if (!sidebarContent) return;

  import('./constants.js').then(m => {
    let items = [];
    let baseUrl = '';
    let paramName = '';

    if (category === 'generation') {
      items = Object.entries(m.GENERATION_LABELS).map(([key, label]) => ({ key, label }));
      baseUrl = 'generation-pokedex.html';
      paramName = 'gen';
    } else if (category === 'region') {
      items = Object.entries(m.REGIONS).map(([key, data]) => ({ key, label: data.name }));
      baseUrl = 'pokemon-region-pokedex.html';
      paramName = 'region';
    } else if (category === 'game') {
      items = m.ALL_GAMES.map(g => ({ key: g.key, label: g.label }));
      baseUrl = 'pokemon-game-pokedex.html';
      paramName = 'game';
    }

    sidebarContent.innerHTML = items.map(item => `
      <a href="${baseUrl}?${paramName}=${item.key}" 
         class="category-sidebar-link ${item.key === activeKey ? 'active' : ''}">
        <span class="color-dot"></span>
        ${item.label}
      </a>
    `).join('');
  });
}
