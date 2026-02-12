import { TYPE_COLORS } from '../constants.js';

export function createPokemonCard(pokemon) {
  const card = document.createElement('div');
  card.className = 'pokemon-card';
  card.dataset.pokemonId = pokemon.id;
  
  const primaryType = pokemon.types[0];
  const typeColor = TYPE_COLORS[primaryType]?.bg || '#888';
  card.style.setProperty('--type-color', typeColor);

  card.innerHTML = `
    <div class="card-bg-circle"></div>
    <div class="card-id">#${String(pokemon.id).padStart(3, '0')}</div>
    <div class="card-sprite-wrap">
      <img 
        class="card-sprite" 
        src="${pokemon.sprite || pokemon.spriteSmall}" 
        alt="${pokemon.name}"
        loading="lazy"
        onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png'"
      />
    </div>
    <h3 class="card-name">${capitalize(pokemon.name)}</h3>
    <div class="card-types">
      ${pokemon.types.map(t => `
        <span class="type-pill" style="background:${TYPE_COLORS[t]?.bg || '#888'};color:${TYPE_COLORS[t]?.text || '#fff'}">
          ${capitalize(t)}
        </span>
      `).join('')}
    </div>
  `;

  return card;
}

export function createSkeletonCard() {
  const card = document.createElement('div');
  card.className = 'pokemon-card skeleton-card';
  card.innerHTML = `
    <div class="skeleton-id"></div>
    <div class="skeleton-sprite"></div>
    <div class="skeleton-name"></div>
    <div class="skeleton-types">
      <div class="skeleton-pill"></div>
      <div class="skeleton-pill"></div>
    </div>
  `;
  return card;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
