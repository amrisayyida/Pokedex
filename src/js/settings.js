import { ALL_GAMES } from './constants.js';
import { GAME_EXCLUSIONS } from './gameExclusions.js';

// --- State ---
let activeGame = ALL_GAMES[0].key; // Default to first game (Red)
let workingExclusions = JSON.parse(JSON.stringify(GAME_EXCLUSIONS)); // Deep copy for unsaved edits

// --- DOM Refs ---
const tabsContainer = document.getElementById('tabs-container');
const managerEl = document.getElementById('exclusions-manager');
const saveBtn = document.getElementById('save-all-btn');
const resetBtn = document.getElementById('reset-btn');
const toastEl = document.getElementById('toast');
const sectionTitleEl = document.getElementById('section-title');
const contentTitleEl = document.getElementById('content-title');

/**
 * Renders the sidebar tabs for each game.
 */
function renderTabs() {
  tabsContainer.innerHTML = '';
  
  ALL_GAMES.forEach(game => {
    const btn = document.createElement('button');
    btn.className = `gen-tab ${game.key === activeGame ? 'active' : ''}`;
    btn.innerHTML = `
      <div class="tab-indicator"></div>
      <span>${game.label}</span>
    `;
    
    btn.addEventListener('click', () => {
      activeGame = game.key;
      renderTabs();
      renderExclusions();
    });
    
    tabsContainer.appendChild(btn);
  });
}

/**
 * Renders the exclusion editor for the current active game.
 */
function renderExclusions() {
  const game = ALL_GAMES.find(g => g.key === activeGame);
  if (!game) return;

  sectionTitleEl.textContent = `Exclusions for ${game.label}`;
  contentTitleEl.textContent = `${game.label} Settings`;
  
  const list = workingExclusions[game.key] || [];
  const csv = list.join(', ');

  managerEl.innerHTML = `
    <div class="game-exclusion-row">
      <div class="game-info">
        <label for="input-${game.key}">${game.label}</label>
        <span class="game-id-badge">ID: ${game.key}</span>
      </div>
      <div class="game-input">
        <textarea 
          id="input-${game.key}" 
          class="exclusion-textarea" 
          placeholder="Enter Pokémon IDs (e.g. 1, 4, 7)"
          data-game="${game.key}">${csv}</textarea>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 10px;">
          Note: These Pokémon will be hidden when viewing the ${game.label} Pokédex.
        </p>
      </div>
    </div>
  `;

  // Attach listener to sync with working state
  const ta = managerEl.querySelector('.exclusion-textarea');
  ta.addEventListener('input', (e) => {
    const gid = e.target.dataset.game;
    const ids = e.target.value.split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n));
    
    if (ids.length > 0) {
      workingExclusions[gid] = ids;
    } else {
      delete workingExclusions[gid];
    }
  });
}

/**
 * Generates the JS file content based on working state.
 */
function generateCode() {
  const code = `/**
 * Manual exclusions for Pokemon per game.
 * This file is the SINGLE SOURCE OF TRUTH for exclusions.
 * To update this file, use the Admin Settings page to generate new content.
 */

export const GAME_EXCLUSIONS = ${JSON.stringify(workingExclusions, null, 2)};

/**
 * Gets the list of excluded IDs for a specific game.
 */
export function getExclusions(gameName) {
  return GAME_EXCLUSIONS[gameName] || [];
}

/**
 * Checks if a pokemon should be hidden from a game.
 */
export function isExcluded(pokemonId, gameName) {
  if (!gameName) return false;
  return getExclusions(gameName).includes(pokemonId);
}
`;
  return code;
}

/**
 * Handles the "Save" action.
 */
async function handleSave() {
  const code = generateCode();
  
  try {
    const response = await fetch('/api/save-exclusions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    if (response.ok) {
      showToast('✅ Saved successfully to src/js/gameExclusions.js!');
      return;
    }
  } catch (err) {
    console.warn('Auto-save failed, falling back to manual download:', err);
  }

  // Fallback
  try {
    await navigator.clipboard.writeText(code);
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gameExclusions.js';
    a.click();
    URL.revokeObjectURL(url);
    showToast('⚠️ Auto-save failed. Code copied to clipboard and file downloaded!');
  } catch (err) {
    console.error('Save failed:', err);
    alert('Failed to save. Check console.');
  }
}

function showToast(message) {
  const msgEl = document.getElementById('toast-message');
  if (msgEl) msgEl.textContent = message || 'Changes saved successfully!';
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 5000);
}

// Event Listeners
saveBtn.addEventListener('click', handleSave);
resetBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset all changes? This will revert to the last saved state.')) {
    workingExclusions = JSON.parse(JSON.stringify(GAME_EXCLUSIONS));
    renderExclusions();
  }
});

// Initial Render
renderTabs();
renderExclusions();
