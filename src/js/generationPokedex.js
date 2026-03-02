/**
 * Generation Pokedex Page
 * URL: generation-pokedex.html?gen=generation-i
 *
 * Fetches /api/v2/generation/{gen} from PokeAPI.
 * Shows pokemon in national dex order with NATIONAL numbers.
 */

import { fetchGeneration } from './api.js';
import { initFilteredPokedex } from './pokedexPage.js';

const GENERATION_NAMES = {
  'generation-i':    'Generation I',
  'generation-ii':   'Generation II',
  'generation-iii':  'Generation III',
  'generation-iv':   'Generation IV',
  'generation-v':    'Generation V',
  'generation-vi':   'Generation VI',
  'generation-vii':  'Generation VII',
  'generation-viii': 'Generation VIII',
  'generation-ix':   'Generation IX',
};

async function main() {
  const params = new URLSearchParams(window.location.search);
  const gen    = params.get('gen') || '';

  if (!gen) {
    document.getElementById('page-title').textContent = 'Unknown Generation';
    document.getElementById('result-count').textContent = 'No generation specified.';
    return;
  }

  const genLabel = GENERATION_NAMES[gen] || capitalize(gen.replace(/-/g, ' '));
  const title    = `${genLabel} Pokédex`;

  // Set dynamic placeholder
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.placeholder = `Search ${genLabel} Pokémon...`;
  }

  let genData;
  try {
    genData = await fetchGeneration(gen);
  } catch (e) {
    console.error('Failed to fetch generation:', gen, e);
    document.getElementById('result-count').textContent = `Failed to load ${genLabel} data.`;
    return;
  }

  // pokemon_species: [{ name, url }]
  const species = genData.pokemon_species || [];

  const pokemonEntries = species.map(s => {
    const parts = s.url.split('/').filter(Boolean);
    const id    = parseInt(parts[parts.length - 1]);
    return { id };
  });

  // Sort by national dex ID
  pokemonEntries.sort((a, b) => a.id - b.id);

  await initFilteredPokedex({
    title,
    pokemonEntries,
    sidebarCategory: 'generation',
    activeKey: gen
  });
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

main().catch(console.error);
