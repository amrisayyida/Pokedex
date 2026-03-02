// PokeAPI service with caching
const BASE_URL = 'https://pokeapi.co/api/v2';
const cache = new Map();

async function cachedFetch(url) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  const data = await res.json();
  cache.set(url, data);
  if (cache.size > 600) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  return data;
}

export async function fetchPokemonList(limit = 40, offset = 0) {
  const data = await cachedFetch(`${BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);
  return data;
}

export async function fetchPokemon(idOrName) {
  return cachedFetch(`${BASE_URL}/pokemon/${idOrName}`);
}

export async function fetchSpecies(idOrName) {
  return cachedFetch(`${BASE_URL}/pokemon-species/${idOrName}`);
}

export async function fetchEvolutionChain(url) {
  return cachedFetch(url);
}

export async function fetchAllTypes() {
  const data = await cachedFetch(`${BASE_URL}/type`);
  const excluded = ['stellar', 'unknown', 'shadow'];
  return data.results.filter(t => !excluded.includes(t.name));
}

export async function fetchAllGenerations() {
  const data = await cachedFetch(`${BASE_URL}/generation`);
  return data.results;
}

export async function fetchAllVersions() {
  const data = await cachedFetch(`${BASE_URL}/version?limit=50`);
  return data.results;
}

export async function fetchPokedex(nameOrId) {
  return cachedFetch(`${BASE_URL}/pokedex/${nameOrId}`);
}

export async function fetchGeneration(nameOrId) {
  return cachedFetch(`${BASE_URL}/generation/${nameOrId}`);
}

// Helper to format names (kebab-case to Title Case)
function formatName(str) {
  if (!str) return '';
  return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

// Format evolution details into a readable string
function formatEvolutionTrigger(details) {
  if (!details || details.length === 0) return '';
  
  // We only show the first method for brevity
  const d = details[0];
  const triggers = [];
  
  if (d.min_level) triggers.push(`Lvl ${d.min_level}`);
  if (d.item) triggers.push(formatName(d.item.name));
  if (d.trigger.name === 'trade') triggers.push('Trade');
  if (d.min_happiness) triggers.push('Happiness');
  if (d.time_of_day) triggers.push(formatName(d.time_of_day));
  if (d.known_move) triggers.push(`Move: ${formatName(d.known_move.name)}`);
  if (d.location) triggers.push(`@ ${formatName(d.location.name)}`);
  if (d.held_item) triggers.push(`Hold: ${formatName(d.held_item.name)}`);
  if (d.known_move_type) triggers.push(`Type: ${formatName(d.known_move_type.name)}`);
  if (d.min_beauty) triggers.push('Beauty');
  
  return triggers.join(', ') || 'Evolves';
}

// Parse the nested evolution chain into a flat array with stages
export function parseEvolutionChain(chain) {
  const result = [];
  function traverse(node, stage) {
    const id = parseInt(node.species.url.split('/').filter(Boolean).pop());
    
    // Extract evolution details from the node itself (how this pokemon evolved)
    const details = node.evolution_details || [];
    const triggerString = formatEvolutionTrigger(details);

    result.push({
      id,
      name: node.species.name,
      stage,
      stageLabel: stage === 0 ? 'basic' : stage === 1 ? 'stage-1' : 'stage-2',
      evolution_details: details, // Keep raw details just in case
      evolutionTrigger: triggerString // Pre-formatted string
    });
    
    if (node.evolves_to) {
      node.evolves_to.forEach(evo => traverse(evo, stage + 1));
    }
  }
  traverse(chain, 0);
  return result;
}

export async function fetchTypeData(typeName) {
  return cachedFetch(`${BASE_URL}/type/${typeName}`);
}

export async function fetchEncounters(id) {
  return cachedFetch(`${BASE_URL}/pokemon/${id}/encounters`);
}

export async function fetchMove(nameOrId) {
  return cachedFetch(`${BASE_URL}/move/${nameOrId}`);
}

// Batch fetch multiple pokemon in parallel with concurrency control
export async function fetchPokemonBatch(ids, concurrency = 10) {
  const results = [];
  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = ids.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (id) => {
        const [pokemon, species] = await Promise.all([
          fetchPokemon(id),
          fetchSpecies(id)
        ]);
        return { pokemon, species };
      })
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled') results.push(r.value);
    }
  }
  return results;
}
