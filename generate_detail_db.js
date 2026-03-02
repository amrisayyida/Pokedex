import fs from 'fs';
import { fetchPokemonList, fetchPokemonBatch } from './src/js/api.js';

async function generateFullDetails() {
  console.log('🚀 Starting Full Detail Generation (lightweight)...');
  
  try {
    const list = await fetchPokemonList(1025, 0);
    const results = list.results;
    const total = results.length;
    
    const db = [];
    const BATCH_SIZE = 50;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      const batchIds = batch.map(p => {
        const parts = p.url.split('/').filter(Boolean);
        return parseInt(parts[parts.length - 1]);
      });

      console.log(`Fetching batch ${i/BATCH_SIZE + 1} (${i} to ${i + batch.length})...`);
      const batchData = await fetchPokemonBatch(batchIds);
      
      for (const { pokemon, species } of batchData) {
        // Find English flavor text
        const flavor = species.flavor_text_entries.find(e => e.language.name === 'en')?.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ') || "";
        const genus = species.genera.find(g => g.language.name === 'en')?.genus || "";

        db.push({
          id: pokemon.id,
          name: pokemon.name,
          types: pokemon.types.map(t => t.type.name),
          stats: {
            hp: pokemon.stats[0].base_stat,
            attack: pokemon.stats[1].base_stat,
            defense: pokemon.stats[2].base_stat,
            'special-attack': pokemon.stats[3].base_stat,
            'special-defense': pokemon.stats[4].base_stat,
            speed: pokemon.stats[5].base_stat
          },
          sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`,
          spriteSmall: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`,
          height: pokemon.height,
          weight: pokemon.weight,
          abilities: pokemon.abilities.map(a => ({ name: a.ability.name, isHidden: a.is_hidden })),
          generation: species.generation.name,
          isBaby: species.is_baby,
          isLegendary: species.is_legendary,
          isMythical: species.is_mythical,
          games: pokemon.game_indices.map(g => g.version.name),
          evolutionChainUrl: species.evolution_chain?.url || null,
          evolvesFrom: species.evolves_from_species?.name || null,
          flavorText: flavor,
          genus: genus,
          color: species.color.name,
          genderRate: species.gender_rate,
          captureRate: species.capture_rate
        });
      }
      console.log(`✅ Progress: ${Math.min(i + BATCH_SIZE, total)}/${total}`);
    }

    fs.writeFileSync('pokemon_detail.json', JSON.stringify(db));
    console.log('✨ Success! All 1025 Pokemon generated in pokemon_detail.json (minified)');
  } catch (error) {
    console.error('❌ Failed to generate details:', error);
  }
}

generateFullDetails();
