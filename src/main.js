import './styles/main.css';
import { store } from './js/dataStore.js';
import { filterManager } from './js/filters.js';
import { fetchAllTypes, fetchAllGenerations } from './js/api.js';
import { createPokemonCard, createSkeletonCard } from './js/components/pokemonCard.js';
import { renderPokemonDetail } from './js/components/pokemonDetail.js';
import { TYPE_COLORS, GENERATION_LABELS, GAME_GROUPS } from './js/constants.js';

// ===== Config =====
const PER_PAGE = 40;

// ===== DOM Elements =====
const grid = document.getElementById('pokemon-grid');
const searchInput = document.getElementById('search-input');
const loadingIndicator = document.getElementById('loading-indicator');
const noResults = document.getElementById('no-results');
const resultCount = document.getElementById('result-count');
const sortSelect = document.getElementById('sort-select');
const filterToggle = document.getElementById('filter-toggle');
const filterSidebar = document.getElementById('filter-sidebar');
const filterBadge = document.getElementById('filter-badge');
const typeFilterOptions = document.getElementById('type-filter-options');
const genFilterOptions = document.getElementById('gen-filter-options');
const gameFilterOptions = document.getElementById('game-filter-options');
const activeFiltersWrap = document.getElementById('active-filters');
const activeFilterTags = document.getElementById('active-filter-tags');
const clearAllBtn = document.getElementById('clear-all-filters');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const modal = document.getElementById('detail-modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const paginationContainer = document.getElementById('pagination');
const progressBar = document.getElementById('load-progress-bar');
const progressText = document.getElementById('load-progress-text');
const progressWrap = document.getElementById('load-progress');

let debounceTimer = null;
let currentPage = 1;

// ===== Init =====
async function init() {
  showSkeletons(12);
  await populateFilterUI();
  setupEventListeners();

  // Load all pokemon progressively
  store.loadAll((loaded, total) => {
    // Update progress bar
    const pct = Math.round((loaded / total) * 100);
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressText) progressText.textContent = `Loading Pokémon... ${loaded} / ${total}`;
    // Re-render grid as data comes in
    renderGrid();
  }).then(async () => {
    // All pokemon loaded, now load evolution chains in background
    if (progressWrap) progressWrap.hidden = true;
    renderGrid();
    await store.loadAllEvolutionStages();
    renderGrid();
  }).catch(err => {
    console.error('CRITICAL: Failed to load all Pokémon:', err);
    if (resultCount) resultCount.textContent = 'Failed to load Pokémon. Please check console for details.';
  });
}

// ===== Populate Filter UI =====
async function populateFilterUI() {
  try {
    const types = await fetchAllTypes();
    typeFilterOptions.innerHTML = types.map(t => {
      const color = TYPE_COLORS[t.name];
      return `<button class="type-filter-btn" data-type="${t.name}" style="background:${color?.bg || '#888'};color:${color?.text || '#fff'}">${capitalize(t.name)}</button>`;
    }).join('');
  } catch (e) {
    console.error('Failed to load types', e);
  }

  try {
    const gens = await fetchAllGenerations();
    genFilterOptions.innerHTML = gens.map(g => {
      const label = GENERATION_LABELS[g.name] || g.name;
      return `<button class="gen-filter-btn" data-gen="${g.name}">${label}</button>`;
    }).join('');
  } catch (e) {
    console.error('Failed to load generations', e);
  }

  gameFilterOptions.innerHTML = Object.entries(GAME_GROUPS).map(([group, games]) => {
    return `
      <div class="game-group-label">${group}</div>
      ${games.map(g => `<button class="game-filter-btn" data-game="${g}">${capitalize(g.replace(/-/g, ' '))}</button>`).join('')}
    `;
  }).join('');
}

// ===== Show Skeletons =====
function showSkeletons(count) {
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    grid.appendChild(createSkeletonCard());
  }
}

// ===== Render Grid with Pagination =====
function renderGrid() {
  const all = store.getAll();
  const sort = sortSelect.value;
  let filtered = filterManager.applyFilters(all);
  filtered = sortPokemon(filtered, sort);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PER_PAGE));

  // Clamp current page
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * PER_PAGE;
  const pageItems = filtered.slice(startIdx, startIdx + PER_PAGE);

  grid.innerHTML = '';
  noResults.hidden = totalFiltered > 0 || store.isLoading;
  loadingIndicator.hidden = !store.isLoading || totalFiltered > 0;

  const loadedTotal = all.length;
  if (store.fullyLoaded) {
    resultCount.innerHTML = `Showing <strong>${startIdx + 1}–${Math.min(startIdx + PER_PAGE, totalFiltered)}</strong> of <strong>${totalFiltered}</strong> Pokémon`;
  } else {
    resultCount.innerHTML = `Showing <strong>${pageItems.length}</strong> — loading... (${loadedTotal} loaded)`;
  }

  for (const pokemon of pageItems) {
    grid.appendChild(createPokemonCard(pokemon));
  }

  renderPagination(totalPages, totalFiltered);
  updateFilterUI();
}

// ===== Pagination =====
function renderPagination(totalPages, totalItems) {
  if (!paginationContainer) return;

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    paginationContainer.hidden = true;
    return;
  }

  paginationContainer.hidden = false;
  const maxVisible = 7;
  let pages = [];

  if (totalPages <= maxVisible + 2) {
    // Show all pages
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    // Smart pagination: 1 ... 4 5 6 ... 26
    pages.push(1);
    let start = Math.max(2, currentPage - 2);
    let end = Math.min(totalPages - 1, currentPage + 2);

    if (currentPage <= 4) {
      start = 2;
      end = Math.min(6, totalPages - 1);
    } else if (currentPage >= totalPages - 3) {
      start = Math.max(2, totalPages - 5);
      end = totalPages - 1;
    }

    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  let html = `
    <button class="page-btn page-arrow" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
  `;

  for (const p of pages) {
    if (p === '...') {
      html += `<span class="page-ellipsis">…</span>`;
    } else {
      html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
  }

  html += `
    <button class="page-btn page-arrow" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  `;

  paginationContainer.innerHTML = html;
}

function sortPokemon(list, sort) {
  const sorted = [...list];
  switch (sort) {
    case 'id-asc': sorted.sort((a, b) => a.id - b.id); break;
    case 'id-desc': sorted.sort((a, b) => b.id - a.id); break;
    case 'name-asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'name-desc': sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
  }
  return sorted;
}

// ===== Update Active Filter Tags =====
function updateFilterUI() {
  const tags = filterManager.activeTags;
  const count = filterManager.activeCount;

  if (filterBadge) {
    if (count > 0) {
      filterBadge.hidden = false;
      filterBadge.textContent = count;
    } else {
      filterBadge.hidden = true;
    }
  }

  if (activeFiltersWrap && activeFilterTags) {
    if (tags.length > 0) {
      activeFiltersWrap.hidden = false;
      activeFilterTags.innerHTML = tags.map(t =>
        `<span class="filter-tag">${t.label}<button class="filter-tag-remove" data-key="${t.key}" data-value="${t.value}">&times;</button></span>`
      ).join('');
    } else {
      activeFiltersWrap.hidden = true;
    }
  }

  const setCount = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '';
  };

  setCount('type-count', filterManager.filters.types.length);
  setCount('stage-count', filterManager.filters.stages.length);
  setCount('gen-count', filterManager.filters.generation ? '1' : '');
  setCount('game-count', filterManager.filters.game ? '1' : '');
  setCount('cat-count', filterManager.filters.categories.length);

  document.querySelectorAll('[data-filter="stage"]').forEach(cb => {
    cb.checked = filterManager.filters.stages.includes(cb.value);
  });
  document.querySelectorAll('[data-filter="category"]').forEach(cb => {
    cb.checked = filterManager.filters.categories.includes(cb.value);
  });
  document.querySelectorAll('.type-filter-btn').forEach(btn => {
    btn.classList.toggle('active', filterManager.filters.types.includes(btn.dataset.type));
  });
  document.querySelectorAll('.gen-filter-btn').forEach(btn => {
    btn.classList.toggle('active', filterManager.filters.generation === btn.dataset.gen);
  });
  document.querySelectorAll('.game-filter-btn').forEach(btn => {
    btn.classList.toggle('active', filterManager.filters.game === btn.dataset.game);
  });

  if (searchInput.value.trim().toLowerCase() !== filterManager.filters.search) {
    searchInput.value = filterManager.filters.search;
  }
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Search with debounce
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      filterManager.setSearch(searchInput.value);
      currentPage = 1; // Reset to page 1 on search
      renderGrid();
    }, 300);
  });

  // Keyboard shortcut for search
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === 'Escape') {
      if (!modal.hidden) closeModal();
      else if (filterSidebar.classList.contains('open')) closeSidebar();
    }
  });

  // Type filter
  typeFilterOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.type-filter-btn');
    if (!btn) return;
    filterManager.toggleType(btn.dataset.type);
    currentPage = 1;
    renderGrid();
  });

  // Stage filter
  document.getElementById('stage-filter-options').addEventListener('change', (e) => {
    if (e.target.dataset.filter === 'stage') {
      filterManager.toggleStage(e.target.value);
      currentPage = 1;
      renderGrid();
    }
  });

  // Category filter
  document.getElementById('cat-filter-options').addEventListener('change', (e) => {
    if (e.target.dataset.filter === 'category') {
      filterManager.toggleCategory(e.target.value);
      currentPage = 1;
      renderGrid();
    }
  });

  // Generation filter
  genFilterOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.gen-filter-btn');
    if (!btn) return;
    filterManager.setGeneration(btn.dataset.gen);
    currentPage = 1;
    renderGrid();
  });

  // Game filter
  gameFilterOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.game-filter-btn');
    if (!btn) return;
    filterManager.setGame(btn.dataset.game);
    currentPage = 1;
    renderGrid();
  });

  // Clear all
  clearAllBtn.addEventListener('click', () => {
    filterManager.clearAll();
    searchInput.value = '';
    currentPage = 1;
    renderGrid();
  });

  // Reset from no-results
  resetFiltersBtn.addEventListener('click', () => {
    filterManager.clearAll();
    searchInput.value = '';
    currentPage = 1;
    renderGrid();
  });

  // Remove individual filter tag
  activeFilterTags.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tag-remove');
    if (!btn) return;
    filterManager.removeFilter(btn.dataset.key, btn.dataset.value);
    if (btn.dataset.key === 'search') searchInput.value = '';
    currentPage = 1;
    renderGrid();
  });

  // Sort
  sortSelect.addEventListener('change', () => {
    currentPage = 1;
    renderGrid();
  });

  // Pagination clicks
  paginationContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.page-btn');
    if (!btn || btn.disabled) return;
    const page = parseInt(btn.dataset.page);
    if (isNaN(page)) return;
    currentPage = page;
    renderGrid();
    // Scroll to top of grid
    document.getElementById('pokemon-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Card click → open detail
  grid.addEventListener('click', async (e) => {
    const card = e.target.closest('.pokemon-card');
    if (!card) return;
    const id = parseInt(card.dataset.pokemonId);
    if (!id) return;
    openModal(id);
  });

  // Modal close
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Evo-member click inside modal
  modalBody.addEventListener('click', async (e) => {
    const evoMember = e.target.closest('.evo-member');
    if (!evoMember) return;
    const id = parseInt(evoMember.dataset.pokemonId);
    if (!id) return;
    if (!store.getById(id)) {
      const { fetchPokemon, fetchSpecies } = await import('./js/api.js');
      try {
        const [pokemon, species] = await Promise.all([fetchPokemon(id), fetchSpecies(id)]);
        const normalized = store.normalizePokemon(pokemon, species);
        store.pokemon.set(normalized.id, normalized);
      } catch (err) {
        console.warn('Could not load evolution pokémon', id, err);
        return;
      }
    }
    openModal(id);
  });

  // Mobile filter toggle
  filterToggle.addEventListener('click', toggleSidebar);
}

// ===== Modal =====
async function openModal(id) {
  window.currentPokemonId = id;
  modal.hidden = false;
  requestAnimationFrame(() => {
    modal.classList.add('visible');
  });
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

// ===== Sidebar =====
let overlay = null;

function toggleSidebar() {
  filterSidebar.classList.toggle('open');
  if (filterSidebar.classList.contains('open')) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      overlay.addEventListener('click', closeSidebar);
      document.body.appendChild(overlay);
    }
    requestAnimationFrame(() => overlay.classList.add('visible'));
  } else {
    closeSidebar();
  }
}

function closeSidebar() {
  filterSidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');
}

// ===== Utilities =====
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ===== Start App =====
init().catch(err => {
  console.error('App initialization failed:', err);
  resultCount.textContent = 'Failed to load Pokémon. Please refresh.';
});
