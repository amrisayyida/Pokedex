import fs from 'fs';
import { fetchPokemonList, fetchPokemonBatch, fetchEvolutionChain, parseEvolutionChain } from './src/js/api.js';

// Script to generate a specialized evolution database for Nordcraft.
// This allows the detail page to show the full evolution chain instantly.
// Run with: node create_evolution_db.js

async function createEvolutionDatabase() {
  console.log('Starting Evolution DB generation...');
  console.log('Fetching pokemon species list (1025 items)...');
  
  // 1. Fetch List
  const list = await fetchPokemonList(1025, 0); 
  const results = list.results;
  const total = results.length;
  console.log(`Found ${total} items. Processing chunks...`);
  
  const evolutionDb = {};
  const BATCH_SIZE = 50;
  const chainCache = new Map();

  // 2. Process in Batches
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    const batchIds = batch.map(p => {
      const parts = p.url.split('/').filter(Boolean);
      return parseInt(parts[parts.length - 1]);
    });

    try {
      // Fetch details & species for the batch
      const batchData = await fetchPokemonBatch(batchIds);
      
      // Pre-fetch unique evolution chains for this batch
      const uniqueChainUrls = new Set();
      for (const { species } of batchData) {
        if (species.evolution_chain?.url) {
          uniqueChainUrls.add(species.evolution_chain.url);
        }
      }

      // Filter for chains not yet cached
      const missingChains = Array.from(uniqueChainUrls).filter(url => !chainCache.has(url));

      // Fetch missing chains in parallel
      if (missingChains.length > 0) {
        await Promise.all(missingChains.map(async (url) => {
          try {
            const chainData = await fetchEvolutionChain(url);
            const parsedChain = parseEvolutionChain(chainData.chain);
            
            // Simplify chain items
            const formattedChain = parsedChain.map(m => ({
              id: m.id,
              name: m.name,
              stage: m.stageLabel,
              evolutionTrigger: m.evolutionTrigger
            }));
            
            chainCache.set(url, formattedChain);
          } catch (e) {
            console.warn(`Skipping chain ${url}:`, e.message);
          }
        }));
      }

      // Assign data to evolutionDb
      for (const { pokemon, species } of batchData) {
        const chainUrl = species.evolution_chain?.url;
        if (chainUrl) {
          const chain = chainCache.get(chainUrl);
          if (chain) {
            const currentMember = chain.find(m => m.id === pokemon.id);
            if (currentMember) {
                 evolutionDb[pokemon.id] = {
                stage: currentMember.stage || 'no-evolution',
                chain: chain
              };
            }
          }
        }
      }
      
      console.log(`Processed ${i + batchData.length} / ${total}`);
      
    } catch (err) {
      console.error('Batch failed:', err);
    }
  }

  // 3. Save to File
  // Mapping ID -> Evolution Info for quick lookup in Nordcraft
  fs.writeFileSync('evolution_db.json', JSON.stringify(evolutionDb));
  console.log('✅ Success! Created "evolution_db.json"');
  console.log('Instructions: Upload this as a Variable in Nordcraft and lookup by Pokemon ID.');
}

createEvolutionDatabase();
