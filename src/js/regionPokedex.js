/**
 * Region Pokedex Page
 * URL: pokemon-region-pokedex.html?region=kanto
 *
 * Fetches /api/v2/pokedex/{region} from PokeAPI.
 * Shows pokemon in regional order with REGIONAL numbers.
 */

import { fetchPokedex } from './api.js';
import { initFilteredPokedex } from './pokedexPage.js';

// Map pokedex API name → display name
const REGION_NAMES = {
  'national':          'National',
  'kanto':             'Kanto',
  'original-johto':    'Johto',
  'hoenn':             'Hoenn',
  'original-sinnoh':   'Sinnoh',
  'extended-sinnoh':   'Sinnoh (Extended)',
  'updated-johto':     'Johto (Updated)',
  'original-unova':    'Unova',
  'updated-unova':     'Unova (Updated)',
  'conquest-gallery':  'Conquest Gallery',
  'kalos-central':     'Kalos Central',
  'kalos-coastal':     'Kalos Coastal',
  'kalos-mountain':    'Kalos Mountain',
  'updated-hoenn':     'Hoenn (Updated)',
  'original-alola':    'Alola',
  'original-melemele': 'Melemele Island',
  'original-akala':    'Akala Island',
  'original-ulaula':   "Ula'ula Island",
  'original-poni':     'Poni Island',
  'updated-alola':     'Alola (Updated)',
  'updated-melemele':  'Melemele Island (Updated)',
  'updated-akala':     'Akala Island (Updated)',
  'updated-ulaula':    "Ula'ula Island (Updated)",
  'updated-poni':      'Poni Island (Updated)',
  'letsgo-kanto':      "Let's Go Kanto",
  'galar':             'Galar',
  'isle-of-armor':     'Isle of Armor',
  'crown-tundra':      'Crown Tundra',
  'hisui':             'Hisui',
  'paldea':            'Paldea',
  'kitakami':          'Kitakami',
  'blueberry':         'Blueberry Academy',
  'lumiose-city':      'Lumiose City',
  'hyperspace':        'Hyperspace',
};

async function main() {
  const params   = new URLSearchParams(window.location.search);
  const region   = params.get('region') || '';

  if (!region) {
    document.getElementById('page-title').textContent = 'Unknown Region';
    document.getElementById('result-count').textContent = 'No region specified.';
    return;
  }

  const regionLabel = REGION_NAMES[region] || capitalize(region.replace(/-/g, ' '));
  const title = `${regionLabel} Pokédex`;

  // Set dynamic placeholder
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.placeholder = `Search ${regionLabel} Pokémon...`;
  }

  let pokedexData;
  try {
    pokedexData = await fetchPokedex(region);
  } catch (e) {
    console.error('Failed to fetch pokedex:', region, e);
    document.getElementById('result-count').textContent = `Failed to load ${regionLabel} Pokédex data.`;
    return;
  }

  // pokemon_entries: [{ entry_number, pokemon_species: { name, url } }]
  const entries = pokedexData.pokemon_entries || [];

  // Sort by regional entry_number
  entries.sort((a, b) => a.entry_number - b.entry_number);

  const pokemonEntries = entries.map(e => {
    const parts = e.pokemon_species.url.split('/').filter(Boolean);
    const id = parseInt(parts[parts.length - 1]);
    return { id, regionalNumber: e.entry_number };
  });

  // Build regional number override map
  const regionNumberMap = new Map(pokemonEntries.map(e => [e.id, e.regionalNumber]));

  await initFilteredPokedex({
    title: `${regionLabel} Pokédex`,
    pokemonEntries: pokemonEntries,
    numberOverride: regionNumberMap,
    sidebarCategory: 'region',
    activeKey: region
  });
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

main().catch(console.error);
