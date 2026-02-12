// Filter state and logic

class FilterManager {
  constructor() {
    this.filters = {
      search: '',
      types: [],
      stages: [],
      generation: '',
      game: '',
      categories: []
    };
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.filters));
  }

  setSearch(value) {
    this.filters.search = value.trim().toLowerCase();
    this.notify();
  }

  toggleType(type) {
    const idx = this.filters.types.indexOf(type);
    if (idx >= 0) this.filters.types.splice(idx, 1);
    else this.filters.types.push(type);
    this.notify();
  }

  toggleStage(stage) {
    const idx = this.filters.stages.indexOf(stage);
    if (idx >= 0) this.filters.stages.splice(idx, 1);
    else this.filters.stages.push(stage);
    this.notify();
  }

  setGeneration(gen) {
    this.filters.generation = this.filters.generation === gen ? '' : gen;
    this.notify();
  }

  setGame(game) {
    this.filters.game = this.filters.game === game ? '' : game;
    this.notify();
  }

  toggleCategory(cat) {
    const idx = this.filters.categories.indexOf(cat);
    if (idx >= 0) this.filters.categories.splice(idx, 1);
    else this.filters.categories.push(cat);
    this.notify();
  }

  clearAll() {
    this.filters = {
      search: '',
      types: [],
      stages: [],
      generation: '',
      game: '',
      categories: []
    };
    this.notify();
  }

  removeFilter(key, value) {
    if (key === 'search') this.filters.search = '';
    else if (key === 'generation') this.filters.generation = '';
    else if (key === 'game') this.filters.game = '';
    else if (Array.isArray(this.filters[key])) {
      const idx = this.filters[key].indexOf(value);
      if (idx >= 0) this.filters[key].splice(idx, 1);
    }
    this.notify();
  }

  get activeCount() {
    let count = 0;
    if (this.filters.search) count++;
    count += this.filters.types.length;
    count += this.filters.stages.length;
    if (this.filters.generation) count++;
    if (this.filters.game) count++;
    count += this.filters.categories.length;
    return count;
  }

  get activeTags() {
    const tags = [];
    if (this.filters.search) {
      tags.push({ key: 'search', value: this.filters.search, label: `Search: "${this.filters.search}"` });
    }
    this.filters.types.forEach(t => tags.push({ key: 'types', value: t, label: capitalise(t) }));
    this.filters.stages.forEach(s => tags.push({ key: 'stages', value: s, label: stageLabel(s) }));
    if (this.filters.generation) {
      tags.push({ key: 'generation', value: this.filters.generation, label: genLabel(this.filters.generation) });
    }
    if (this.filters.game) {
      tags.push({ key: 'game', value: this.filters.game, label: capitalise(this.filters.game.replace(/-/g, ' ')) });
    }
    this.filters.categories.forEach(c => tags.push({ key: 'categories', value: c, label: capitalise(c) }));
    return tags;
  }

  applyFilters(pokemonList) {
    const f = this.filters;
    return pokemonList.filter(pokemon => {
      // Search
      if (f.search) {
        const matchesName = pokemon.name.includes(f.search);
        const matchesId = pokemon.id === parseInt(f.search);
        if (!matchesName && !matchesId) return false;
      }

      // Types
      if (f.types.length > 0) {
        if (!f.types.some(t => pokemon.types.includes(t))) return false;
      }

      // Evolution Stage
      if (f.stages.length > 0) {
        if (!pokemon.evolutionStage || !f.stages.includes(pokemon.evolutionStage)) return false;
      }

      // Generation
      if (f.generation) {
        if (pokemon.generation !== f.generation) return false;
      }

      // Game
      if (f.game) {
        if (!pokemon.games.includes(f.game)) return false;
      }

      // Category
      if (f.categories.length > 0) {
        const matchesCat = f.categories.some(c => {
          if (c === 'baby') return pokemon.isBaby;
          if (c === 'legendary') return pokemon.isLegendary;
          if (c === 'mythical') return pokemon.isMythical;
          return false;
        });
        if (!matchesCat) return false;
      }

      return true;
    });
  }
}

function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function stageLabel(s) {
  const map = { 'basic': 'Basic', 'stage-1': 'Stage 1', 'stage-2': 'Stage 2', 'no-evolution': 'No Evolution' };
  return map[s] || s;
}

function genLabel(g) {
  const num = g.replace('generation-', '').toUpperCase();
  return `Gen ${num}`;
}

export const filterManager = new FilterManager();
