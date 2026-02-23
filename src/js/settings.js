import { GAME_GROUPS } from './constants.js';
import { GAME_EXCLUSIONS } from './gameExclusions.js';

const managerEl = document.getElementById('exclusions-manager');
const saveBtn = document.getElementById('save-all-btn');
const resetBtn = document.getElementById('reset-btn');
const toastEl = document.getElementById('toast');

/**
 * Renders the exclusion editor for all games.
 */
function renderManager() {
  let html = '';
  
  // Flatten all games from groups
  const allGames = [];
  Object.entries(GAME_GROUPS).forEach(([group, games]) => {
    games.forEach(game => {
      allGames.push({ id: game, group: group });
    });
  });

  allGames.forEach(game => {
    const list = GAME_EXCLUSIONS[game.id] || [];
    const csv = list.join(', ');
    const gameLabel = game.id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    html += `
      <div class="game-exclusion-row">
        <div class="game-info">
          <label for="input-${game.id}">${gameLabel}</label>
          <span>${game.group}</span>
        </div>
        <div class="game-input">
          <textarea 
            id="input-${game.id}" 
            class="exclusion-textarea" 
            placeholder="e.g. 1, 4, 7"
            data-game="${game.id}">${csv}</textarea>
        </div>
      </div>
    `;
  });

  managerEl.innerHTML = html;
}

/**
 * Generates the JS file content based on the textareas.
 */
function generateCode() {
  const textareas = document.querySelectorAll('.exclusion-textarea');
  const exclusionsObj = {};

  textareas.forEach(ta => {
    const game = ta.dataset.game;
    const ids = ta.value.split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n));
    
    if (ids.length > 0) {
      exclusionsObj[game] = ids;
    }
  });

  const code = `/**
 * Manual exclusions for Pokemon per game.
 * This file is the SINGLE SOURCE OF TRUTH for exclusions.
 * To update this file, use the Admin Settings page to generate new content.
 */

export const GAME_EXCLUSIONS = ${JSON.stringify(exclusionsObj, null, 2)};

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
 * Handles the "Save" action:
 * 1. Tries to auto-save via Vite API.
 * 2. If that fails, copies to clipboard and offers download.
 */
async function handleSave() {
  const code = generateCode();
  
  try {
    // 1. Try Auto-Save API
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

  // Fallback: Copy to clipboard and offer download
  try {
    await navigator.clipboard.writeText(code);
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gameExclusions.js';
    a.click();
    URL.revokeObjectURL(url);

    showToast('⚠️ Auto-save failed. Code copied to clipboard and file downloaded! Please replace it manually.');
  } catch (err) {
    console.error('Save failed:', err);
    alert('Failed to save. Check console.');
  }
}

function showToast(message) {
  toastEl.textContent = message || 'Changes saved successfully!';
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 5000);
}

// Event Listeners
saveBtn.addEventListener('click', handleSave);
resetBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all exclusion lists? This will empty all input fields.')) {
    document.querySelectorAll('.exclusion-textarea').forEach(ta => ta.value = '');
  }
});

// Initial Render
renderManager();
