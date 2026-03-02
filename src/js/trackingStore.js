// ===== Tracking Store – localStorage-based Pokemon catch tracking =====
const LS_CAUGHT = 'pokedex_tracker_caught';
const LS_NOTES  = 'pokedex_tracker_notes';

class TrackingStore {
  constructor() {
    this._caught = null; // { [game]: { [pokemonId]: { caught: bool, shiny: bool } } }
    this._notes  = null; // { [pokemonId]: string }
    this._listeners = new Set();
    this._caughtSpeciesIds = new Set();
    this._shinySpeciesIds = new Set();
  }

  // ---- Lazy loaders ----
  get caught() {
    if (!this._caught) {
      try { this._caught = JSON.parse(localStorage.getItem(LS_CAUGHT) || '{}'); }
      catch { this._caught = {}; }
      this._rebuildCaches();
    }
    return this._caught;
  }

  get notes() {
    if (!this._notes) {
      try { this._notes = JSON.parse(localStorage.getItem(LS_NOTES) || '{}'); }
      catch { this._notes = {}; }
    }
    return this._notes;
  }

  // ---- Observer ----
  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
  notify() { this._listeners.forEach(fn => fn()); }

  // ---- Persistence ----
  _rebuildCaches() {
    this._caughtSpeciesIds = new Set();
    this._shinySpeciesIds = new Set();
    for (const g of Object.values(this.caught)) {
      for (const [id, d] of Object.entries(g)) {
        if (d.caught) this._caughtSpeciesIds.add(String(id));
        if (d.shiny) this._shinySpeciesIds.add(String(id));
      }
    }
  }

  _saveCaught() {
    localStorage.setItem(LS_CAUGHT, JSON.stringify(this._caught));
    this._rebuildCaches();
    this.notify();
  }
  _saveNotes() {
    localStorage.setItem(LS_NOTES, JSON.stringify(this._notes));
    this.notify();
  }

  // ---- Setters ----
  setCaught(game, pokemonId, caught) {
    const id = String(pokemonId);
    if (!this.caught[game]) this.caught[game] = {};
    if (!this.caught[game][id]) this.caught[game][id] = { caught: false, shiny: false };
    this.caught[game][id].caught = caught;
    if (!caught) this.caught[game][id].shiny = false; // releasing removes shiny
    this._saveCaught();
  }

  setShiny(game, pokemonId, shiny) {
    const id = String(pokemonId);
    if (!this.caught[game]) this.caught[game] = {};
    if (!this.caught[game][id]) this.caught[game][id] = { caught: false, shiny: false };
    if (shiny) this.caught[game][id].caught = true; // shiny implies caught
    this.caught[game][id].shiny = shiny;
    this._saveCaught();
  }

  toggleCaught(game, pokemonId) {
    const id = String(pokemonId);
    const cur = this.caught[game]?.[id]?.caught || false;
    this.setCaught(game, pokemonId, !cur);
  }

  toggleShiny(game, pokemonId) {
    const id = String(pokemonId);
    const cur = this.caught[game]?.[id]?.shiny || false;
    this.setShiny(game, pokemonId, !cur);
  }

  setNote(pokemonId, note) {
    const id = String(pokemonId);
    if (!note || !note.trim()) { delete this.notes[id]; }
    else { this.notes[id] = note.trim(); }
    this._saveNotes();
  }

  // ---- Getters ----
  isCaught(game, pokemonId) {
    return !!this.caught[game]?.[String(pokemonId)]?.caught;
  }
  isShiny(game, pokemonId) {
    return !!this.caught[game]?.[String(pokemonId)]?.shiny;
  }
  isCaughtAny(pokemonId) {
    return this._caughtSpeciesIds.has(String(pokemonId));
  }
  isShinyAny(pokemonId) {
    return this._shinySpeciesIds.has(String(pokemonId));
  }
  getNote(pokemonId) {
    return this.notes[String(pokemonId)] || '';
  }

  // ---- Global Stats ----
  getNationalDexCaught() {
    return this._caughtSpeciesIds.size;
  }
  getTotalCaught() {
    let n = 0;
    for (const g of Object.values(this.caught))
      for (const d of Object.values(g))
        if (d.caught) n++;
    return n;
  }
  getUniqueShiny() {
    return this._shinySpeciesIds.size;
  }
  getTotalShiny() {
    let n = 0;
    for (const g of Object.values(this.caught))
      for (const d of Object.values(g))
        if (d.shiny) n++;
    return n;
  }
  getGamesPlayed() {
    let n = 0;
    for (const g of Object.values(this.caught))
      if (Object.values(g).some(d => d.caught)) n++;
    return n;
  }
  getCaughtForGame(game) {
    return Object.values(this.caught[game] || {}).filter(d => d.caught).length;
  }
  getShinyForGame(game) {
    return Object.values(this.caught[game] || {}).filter(d => d.shiny).length;
  }
  getCaughtForRegion(minId, maxId) {
    const ids = new Set();
    for (const g of Object.values(this.caught))
      for (const [id, d] of Object.entries(g)) {
        const n = parseInt(id);
        if (d.caught && n >= minId && n <= maxId) ids.add(id);
      }
    return ids.size;
  }
  getShinyForRegion(minId, maxId) {
    const ids = new Set();
    for (const g of Object.values(this.caught))
      for (const [id, d] of Object.entries(g)) {
        const n = parseInt(id);
        if (d.shiny && n >= minId && n <= maxId) ids.add(id);
      }
    return ids.size;
  }

  // -- Milestone: how many unique species are caught --
  getUniqueCaughtCount() { return this.getNationalDexCaught(); }

  // ---- Import / Export ----
  exportData() {
    return JSON.stringify({ caught: this.caught, notes: this.notes, exportedAt: new Date().toISOString() }, null, 2);
  }
  importData(json) {
    const data = JSON.parse(json);
    this._caught = data.caught || {};
    this._notes  = data.notes  || {};
    this._rebuildCaches();
    this._saveCaught();
    this._saveNotes();
  }
  resetAll() {
    this._caught = {};
    this._notes  = {};
    this._rebuildCaches();
    this._saveCaught();
    this._saveNotes();
  }
}

export const trackingStore = new TrackingStore();
