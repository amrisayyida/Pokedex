import './styles/main.css';
import './styles/generator.css';
import { store } from './js/dataStore.js';
import { fetchAllTypes } from './js/api.js';
import { createPokemonCard } from './js/components/pokemonCard.js';
import { renderPokemonDetail } from './js/components/pokemonDetail.js';

// ===== DOM Elements =====
const generateBtn = document.getElementById('generate-btn');
const resultsArea = document.getElementById('results-area');
const teamSizeSelect = document.getElementById('team-size-select');
const regionSelect = document.getElementById('region-select');
const typeSelect = document.getElementById('type-select');
const legendarySelect = document.getElementById('legendary-select');
const stageSelect = document.getElementById('stage-select');
const evolvedSelect = document.getElementById('evolved-select');
const displaySelect = document.getElementById('display-select');
const shinyCheckbox = document.getElementById('forms-select'); // Used as checkbox logic or select
const gendersCheckbox = document.getElementById('genders-checkbox');
const naturesCheckbox = document.getElementById('natures-checkbox');

const modal = document.getElementById('detail-modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

// ===== Init =====
async function init() {
  await populateFilterUI();
  setupEventListeners();

  // Load essential data
  store.loadAll().then(() => {
    store.loadAllEvolutionStages();
  });
}

// ===== Populate Filter UI =====
async function populateFilterUI() {
  try {
    const types = await fetchAllTypes();
    typeSelect.innerHTML = '<option value="">All Types</option>' + types.map(t => {
      return `<option value="${t.name}">${capitalize(t.name)}</option>`;
    }).join('');
  } catch (e) {
    console.error('Failed to load types', e);
  }
}

// ===== Generator Logic =====
function generatePokemon() {
  const allPokemon = store.getAll();
  
  if (allPokemon.length === 0) {
    resultsArea.innerHTML = `
      <div class="placeholder-content">
        <div class="spinner" style="margin-bottom: 20px"></div>
        <p>Loading Pokedex data... please wait.</p>
      </div>
    `;
    return;
  }

  // Custom Filter Logic for New UI
  const filtered = allPokemon.filter(pokemon => {
    // Region (Generation)
    const region = regionSelect.value;
    if (region && pokemon.generation !== region) return false;

    // Type
    const type = typeSelect.value;
    if (type && !pokemon.types.includes(type)) return false;

    // Legendary/Mythical
    const legendary = legendarySelect.value;
    if (legendary === 'legendary' && !pokemon.isLegendary) return false;
    if (legendary === 'mythical' && !pokemon.isMythical) return false;
    if (legendary === 'neither' && (pokemon.isLegendary || pokemon.isMythical)) return false;

    // Stage
    const stage = stageSelect.value;
    if (stage && pokemon.evolutionStage !== stage) return false;

    // Fully Evolved Logic
    const evolved = evolvedSelect.value;
    if (evolved && pokemon.evolutionChain) {
      const currentMember = pokemon.evolutionChain.find(m => m.id === pokemon.id);
      if (currentMember) {
        const hasNext = pokemon.evolutionChain.some(member => member.stage > currentMember.stage);
        if (evolved === 'final' && hasNext) return false;
        if (evolved === 'not-final' && !hasNext) return false;
      }
    }

    return true;
  });

  if (filtered.length === 0) {
    resultsArea.innerHTML = `
      <div class="placeholder-content">
        <div class="placeholder-icon">☹</div>
        <p>No Pokémon match your filters. Try something else!</p>
      </div>
    `;
    return;
  }

  // Cleanup Results Area
  resultsArea.innerHTML = '';
  const count = parseInt(teamSizeSelect.value);
  resultsArea.classList.toggle('single-mode', count === 1);
  
  // Apply Display Mode classes
  const displayMode = displaySelect.value;
  resultsArea.classList.toggle('hide-names', displayMode === 'image');
  resultsArea.classList.toggle('hide-images', displayMode === 'name');

  const shuffled = [...filtered].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  for (const pokemon of selected) {
    // Handle Shiny Form logic
    const isShiny = document.getElementById('forms-select').value === 'shiny';
    const pokemonToRender = { ...pokemon };
    if (isShiny) {
       pokemonToRender.sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemon.id}.png`;
    }

    const card = createPokemonCard(pokemonToRender);
    
    // Add Natures/Genders if checked (purely visual for now as requested)
    if (naturesCheckbox.checked || gendersCheckbox.checked) {
       const extraInfo = document.createElement('div');
       extraInfo.className = 'card-extra-info';
       extraInfo.style.fontSize = '0.8rem';
       extraInfo.style.marginTop = '8px';
       extraInfo.style.color = 'var(--text-secondary)';
       
       let text = '';
       if (gendersCheckbox.checked) {
          const gender = Math.random() > 0.5 ? '♂' : '♀';
          text += `Gender: ${gender} `;
       }
       if (naturesCheckbox.checked) {
          const natures = ['Adamant', 'Bashful', 'Bold', 'Brave', 'Calm', 'Careful', 'Docile', 'Gentle', 'Hardy', 'Hasty', 'Impish', 'Jolly', 'Lax', 'Lonely', 'Mild', 'Modest', 'Naive', 'Naughty', 'Quiet', 'Quirky', 'Rash', 'Relaxed', 'Sassy', 'Serious', 'Timid'];
          const nature = natures[Math.floor(Math.random() * natures.length)];
          text += `${text ? '| ' : ''}Nature: ${nature}`;
       }
       extraInfo.textContent = text;
       card.appendChild(extraInfo);
    }

    resultsArea.appendChild(card);
  }
}

// ===== Event Listeners =====
function setupEventListeners() {
  generateBtn.addEventListener('click', generatePokemon);

  // Card click → open detail
  resultsArea.addEventListener('click', async (e) => {
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

  // Keyboard shortcut for escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!modal.hidden) closeModal();
    }
  });
}

// ===== Modal Logic =====
async function openModal(id) {
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

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ===== Start App =====
init().catch(err => {
  console.error('Generator initialization failed:', err);
});
