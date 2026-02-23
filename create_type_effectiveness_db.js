import fs from 'fs';
import { fetchPokemonList, fetchPokemonBatch, fetchTypeData } from './src/js/api.js';

// Script to generate type effectiveness for ALL 1025 Pokemon for Nordcraft.
// Every Pokemon gets a full entry with all categories.
// Run with: node create_type_effectiveness_db.js

const ALL_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
];

async function createTypeEffectivenessDb() {
  console.log('Starting Type Effectiveness DB generation...');

  // 1. Fetch damage relations for all 18 types first
  console.log('Fetching type damage relations...');
  const typeRelations = {};
  for (const typeName of ALL_TYPES) {
    const data = await fetchTypeData(typeName);
    typeRelations[typeName] = data.damage_relations;
    console.log(`  ✓ ${typeName}`);
  }

  // 2. Fetch all unique type combinations from all 1025 Pokemon
  console.log('Scanning all Pokemon to find unique type combinations...');
  const list = await fetchPokemonList(1025, 0);
  const results = list.results;
  const total = results.length;

  const typeCombos = new Set();
  const BATCH_SIZE = 50;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    const batchIds = batch.map(p => {
      const parts = p.url.split('/').filter(Boolean);
      return parseInt(parts[parts.length - 1]);
    });

    const batchData = await fetchPokemonBatch(batchIds);
    for (const { pokemon } of batchData) {
      const types = pokemon.types.map(t => t.type.name).sort();
      typeCombos.add(types.join(','));
    }
    console.log(`  Scanned ${Math.min(i + BATCH_SIZE, total)} / ${total}...`);
  }

  console.log(`Found ${typeCombos.size} unique type combinations.`);

  // 3. Calculate effectiveness for each unique combination
  console.log('Calculating effectiveness objects...');
  const db = {};

  for (const comboKey of typeCombos) {
    const types = comboKey.split(',');

    // Initialize all types at 1x
    const effectivenessMap = {};
    ALL_TYPES.forEach(t => { effectivenessMap[t] = 1; });

    // Multiply for each defending type
    for (const defType of types) {
      const rel = typeRelations[defType];
      if (!rel) continue;
      for (const t of rel.double_damage_from) effectivenessMap[t.name] *= 2;
      for (const t of rel.half_damage_from) effectivenessMap[t.name] *= 0.5;
      for (const t of rel.no_damage_from) effectivenessMap[t.name] = 0;
    }

    // Map to result object (all 18 types present)
    const result = {};
    for (const type of ALL_TYPES) {
      const mult = effectivenessMap[type];
      let desc = "";
      
      if (mult >= 4) desc = "veryWeak";
      else if (mult >= 2) desc = "weak";
      else if (mult === 0) desc = "immune";
      else if (mult <= 0.25) desc = "veryResistant";
      else if (mult <= 0.5) desc = "resistant";
      
      result[type] = desc;
    }

    db[comboKey] = result;
  }

  // 4. Save (Minified)
  fs.writeFileSync('type_effectiveness_db.json', JSON.stringify(db));
  console.log(`\n✅ Success! Created "type_effectiveness_db.json" with ${Object.keys(db).length} combinations.`);
  
  // Show a sample output
  const sampleKey = "electric";
  console.log(`\n--- Sample Output for "${sampleKey}" ---`);
  console.log(JSON.stringify(db[sampleKey], null, 2));
}

createTypeEffectivenessDb();
