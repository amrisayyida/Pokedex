import fs from 'fs';
import { fetchPokemonList } from './src/js/api.js';

async function generateNamesOnly() {
  console.log('Fetching pokemon names...');
  try {
    const list = await fetchPokemonList(1025, 0);
    const results = list.results.map(p => {
      const parts = p.url.split('/').filter(Boolean);
      const id = parseInt(parts[parts.length - 1]);
      return {
        id: id,
        name: p.name.charAt(0).toUpperCase() + p.name.slice(1)
      };
    });

    fs.writeFileSync('pokemon_names.json', JSON.stringify(results));
    console.log('✅ Success! Created "pokemon_names.json"');
    
    // Print snippet
    console.log('Preview:');
    console.log(JSON.stringify(results.slice(0, 5), null, 2));
  } catch (error) {
    console.error('Failed:', error);
  }
}

generateNamesOnly();
