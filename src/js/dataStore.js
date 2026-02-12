// Central data store for pokemon data
import { fetchPokemonBatch, fetchEvolutionChain, parseEvolutionChain } from './api.js';

class DataStore {
  constructor() {
    this.pokemon = new Map(); // id -> normalized pokemon
    this.evolutionChains = new Map(); // chain url -> parsed chain
    this.totalCount = 0;
    this.loadedOffset = 0;
    this.isLoading = false;
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn());
  }

  // Load all 1025 pokemon progressively in batches
  async loadAll(onProgress) {
    if (this.isLoading) return;
    this.isLoading = true;
    this.fullyLoaded = false;

    try {
      const { fetchPokemonList } = await import('./api.js');
      // First, get the full list of pokemon URLs (just names/urls, very fast)
      const list = await fetchPokemonList(1025, 0);
      this.totalCount = Math.min(list.results.length, 1025);

      const allIds = list.results.map(p => {
        const parts = p.url.split('/').filter(Boolean);
        return parseInt(parts[parts.length - 1]);
      }).filter(id => id <= 1025);

      // Load details in batches of 50
      const BATCH_SIZE = 50;
      for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        const batchIds = allIds.slice(i, i + BATCH_SIZE);
        const batchData = await fetchPokemonBatch(batchIds);

        for (const { pokemon, species } of batchData) {
          const normalized = this.normalizePokemon(pokemon, species);
          this.pokemon.set(normalized.id, normalized);
        }

        if (onProgress) {
          onProgress(this.pokemon.size, this.totalCount);
        }
        this.notify();
      }

      this.fullyLoaded = true;
    } finally {
      this.isLoading = false;
    }
  }

  normalizePokemon(pokemon, species) {
    const games = pokemon.game_indices
      ? pokemon.game_indices.map(g => g.version.name)
      : [];

    return {
      id: pokemon.id,
      name: pokemon.name,
      types: pokemon.types.map(t => t.type.name),
      stats: pokemon.stats.reduce((acc, s) => {
        acc[s.stat.name] = s.base_stat;
        return acc;
      }, {}),
      sprite: pokemon.sprites.other?.['official-artwork']?.front_default
        || pokemon.sprites.front_default,
      spriteSmall: pokemon.sprites.front_default,
      height: pokemon.height,
      weight: pokemon.weight,
      abilities: pokemon.abilities.map(a => ({
        name: a.ability.name,
        isHidden: a.is_hidden
      })),
      generation: species.generation?.name || 'unknown',
      isBaby: species.is_baby,
      isLegendary: species.is_legendary,
      isMythical: species.is_mythical,
      games,
      evolutionChainUrl: species.evolution_chain?.url,
      evolvesFrom: species.evolves_from_species?.name || null,
      flavorText: this.getFlavorText(species),
      genus: this.getGenus(species),
      color: species.color?.name || 'gray',
      // Will be filled when evo chain is loaded
      evolutionStage: null,
      evolutionChain: null
    };
  }

  getFlavorText(species) {
    const entries = species.flavor_text_entries || [];
    const en = entries.filter(e => e.language.name === 'en');
    if (en.length === 0) return '';
    const latest = en[en.length - 1];
    return latest.flavor_text.replace(/[\n\f\r]/g, ' ');
  }

  getGenus(species) {
    const genera = species.genera || [];
    const en = genera.find(g => g.language.name === 'en');
    return en ? en.genus : '';
  }

  async loadEvolutionChain(url) {
    if (!url || this.evolutionChains.has(url)) {
      return this.evolutionChains.get(url);
    }

    try {
      const data = await fetchEvolutionChain(url);
      const chain = parseEvolutionChain(data.chain);
      this.evolutionChains.set(url, chain);

      // Update evolution stages for all pokemon in this chain
      const totalStages = Math.max(...chain.map(c => c.stage));
      for (const member of chain) {
        const pokemon = this.pokemon.get(member.id);
        if (pokemon) {
          if (chain.length === 1) {
            pokemon.evolutionStage = 'no-evolution';
          } else {
            pokemon.evolutionStage = member.stageLabel;
          }
          pokemon.evolutionChain = chain;
        }
      }

      return chain;
    } catch (e) {
      console.warn('Failed to load evolution chain:', url, e);
      return null;
    }
  }

  async loadAllEvolutionStages() {
    const urls = new Set();
    for (const p of this.pokemon.values()) {
      if (p.evolutionChainUrl && !this.evolutionChains.has(p.evolutionChainUrl)) {
        urls.add(p.evolutionChainUrl);
      }
    }

    const urlArray = [...urls];
    // Load in batches for performance
    for (let i = 0; i < urlArray.length; i += 10) {
      const batch = urlArray.slice(i, i + 10);
      await Promise.allSettled(batch.map(url => this.loadEvolutionChain(url)));
    }

    // Set unknown stages for pokemon without chain data
    for (const p of this.pokemon.values()) {
      if (p.evolutionStage === null) {
        p.evolutionStage = 'no-evolution';
      }
    }

    this.notify();
  }

  getAll() {
    return [...this.pokemon.values()];
  }

  getById(id) {
    return this.pokemon.get(id);
  }

  get hasMore() {
    return this.loadedOffset < this.totalCount;
  }
}

export const store = new DataStore();
