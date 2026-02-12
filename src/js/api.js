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

// Parse the nested evolution chain into a flat array with stages
export function parseEvolutionChain(chain) {
  const result = [];
  function traverse(node, stage) {
    const id = parseInt(node.species.url.split('/').filter(Boolean).pop());
    result.push({
      id,
      name: node.species.name,
      stage,
      stageLabel: stage === 0 ? 'basic' : stage === 1 ? 'stage-1' : 'stage-2'
    });
    if (node.evolves_to) {
      node.evolves_to.forEach(evo => traverse(evo, stage + 1));
    }
  }
  traverse(chain, 0);
  return result;
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
