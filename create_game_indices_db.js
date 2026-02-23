import fs from 'fs';
import { fetchPokemonList, fetchPokemonBatch } from './src/js/api.js';

const POKEDEX_MAP = {
  'kanto': '(Red/Blue/Yellow)',
  'original-johto': '(Gold/Silver/Crystal)',
  'hoenn': '(Ruby/Sapphire/Emerald)',
  'updated-kanto': '(FireRed/LeafGreen)',
  'original-sinnoh': '(Diamond/Pearl/Platinum)',
  'updated-johto': '(HeartGold/SoulSilver)',
  'original-unova': '(Black/White)',
  'updated-unova': '(Black 2/White 2)',
  'kalos-central': '(X/Y — Central Kalos)',
  'kalos-coastal': '(X/Y — Coastal Kalos)',
  'kalos-mountain': '(X/Y — Mountain Kalos)',
  'updated-hoenn': '(Omega Ruby/Alpha Sapphire)',
  'original-alola': '(Sun/Moon)',
  'updated-alola': '(Ultra Sun/Ultra Moon)',
  'letsgo-kanto': '(Let\'s Go Pikachu/Let\'s Go Eevee)',
  'galar': '(Sword/Shield)',
  'isle-of-armor': '(The Isle of Armor)',
  'crown-tundra': '(The Crown Tundra)',
  'hisui': '(Legends: Arceus)',
  'paldea': '(Scarlet/Violet)',
  'kitakami': '(The Teal Mask)',
  'blueberry': '(The Indigo Disk)'
};

async function generateGameIndices() {
  console.log('🚀 Starting Game Indices JSON generation...');
  
  try {
    const list = await fetchPokemonList(1025, 0);
    const results = list.results;
    const total = results.length;
    console.log(`Found ${total} items. Processing...`);

    const db = [];
    const BATCH_SIZE = 50;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      const batchIds = batch.map(p => {
        const parts = p.url.split('/').filter(Boolean);
        return parseInt(parts[parts.length - 1]);
      });

      const batchData = await fetchPokemonBatch(batchIds);

      for (const { pokemon, species } of batchData) {
        const pokedexData = (species.pokedex_numbers || [])
          .filter(p => POKEDEX_MAP[p.pokedex.name])
          .map(p => ({
            game: POKEDEX_MAP[p.pokedex.name],
            idx: String(p.entry_number).padStart(4, '0')
          }));

        db.push({
          id: pokemon.id,
          name: pokemon.name,
          pokedex: pokedexData
        });
      }

      console.log(`Processed ${Math.min(i + BATCH_SIZE, total)} / ${total}`);
    }

    fs.writeFileSync('pokemon_game_indices.json', JSON.stringify(db));
    console.log('✅ Success! Created minified "pokemon_game_indices.json"');
    
  } catch (error) {
    console.error('❌ Generation failed:', error);
  }
}

generateGameIndices();
