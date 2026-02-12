import fs from 'fs';
import { fetchPokemonList, fetchPokemonBatch, fetchEvolutionChain, parseEvolutionChain } from './src/js/api.js';

// Script to generate a static JSON database for Nordcraft/Toddle import.
// Run with: node create_nordcraft_db.js

async function createDatabase() {
  console.log('Starting Nordcraft DB generation...');
  console.log('Fetching full pokemon list (1025 items)...');
  
  // 1. Fetch List
  const list = await fetchPokemonList(1025, 0); 
  const results = list.results;
  const total = results.length;
  console.log(`Found ${total} items. Processing chunks...`);
  
  const db = [];
  const BATCH_SIZE = 50;
  const evolutionChainCache = new Map();

  // 2. Process in Batches
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    const batchIds = batch.map(p => {
      const parts = p.url.split('/').filter(Boolean);
      return parseInt(parts[parts.length - 1]);
    });

    try {
      // Fetch details for batch
      const batchData = await fetchPokemonBatch(batchIds);
      
      for (const { pokemon, species } of batchData) {
        // Resolve Evolution Stage
        let stage = 'no-evolution';
        const chainUrl = species.evolution_chain?.url;
        
        if (chainUrl) {
          if (!evolutionChainCache.has(chainUrl)) {
            try {
              const chainData = await fetchEvolutionChain(chainUrl);
              const chain = parseEvolutionChain(chainData.chain);
              evolutionChainCache.set(chainUrl, chain);
            } catch (e) {
              console.warn(`Skipping chain ${chainUrl}`);
            }
          }
          
          const chain = evolutionChainCache.get(chainUrl);
          if (chain) {
            const member = chain.find(m => m.id === pokemon.id);
            if (member) stage = member.stageLabel;
            if (chain.length <= 1) stage = 'no-evolution';
          }
        }

        // Build Minified Object
        db.push({
          id: pokemon.id,
          name: pokemon.name,
          types: pokemon.types.map(t => t.type.name),
          // Clean generation string: "generation-i" -> "1"
          gen: species.generation?.name.replace('generation-', '') || 'unknown',
          stage: stage,
          // Image URL pattern for Nordcraft usage
          image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`
        });
      }
      
      console.log(`Processed ${i + batchData.length} / ${total}`);
      
    } catch (err) {
      console.error('Batch failed:', err);
    }
  }

  // 3. Save to File
  fs.writeFileSync('nordcraft_db.json', JSON.stringify(db));
  console.log('✅ Success! Created "nordcraft_db.json"');
  console.log('Instructions: Upload this file as a Variable in Nordcraft.');
}

createDatabase();
