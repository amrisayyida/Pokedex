import fs from 'fs';
import { fetchPokemonList, fetchPokemonBatch } from './src/js/api.js';

// Script to generate a separate Catch Rate database for Nordcraft.
// All 1025 Pokemon included.
// Run with: node create_catch_rate_db.js

async function createCatchRateDb() {
  console.log('🚀 Starting Catch Rate DB generation...');

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
        // Capture rate value (1-255)
        db[String(pokemon.id)] = species.capture_rate;
      }
      
      console.log(`✅ Progress: ${Math.min(i + BATCH_SIZE, total)} / ${total}`);
    }

    fs.writeFileSync('catch_rate_db.json', JSON.stringify(db));
    console.log('✨ Success! Created "catch_rate_db.json"');
  } catch (error) {
    console.error('❌ Failed to generate Catch Rate DB:', error);
  }
}

createCatchRateDb();
