import fs from 'fs';
import { fetchPokemonList, fetchPokemonBatch } from './src/js/api.js';

// Script to generate a separate Gender Ratio database for Nordcraft.
// All 1025 Pokemon included.
// Run with: node create_gender_db.js

async function createGenderDb() {
  console.log('🚀 Starting Gender Ratio DB generation...');

  try {
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

      console.log(`Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
      const batchData = await fetchPokemonBatch(batchIds);

      for (const { pokemon, species } of batchData) {
        const rate = species.gender_rate;
        if (rate === -1) {
          db[String(pokemon.id)] = { genderless: true, male: "0%", female: "0%" };
        } else {
          const femalePercent = (rate / 8) * 100;
          const malePercent = 100 - femalePercent;
          db[String(pokemon.id)] = {
            genderless: false,
            male: malePercent.toFixed(1) + "%",
            female: femalePercent.toFixed(1) + "%"
          };
        }
      }
      
      console.log(`✅ Progress: ${Math.min(i + BATCH_SIZE, total)} / ${total}`);
    }

    fs.writeFileSync('gender_db.json', JSON.stringify(db));
    console.log('✨ Success! Created "gender_db.json"');
  } catch (error) {
    console.error('❌ Failed to generate Gender DB:', error);
  }
}

createGenderDb();
