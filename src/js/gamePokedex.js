/**
 * Game Pokedex Page
 * URL: pokemon-game-pokedex.html?game=yellow
 *
 * Uses the existing GAME_GROUPS + pokemon_game_indices.json data
 * to show all Pokémon available in a specific game.
 * Numbers shown: national dex number.
 */

import { initFilteredPokedex } from './pokedexPage.js';
import { GAME_GROUPS, VERSION_DATA } from './constants.js';

const FLAT_GAMES = Object.values(GAME_GROUPS).flat();

async function main() {
  const params = new URLSearchParams(window.location.search);
  const gameKey = params.get('game') || '';

  if (!gameKey || !FLAT_GAMES.includes(gameKey)) {
    document.getElementById('page-title').textContent = 'Unknown Game';
    document.getElementById('result-count').textContent = 'No game specified.';
    return;
  }

  const versionInfo = VERSION_DATA[gameKey];
  const versionName = versionInfo ? versionInfo.name : capitalize(gameKey.replace(/-/g, ' '));
  const title = `${versionName} Pokédex`;

  // Set dynamic placeholder
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.placeholder = `Search Pokémon in ${versionName}...`;
  }

  // Load game indices data
  let gameIndices;
  try {
    const res = await fetch('/pokemon_game_indices.json');
    gameIndices = await res.json();
  } catch (e) {
    console.error('Failed to load game indices', e);
    document.getElementById('result-count').textContent = 'Failed to load game data.';
    return;
  }

  // gameIndices is keyed by pokemon ID, value is array of game version names
  // Filter to pokemon that appear in the requested game
  const pokemonEntries = [];
  
  // gameKey is something like 'yellow', 'gold', 'sword-shield'
  // In JSON, games are like "(Red/Blue/Yellow)", "(Sword/Shield)"
  for (const p of gameIndices) {
    const isInGame = p.pokedex.some(entry => {
      const g = entry.game.toLowerCase();
      // Simple match: does the gameKey appear in the game string?
      // Handle special cases if needed (e.g. 'sword-shield' matching 'Sword/Shield')
      const normalizedGameKey = gameKey.replace(/-/g, '/').toLowerCase();
      const parts = normalizedGameKey.split('/');
      
      return parts.some(part => g.includes(part));
    });

    if (isInGame) {
      pokemonEntries.push({
        id: p.id,
        name: p.name
      });
    }
  }

  if (pokemonEntries.length === 0) {
    console.warn(`No pokemon found for game: ${gameKey}`);
  }

  // Sort by national dex ID
  pokemonEntries.sort((a, b) => a.id - b.id);

  // Set title
  const finalTitle = `${versionName} Pokédex`;

  // Initialize the shared Pokedex page
  await initFilteredPokedex({
    title: finalTitle,
    pokemonEntries: pokemonEntries,
    sidebarCategory: 'game',
    activeKey: gameKey
  });
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

main().catch(console.error);
