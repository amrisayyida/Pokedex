
import fs from 'fs';
import path from 'path';

// Helper to fetch JSON with retry and basic logging
const fetchJson = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Failed to fetch ${url}, retrying...`);
    // Simple retry once
    try {
      const res = await fetch(url);
      return await res.json();
    } catch (e) {
      return null;
    }
  }
};

const TOTAL_POKEMON = 1025; 

async function createLiteDB() {
  console.log('🚀 Starting Robust Lite DB Generation...');
  console.log('Strategy: List -> Species -> Unique Chains -> Process Stages');

  // 1. Fetch Key Data: All Species (contains URL to Chain)
  console.log('Fetching all Pokemon Species...');
  const speciesListRes = await fetchJson(`https://pokeapi.co/api/v2/pokemon-species?limit=${TOTAL_POKEMON}`);
  if (!speciesListRes) return console.error('Failed to init');
  
  const speciesList = speciesListRes.results;
  
  // 2. Extract Chain URLs and Deduplicate
  // We need to fetch each species details to get the chain URL
  // Optimization: Fetch details in batches
  console.log(`Fetching details for ${speciesList.length} species to find chains...`);
  
  const speciesDetailsMap = new Map(); // Name -> Details
  const chainUrls = new Set();
  
  // Batch processing setup
  const BATCH_SIZE = 50;
  for (let i = 0; i < speciesList.length; i += BATCH_SIZE) {
    const batch = speciesList.slice(i, i + BATCH_SIZE);
    process.stdout.write(`\rFetching batch ${i}/${speciesList.length}...`);
    
    await Promise.all(batch.map(async (s) => {
      // We need the ID from adding the species to map later
      const id = s.url.split('/').filter(Boolean).pop();
      const details = await fetchJson(s.url);
      if (details) {
        speciesDetailsMap.set(s.name, { id, ...details });
        chainUrls.add(details.evolution_chain.url);
      }
    }));
  }
  console.log(`\nFound ${chainUrls.size} unique evolution chains.`);

  // 3. Process Chains to Map ID -> Stage
  console.log('Processing evolution chains...');
  const stageMap = new Map(); // PokemonID (or Name) -> Stage String
  
  const chains = Array.from(chainUrls);
  for (let i = 0; i < chains.length; i += 10) { // Batch chains
    const batch = chains.slice(i, i + 10);
    process.stdout.write(`\rProcessing chain batch ${i}/${chains.length}...`);
    
    await Promise.all(batch.map(async (url) => {
      const chainData = await fetchJson(url);
      if (!chainData) return;
      
      const chain = chainData.chain;
      
      // Recursive function to traverse chain
      const traverse = (node, depth) => {
        const speciesName = node.species.name;
        // Map species name to stage
        let stage = 'basic';
        if (depth === 1) stage = 'stage-1';
        if (depth === 2) stage = 'stage-2';
        
        // We need lookup by ID or Name. Using Name for now as it's cleaner in the node.
        stageMap.set(speciesName, stage);
        
        // Traverse children
        node.evolves_to.forEach(child => traverse(child, depth + 1));
      };
      
      traverse(chain, 0); // Start at depth 0
    }));
  }
  console.log('\nStage mapping complete.');

  // 4. Build Final Lite DB
  // We need distinct Pokemon (variants included? The list above was species)
  // Let's stick to the main list of 1025 Pokemon
  console.log('Building final database...');
  const pokemonListRes = await fetchJson(`https://pokeapi.co/api/v2/pokemon?limit=${TOTAL_POKEMON}`);
  const finalDB = [];
  
  const pokemonList = pokemonListRes.results;

  // We need types for filtering.
  // This requires fetching EACH pokemon again or using a cache. 
  // To save time for this script, let's just fetch types quickly or use the species generation map?
  // Actually, filtering by type is important. We must fetch types.
  // Let's do a final massive batch fetch for types.
  
  for (let i = 0; i < pokemonList.length; i += BATCH_SIZE) {
    const batch = pokemonList.slice(i, i + BATCH_SIZE);
    process.stdout.write(`\rFinalizing batch ${i}/${pokemonList.length}...`);
    
    await Promise.all(batch.map(async (p) => {
      const details = await fetchJson(p.url);
      if (!details) return;
      
      // Get stage from our map using species name
      // Note: Pokemon name might differ from species name (e.g. variations)
      // But typically details.species.name is the key
      const speciesName = details.species.name;
      const stage = stageMap.get(speciesName) || 'unknown';
      
      // Get Gen from species map (we fetched species details in step 2)
      // Optimization: We could have stored gen in stageMap too
      // Let's just re-fetch or use what we have? 
      // We have speciesDetailsMap from step 2!
      const speciesDetails = speciesDetailsMap.get(speciesName);
      const gen = speciesDetails ? speciesDetails.generation.name.replace('generation-', '').split('-')[0] : 'unknown';

      finalDB.push({
        id: details.id,
        n: details.name,
        t: details.types.map(t => t.type.name), // Types
        s: stage,
        g: gen
      });
    }));
  }

  // 5. Save
  console.log(`\n✅ Done! Saved ${finalDB.length} items to shortcuts.`);
  fs.writeFileSync('nordcraft_lite.json', JSON.stringify(finalDB));
}

createLiteDB();
