import { TYPE_COLORS, STAT_NAMES } from '../constants.js';
import { store } from '../dataStore.js';

export async function renderPokemonDetail(pokemonId) {
  const pokemon = store.getById(pokemonId);
  if (!pokemon) return '<p>Pokémon not found.</p>';

  // Load evolution chain if not yet loaded
  if (pokemon.evolutionChainUrl && !pokemon.evolutionChain) {
    await store.loadEvolutionChain(pokemon.evolutionChainUrl);
  }

  const primaryType = pokemon.types[0];
  const typeColor = TYPE_COLORS[primaryType]?.bg || '#888';

  return `
    <div class="detail-view" style="--detail-color: ${typeColor}">
      <!-- Top Section -->
      <div class="detail-top">
        <div class="detail-sprite-area">
          <div class="detail-circle"></div>
          <img 
            class="detail-sprite" 
            src="${pokemon.sprite || pokemon.spriteSmall}" 
            alt="${pokemon.name}"
          />
        </div>
        <div class="detail-info">
          <span class="detail-id">#${String(pokemon.id).padStart(3, '0')}</span>
          <h2 class="detail-name">${capitalize(pokemon.name)}</h2>
          <p class="detail-genus">${pokemon.genus}</p>
          <div class="detail-types">
            ${pokemon.types.map(t => `
              <span class="type-pill type-pill-lg" style="background:${TYPE_COLORS[t]?.bg};color:${TYPE_COLORS[t]?.text}">
                ${capitalize(t)}
              </span>
            `).join('')}
          </div>
          <div class="detail-meta">
            <div class="meta-item">
              <span class="meta-label">Height</span>
              <span class="meta-value">${(pokemon.height / 10).toFixed(1)} m</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Weight</span>
              <span class="meta-value">${(pokemon.weight / 10).toFixed(1)} kg</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Generation</span>
              <span class="meta-value">${genLabel(pokemon.generation)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Flavor Text -->
      <div class="detail-section">
        <p class="detail-flavor">${pokemon.flavorText || 'No description available.'}</p>
      </div>

      <!-- Stats -->
      <div class="detail-section">
        <h3 class="section-title">Base Stats</h3>
        <div class="stats-grid">
          ${Object.entries(pokemon.stats).map(([stat, val]) => `
            <div class="stat-row">
              <span class="stat-label">${STAT_NAMES[stat] || stat}</span>
              <span class="stat-value">${val}</span>
              <div class="stat-bar-bg">
                <div class="stat-bar" style="width:${Math.min(val / 255 * 100, 100)}%;background:${getStatColor(val)}"></div>
              </div>
            </div>
          `).join('')}
          <div class="stat-row stat-total">
            <span class="stat-label">Total</span>
            <span class="stat-value">${Object.values(pokemon.stats).reduce((a, b) => a + b, 0)}</span>
            <div class="stat-bar-bg">
              <div class="stat-bar" style="width:${Math.min(Object.values(pokemon.stats).reduce((a, b) => a + b, 0) / 720 * 100, 100)}%;background:var(--detail-color)"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Abilities -->
      <div class="detail-section">
        <h3 class="section-title">Abilities</h3>
        <div class="abilities-list">
          ${pokemon.abilities.map(a => `
            <span class="ability-tag ${a.isHidden ? 'ability-hidden' : ''}">
              ${capitalize(a.name.replace(/-/g, ' '))}
              ${a.isHidden ? '<small>(Hidden)</small>' : ''}
            </span>
          `).join('')}
        </div>
      </div>

      <!-- Evolution Chain -->
      ${pokemon.evolutionChain && pokemon.evolutionChain.length > 1 ? `
        <div class="detail-section">
          <h3 class="section-title">Evolution Chain</h3>
          <div class="evo-chain">
            ${pokemon.evolutionChain.map((evo, i) => `
              ${i > 0 ? '<div class="evo-arrow">→</div>' : ''}
              <div class="evo-member ${evo.id === pokemon.id ? 'evo-current' : ''}" data-pokemon-id="${evo.id}">
                <img 
                  class="evo-sprite" 
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${evo.id}.png" 
                  alt="${evo.name}"
                  onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evo.id}.png'"
                />
                <span class="evo-name">${capitalize(evo.name)}</span>
                <span class="evo-stage-label">${stageLabel(evo.stageLabel)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Badges -->
      <div class="detail-badges">
        ${pokemon.isBaby ? '<span class="badge badge-baby">Baby</span>' : ''}
        ${pokemon.isLegendary ? '<span class="badge badge-legendary">Legendary</span>' : ''}
        ${pokemon.isMythical ? '<span class="badge badge-mythical">Mythical</span>' : ''}
      </div>
    </div>
  `;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function genLabel(g) {
  const num = g?.replace('generation-', '').toUpperCase() || '?';
  return `Gen ${num}`;
}

function stageLabel(s) {
  const map = { 'basic': 'Basic', 'stage-1': 'Stage 1', 'stage-2': 'Stage 2', 'no-evolution': 'No Evo' };
  return map[s] || s;
}

function getStatColor(val) {
  if (val < 50) return '#f44336';
  if (val < 80) return '#ff9800';
  if (val < 100) return '#ffeb3b';
  if (val < 130) return '#8bc34a';
  return '#4caf50';
}
