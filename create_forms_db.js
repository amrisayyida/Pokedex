import fs from 'fs';
import { fetchPokemonList, fetchPokemonBatch } from './src/js/api.js';

// Script to generate alternate forms database for Nordcraft.
// Only includes Pokemon with 2+ varieties (alternate forms).
// Run with: node create_forms_db.js

async function createFormsDb() {
  console.log('Starting Alternate Forms DB generation...');
  console.log('Fetching all Pokemon species...');

  const list = await fetchPokemonList(1025, 0);
  const results = list.results;
  const total = results.length;

  const db = {};
  const BATCH_SIZE = 50;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    const batchIds = batch.map(p => {
      const parts = p.url.split('/').filter(Boolean);
      return parseInt(parts[parts.length - 1]);
    });

    const batchData = await fetchPokemonBatch(batchIds);

    for (const { pokemon, species } of batchData) {
      // Include ALL Pokemon — empty array if no alternate forms
      if (!species.varieties || species.varieties.length <= 1) {
        db[String(pokemon.id)] = [];
        continue;
      }

      const forms = species.varieties
        .filter(v => !v.is_default)
        .map(v => {
          const parts = v.pokemon.url.split('/').filter(Boolean);
          const formId = parseInt(parts[parts.length - 1]);
          const rawName = v.pokemon.name;
          // "pikachu-rock-star" → "Rock Star"
          const baseName = species.name || '';
          const formName = rawName.replace(baseName + '-', '').replace(/-/g, ' ');
          return {
            id: formId,
            name: formName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${formId}.png`
          };
        });

      db[String(pokemon.id)] = forms;
    }

    console.log(`Processed ${Math.min(i + BATCH_SIZE, total)} / ${total}`);
  }

  fs.writeFileSync('forms_db.json', JSON.stringify(db));
  console.log(`✅ Success! Created "forms_db.json" with ${Object.keys(db).length} Pokemon that have alternate forms.`);
  console.log('Instructions: Upload this file as a Variable in Nordcraft.');
}

createFormsDb();
