import { TYPE_COLORS, STAT_NAMES, GAME_GROUPS, VERSION_DATA, VERSION_TO_FOLDER } from '../constants.js';
import { store } from '../dataStore.js';
import { calculateDefensiveEffectiveness, ALL_TYPES } from '../typeEffectiveness.js';
import { fetchMove } from '../api.js';

let activeTab = 'INFORMATION';
let activeMoveMethod = 'level-up';
let currentVersion = 'red'; // Default version for the active gen tab
let moveSearchQuery = '';
const moveTypeCache = new Map(); // name -> type

export async function renderPokemonDetail(pokemonId) {
  const pokemon = store.getById(pokemonId);
  if (!pokemon) return '<p>Pokémon not found.</p>';

  // Load supplemental data
  if (pokemon.evolutionChainUrl && !pokemon.evolutionChain) {
    await store.loadEvolutionChain(pokemon.evolutionChainUrl);
  }
  
  if (!pokemon.encounters) {
    await store.loadEncounters(pokemonId);
  }

  // Pre-calculate effectiveness
  if (!pokemon.effectiveness) {
    pokemon.effectiveness = await calculateDefensiveEffectiveness(pokemon.types);
  }

  // Pre-fetch move types for the current generation
  const availableGens = getAvailableGens(pokemon);
  if (activeTab !== 'INFORMATION') {
    await prefetchMoveTypes(pokemon, activeTab);
  }

  // If activeTab is not INFORMATION and not in availableGens, reset to INFORMATION
  if (activeTab !== 'INFORMATION' && !availableGens.includes(activeTab)) {
    activeTab = 'INFORMATION';
  }

  return renderFullDetail(pokemon, availableGens);
}

async function prefetchMoveTypes(pokemon, genLabel) {
  const genToGroups = {
    'Gen I': ['red-blue', 'yellow'],
    'Gen II': ['gold-silver', 'crystal'],
    'Gen III': ['ruby-sapphire', 'emerald', 'firered-leafgreen'],
    'Gen IV': ['diamond-pearl', 'platinum', 'heartgold-soulsilver'],
    'Gen V': ['black-white', 'black-2-white-2'],
    'Gen VI': ['x-y', 'omega-ruby-alpha-sapphire'],
    'Gen VII': ['sun-moon', 'ultra-sun-ultra-moon', 'lets-go-pikachu-eevee'],
    'Gen VIII': ['sword-shield', 'the-isle-of-armor', 'the-crown-tundra', 'brilliant-diamond-shining-pearl', 'legends-arceus'],
    'Gen IX': ['scarlet-violet', 'the-teal-mask', 'the-indigo-disk']
  };
  const groups = genToGroups[genLabel] || [];
  
  const movesToFetch = pokemon.moves.filter(m => {
    return m.version_group_details.some(d => groups.includes(d.version_group.name)) && !moveTypeCache.has(m.move.name);
  });

  if (movesToFetch.length > 0) {
    const batchSize = 10;
    for (let i = 0; i < movesToFetch.length; i += batchSize) {
      const batch = movesToFetch.slice(i, i + batchSize);
      await Promise.all(batch.map(async m => {
        try {
          const moveData = await fetchMove(m.move.name);
          moveTypeCache.set(m.move.name, moveData.type.name);
        } catch (e) {
          console.warn(`Failed to fetch move type for ${m.move.name}`, e);
        }
      }));
    }
  }
}

function getAvailableGens(pokemon) {
  const gens = [];
  const versionGroups = new Set();
  pokemon.moves.forEach(m => {
    m.version_group_details.forEach(d => versionGroups.add(d.version_group.name));
  });

  const groupToGen = {
    'red-blue': 'Gen I', 'yellow': 'Gen I',
    'gold-silver': 'Gen II', 'crystal': 'Gen II',
    'ruby-sapphire': 'Gen III', 'emerald': 'Gen III', 'firered-leafgreen': 'Gen III',
    'diamond-pearl': 'Gen IV', 'platinum': 'Gen IV', 'heartgold-soulsilver': 'Gen IV',
    'black-white': 'Gen V', 'black-2-white-2': 'Gen V',
    'x-y': 'Gen VI', 'omega-ruby-alpha-sapphire': 'Gen VI',
    'sun-moon': 'Gen VII', 'ultra-sun-ultra-moon': 'Gen VII', 'lets-go-pikachu-eevee': 'Gen VII',
    'sword-shield': 'Gen VIII', 'the-isle-of-armor': 'Gen VIII', 'the-crown-tundra': 'Gen VIII', 'brilliant-diamond-shining-pearl': 'Gen VIII', 'legends-arceus': 'Gen VIII',
    'scarlet-violet': 'Gen IX', 'the-teal-mask': 'Gen IX', 'the-indigo-disk': 'Gen IX'
  };

  versionGroups.forEach(group => {
    if (groupToGen[group]) gens.push(groupToGen[group]);
  });

  return Array.from(new Set(gens)).sort();
}

function renderFullDetail(pokemon, availableGens) {
  const primaryType = pokemon.types[0];
  const typeColor = TYPE_COLORS[primaryType]?.bg || '#888';
  
  return `
    <div class="detail-view-new" style="--detail-color: ${typeColor}">
      <span class="bg-id-text">#${String(pokemon.id).padStart(2, '0')}</span>
      
      <!-- Header Section -->
      <div class="detail-header-premium">
        <div class="header-sprite-wrap">
          <img class="header-sprite-premium" src="${pokemon.sprite}" alt="${pokemon.name}">
        </div>
        <div class="header-info-premium">
          <h1 class="pokemon-name-huge">${capitalize(pokemon.name)}</h1>
          <div class="header-meta-pills">
            ${pokemon.types.map(t => `
              <span class="meta-pill" style="background:${TYPE_COLORS[t]?.bg}; color:${TYPE_COLORS[t]?.text}">
                ${capitalize(t)}
              </span>
            `).join('')}
          </div>
          <div class="header-stats-row">
            <div class="h-stat-item">
              <span class="h-stat-label">Height</span>
              <span class="h-stat-value">${(pokemon.height / 10).toFixed(1)} m</span>
            </div>
            <div class="h-stat-item">
              <span class="h-stat-label">Weight</span>
              <span class="h-stat-value">${(pokemon.weight / 10).toFixed(1)} kg</span>
            </div>
            <div class="h-stat-item">
              <span class="h-stat-label">Exp</span>
              <span class="h-stat-value">${pokemon.baseExp || '---'}</span>
            </div>
            <div class="h-stat-item">
              <span class="h-stat-label">Catch Rate</span>
              <span class="h-stat-value">${pokemon.captureRate || '---'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="detail-tabs">
        <button class="tab-btn ${activeTab === 'INFORMATION' ? 'active' : ''}" onclick="window.switchDetailTab('INFORMATION')">Information</button>
        ${availableGens.map(gen => `
          <button class="tab-btn ${activeTab === gen ? 'active' : ''}" onclick="window.switchDetailTab('${gen}')">${gen}</button>
        `).join('')}
      </div>

      <!-- Content -->
      <div class="tab-content" id="detail-tab-content">
        ${activeTab === 'INFORMATION' ? renderInfoTab(pokemon) : renderVersionTab(pokemon, activeTab)}
      </div>
    </div>
  `;
}

const TYPE_ICONS = {
  normal: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>`,
  fire: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2S7 7 7 12s5 10 5 10s5-5 5-10s-5-10-5-10zm0 14.5c-1.38 0-2.5-1.12-2.5-2.5s2.5-5.5 2.5-5.5s2.5 4.12 2.5 5.5s-1.12 2.5-2.5 2.5z"/></svg>`,
  water: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2s-7 7-7 12s5 8 7 8s7-3 7-8s-7-12-7-12zm0 15c-1.66 0-3-1.34-3-3s3-6 3-6s3 4.34 3 6s-1.34 3-3 3z"/></svg>`,
  electric: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>`,
  grass: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M17 2H7v2h10V2zm-3 4H10v2h4V6zm-2 4h-4v2h4v-2zm-6 4h4v2H6v-2zm-2 4h4v2H4v-2zm16-4h-4v2h4v-2zm-2 4h-4v2h4v-2zm2-8h-4v2h4V8zm-2-4h-4v2h4V4z"/></svg>`,
  ice: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l2.5 4.33L19 5l-1.67 4.33L22 12l-4.67 2.67L19 19l-4.5-1.33L12 22l-2.5-4.33L5 19l1.67-4.33L2 12l4.67-2.67L5 5l4.5 1.33L12 2z"/></svg>`,
  fighting: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l-2 4l-4 2l4 2l2 4l2-4l4-2l-4-2l-2-4zm0 11l-1 2l-2 1l2 1l1 2l1-2l2-1l-2-1l-1-2z"/></svg>`,
  poison: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>`,
  ground: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M22 14l-4-4l-4 4l-4-4l-4 4l-4-4l-4 4v6h24v-6z"/></svg>`,
  flying: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 5.5c-4.69 0-8.5 3.81-8.5 8.5s3.81 8.5 8.5 8.5s8.5-3.81 8.5-8.5s-3.81-8.5-8.5-8.5zm0 14c-3.03 0-5.5-2.47-5.5-5.5s2.47-5.5 5.5-5.5s5.5 2.47 5.5 5.5s-2.47 5.5-5.5 5.5zM2 10.5c0 4.69 3.81 8.5 8.5 8.5s8.5-3.81 8.5-8.5s-3.81-8.5-8.5-8.5S2 5.81 2 10.5z"/></svg>`,
  psychic: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>`,
  bug: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41L15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3L7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8z"/></svg>`,
  rock: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L2 22h20L12 2zm0 5l6.5 13h-13L12 7z"/></svg>`,
  ghost: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C7.58 2 4 5.58 4 10v12l3-3l3 3l3-3l3 3l3-3l3 3V10c0-4.42-3.58-8-8-8zm2 8c-.55 0-1-.45-1-1s.45-1 1-1s1 .45 1 1s-.45 1-1 1zm-4 0c-.55 0-1-.45-1-1s.45-1 1-1s1 .45 1 1s-.45 1-1 1z"/></svg>`,
  dragon: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l-4 4l-4 4l4 4l4 4l4-4l4-4l-4-4l-4-4zM9 12l2-2l2 2l-2 2l-2-2z"/></svg>`,
  dark: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12 7v10a5 5 0 0 0 0-10z" fill="currentColor"/></svg>`,
  steel: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L2 7v10l10 5l10-5V7L12 2zm0 17.5L4.5 16V8.5L12 5l7.5 3.5V16L12 19.5z"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`,
  fairy: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l-2 4l-4 2l4 2l2 4l2-4l4-2l-4-2l-2-4z"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`
};

function renderInfoTab(pokemon) {
  let effectivenessHtml = '';
  if (pokemon.effectiveness) {
    effectivenessHtml = renderTypeEffectiveness(pokemon.effectiveness, pokemon.name);
  } else {
    effectivenessHtml = '<p style="color: #555;">Loading effectiveness...</p>';
  }

  const flavorTextContent = Object.values(pokemon.flavorText || {})[0] || 'No description available.';

  return `
    <div class="content-section">
      <div class="premium-section-header">
         <div class="header-main-row">
           <div class="header-icon-box" style="background: rgba(6, 214, 160, 0.1); color: #06D6A0;">
             <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
           </div>
           <h3 class="premium-header-title">Description</h3>
         </div>
      </div>
      <p class="detail-flavor" style="color: #aaa; font-size: 1.1rem; line-height: 1.6; margin-top: 10px;">
        ${flavorTextContent}
      </p>
    </div>
    
    <div class="content-section">
      <div class="premium-section-header">
         <div class="header-main-row">
           <div class="header-icon-box" style="background: rgba(255, 209, 102, 0.1); color: #FFD166;">
             <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
           </div>
           <h3 class="premium-header-title">Base Stats</h3>
         </div>
      </div>
      <div class="stats-grid" style="margin-top: 20px;">
        ${Object.entries(pokemon.stats).map(([stat, val]) => `
          <div class="stat-row" style="margin-bottom: 12px; display: flex; align-items: center; gap: 15px;">
            <span class="stat-label" style="color: #666; font-weight: 700; width: 120px; text-transform: uppercase; font-size: 0.75rem;">${STAT_NAMES[stat] || stat}</span>
            <span class="stat-value" style="font-weight: 800; width: 40px; color: #eee;">${val}</span>
            <div class="stat-bar-bg" style="flex:1; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
              <div class="stat-bar" style="width:${Math.min(val / 200 * 100, 100)}%; background: var(--detail-color); height: 100%;"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="content-section">
      <div class="premium-section-header">
         <div class="header-main-row">
           <div class="header-icon-box" style="background: rgba(230, 57, 70, 0.1); color: #E63946;">
             <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
           </div>
           <h3 class="premium-header-title">Strengths And Weaknesses</h3>
         </div>
         <p class="premium-header-subtitle">See ${capitalize(pokemon.name)}'s strengths and weaknesses in general.</p>
      </div>
      ${effectivenessHtml}
    </div>

    ${pokemon.evolutionChain && pokemon.evolutionChain.length > 1 ? `
      <div class="content-section">
        <div class="premium-section-header">
           <div class="header-main-row">
             <div class="header-icon-box" style="background: rgba(17, 138, 178, 0.1); color: #118AB2;">
               <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>
             </div>
             <h3 class="premium-header-title">Evolution Chain</h3>
           </div>
        </div>
        <div class="evo-chain" style="display: flex; align-items: center; gap: 20px; margin-top: 20px; overflow-x: auto; padding-bottom: 20px;">
          ${pokemon.evolutionChain.map((evo, i) => `
            ${i > 0 ? '<div style="color: #444; font-size: 1.5rem;">→</div>' : ''}
            <div class="evo-member" onclick="window.switchPokemon(${evo.id})" style="text-align: center; cursor: pointer; min-width: 100px;">
              <div style="background: rgba(255,255,255,0.03); border-radius: 50%; padding: 10px; margin-bottom: 10px; border: 2px solid ${evo.id === pokemon.id ? 'var(--detail-color)' : 'transparent'}">
                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${evo.id}.png" alt="${evo.name}" style="width: 70px; height: 70px; object-fit: contain;">
              </div>
              <div style="font-weight: 800; font-size: 0.85rem; color: #eee;">${capitalize(evo.name)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function renderTypeEffectiveness(effectiveness, pokemonName) {
  if (!effectiveness) return '<p style="color: #444;">No data available.</p>';

  const getBadgeClass = (mult) => {
    if (mult === 2) return 'weak';
    if (mult === 4) return 'v-weak';
    if (mult === 0.5) return 'resistant';
    if (mult === 0.25) return 'v-resistant';
    if (mult === 0) return 'immune';
    return '';
  };

  const getBadgeText = (mult) => {
    if (mult === 0.5) return '½';
    if (mult === 0.25) return '¼';
    return mult;
  };

  return `
    <div class="eff-grid-container">
      <div class="type-grid-premium">
        ${ALL_TYPES.map(t => {
          const mult = effectiveness[t] ?? 1;
          const isActive = mult !== 1;
          const badgeClass = getBadgeClass(mult);
          const badgeText = getBadgeText(mult);
          const typeColor = TYPE_COLORS[t]?.bg || '#888';

          return `
            <div class="type-card-premium ${isActive ? 'active' : ''}" style="--type-bg: ${isActive ? typeColor : 'rgba(255,255,255,0.05)'}">
              <div class="type-icon-box">
                ${TYPE_ICONS[t] || ''}
              </div>
              <span class="type-label-mini">${t.substring(0, 3)}</span>
              ${isActive ? `<div class="eff-badge-mini ${badgeClass}">${badgeText}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <div class="eff-legend-row">
        <div class="legend-item-compact">
           <div class="legend-dot-mini v-weak" style="background: #F94144;">4</div>
           <span class="legend-text-mini">Very Weak (4×)</span>
        </div>
        <div class="legend-item-compact">
           <div class="legend-dot-mini weak" style="background: #E63946;">2</div>
           <span class="legend-text-mini">Weak (2×)</span>
        </div>
        <div class="legend-item-compact">
           <div class="legend-dot-mini resistant" style="background: #06D6A0;">½</div>
           <span class="legend-text-mini">Resistant (½×)</span>
        </div>
        <div class="legend-item-compact">
           <div class="legend-dot-mini v-resistant" style="background: #2D6A4F;">¼</div>
           <span class="legend-text-mini">Very Resistant (¼×)</span>
        </div>
        <div class="legend-item-compact">
           <div class="legend-dot-mini immune" style="background: #1D1D1F;">0</div>
           <span class="legend-text-mini">Immune (0×)</span>
        </div>
      </div>
    </div>
  `;
}

function renderVersionTab(pokemon, genLabel) {
  const games = GAME_GROUPS[genLabel] || [];
  const versionData = VERSION_DATA[currentVersion] || { name: capitalize(currentVersion), color: '#888' };
  const currentVersionFolder = VERSION_TO_FOLDER[currentVersion] || currentVersion;
  const flavorText = pokemon.flavorText?.[currentVersion] || Object.values(pokemon.flavorText || {})[0] || '...';
  
  const genNumMap = { 'Gen I': 1, 'Gen II': 2, 'Gen III': 3, 'Gen IV': 4, 'Gen V': 5, 'Gen VI': 6, 'Gen VII': 7, 'Gen VIII': 8, 'Gen IX': 9 };
  const genNum = genNumMap[genLabel];
  const romanToSlug = { 1: 'generation-i', 2: 'generation-ii', 3: 'generation-iii', 4: 'generation-iv', 5: 'generation-v', 6: 'generation-vi', 7: 'generation-vii', 8: 'generation-viii', 9: 'generation-ix' };
  const genSlug = romanToSlug[genNum];

  const hasShiny = genNum > 1;

  return `
    <div class="content-section">
      <h3 style="color: #E63946; margin-bottom: 20px; font-weight: 800;">Games</h3>
      <div class="game-tabs">
        ${games.map(g => {
          const gData = VERSION_DATA[g] || { name: capitalize(g), color: '#888' };
          const isActive = currentVersion === g;
          return `
            <button 
              class="game-tab-btn ${isActive ? 'active' : ''}" 
              onclick="window.switchVersion('${g}')"
              style="${isActive ? `background: ${gData.color}; color: ${gData.text || '#fff'};` : ''}"
            >
              ${gData.name}
            </button>
          `;
        }).join('')}
      </div>

      <div class="version-banner">
        <h2 class="version-title">${versionData.name}</h2>
        <div class="version-separator"></div>
        <span class="region-badge">${getRegion(genLabel)}</span>
      </div>

      <div class="version-top-layout" style="display: grid; grid-template-columns: 280px 1fr; gap: 30px; margin-bottom: 40px;">
        <div class="side-nav-column">
           <div class="quick-links-card">
              <span class="quick-links-title">POKEMON ${versionData.name.toUpperCase()} ${pokemon.name.toUpperCase()}</span>
              <ul class="quick-links-list">
                 <li><a href="#section-entry"><span class="dot-red"></span>Pokedex entry</a></li>
                 <li><a href="#section-sprites"><span class="dot-red"></span>Sprites</a></li>
                 <li><a href="#section-moves"><span class="dot-red"></span>Moves</a></li>
                 <li><a href="#section-locations"><span class="dot-red"></span>Location</a></li>
              </ul>
           </div>
           
           <div class="capture-status-card">
              <div class="capture-icon-box">
                 <svg viewBox="0 0 24 24" width="32" height="32" fill="#555"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
              </div>
              <div class="capture-info">
                 <span class="capture-label">UNTRACKED</span>
                 <span class="capture-value">Capture Pokémon</span>
              </div>
           </div>
        </div>

        <div class="main-version-content">
          <!-- Entry card -->
          <div id="section-entry" class="entry-card-ruby">
            <div class="entry-side-accent" style="background: ${versionData.color}">
              <div class="accent-dot" style="background: rgba(255,255,255,0.4);"></div>
              <div class="accent-dot" style="background: #FFD166;"></div>
              <div class="accent-dot" style="background: #EF476F;"></div>
              <div class="accent-dot" style="background: #06D6A0;"></div>
            </div>
            <div class="entry-main-content">
              <div class="entry-text-box">
                 <div style="width: 40px; height: 3px; background: ${versionData.color}; margin-bottom: 15px;"></div>
                 <span class="entry-label" style="color: ${versionData.color};">${capitalize(pokemon.name)} ${versionData.name} Pokedex Entry</span>
                 <p class="entry-text">"${flavorText}"</p>
              </div>
              <div id="section-sprites" class="sprites-box">
                 <div class="sprites-grid-premium">
                    <div class="sprite-card-mini">
                      <img class="sprite-img-mini" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/${genSlug}/${currentVersionFolder}/${pokemon.id}.png" onerror="this.style.display='none'">
                      <span class="sprite-label-mini">Primary</span>
                    </div>
                    <div class="sprite-card-mini">
                      <img class="sprite-img-mini" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/${genSlug}/${currentVersionFolder}/back/${pokemon.id}.png" onerror="this.style.display='none'">
                      <span class="sprite-label-mini">Reverse</span>
                    </div>
                    ${hasShiny ? `
                      <div class="sprite-card-mini">
                        <img class="sprite-img-mini" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/${genSlug}/${currentVersionFolder}/shiny/${pokemon.id}.png" onerror="this.style.display='none'; this.nextElementSibling.style.display='none'">
                        <span class="sprite-label-mini">Shiny</span>
                      </div>
                      <div class="sprite-card-mini">
                        <img class="sprite-img-mini" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/${genSlug}/${currentVersionFolder}/back/shiny/${pokemon.id}.png" onerror="this.style.display='none'; this.nextElementSibling.style.display='none'">
                        <span class="sprite-label-mini">Shiny Back</span>
                      </div>
                    ` : ''}
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Moveset -->
      <div id="section-moves" class="content-section" style="margin-top: 40px;">
        <div class="premium-section-header">
           <div class="header-main-row">
             <div class="header-icon-box" style="background: rgba(230, 57, 70, 0.1); color: #E63946;">
               <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
             </div>
             <h3 class="premium-header-title">Pokemon ${versionData.name} ${capitalize(pokemon.name)} Moveset</h3>
           </div>
           <p class="premium-header-subtitle">Complete registry of moves learned by ${capitalize(pokemon.name)} via various methods in ${versionData.name}.</p>
        </div>
        
        <div class="moves-controls-row">
          <div class="search-box-premium">
            <svg class="search-icon-mini" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input type="text" placeholder="Search moves..." value="${moveSearchQuery}" oninput="window.handleMoveSearch(this.value)">
          </div>
          <div class="moves-filter-pills">
            <button class="pill-btn ${activeMoveMethod === 'level-up' ? 'active' : ''}" onclick="window.switchMoveMethod('level-up')">LEVEL UP</button>
            <button class="pill-btn ${activeMoveMethod === 'machine' ? 'active' : ''}" onclick="window.switchMoveMethod('machine')">TM/HM</button>
            <button class="pill-btn ${activeMoveMethod === 'egg' ? 'active' : ''}" onclick="window.switchMoveMethod('egg')">EGG</button>
            <button class="pill-btn ${activeMoveMethod === 'tutor' ? 'active' : ''}" onclick="window.switchMoveMethod('tutor')">TUTOR</button>
          </div>
        </div>

        <table class="premium-moves-table">
          <thead>
            <tr>
              <th>MOVE</th>
              <th>TYPE</th>
              <th style="text-align: right;">REQUIREMENT</th>
            </tr>
          </thead>
          <tbody>
            ${renderMoves(pokemon, genLabel)}
          </tbody>
        </table>
        <div class="moves-footer-text">END OF MOVE DATABASE</div>
      </div>

      <!-- Locations -->
      <div id="section-locations" class="content-section" style="margin-top: 40px;">
        <div class="premium-section-header">
           <div class="header-main-row">
             <div class="header-icon-box" style="background: rgba(230, 57, 70, 0.1); color: #E63946;">
               <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
             </div>
             <h3 class="premium-header-title">Pokemon ${versionData.name} ${capitalize(pokemon.name)} Locations</h3>
           </div>
        </div>

        <div class="locations-container">
          ${renderLocations(pokemon, genLabel)}
        </div>

        <div class="encounter-legend-box" style="margin-top: 40px;">
           <span class="legend-title">ENCOUNTER METHOD LEGEND</span>
           <div class="legend-items">
              <div class="legend-item" style="--legend-color: #2D6A4F;" onclick="window.filterByMethod('walking')"><span class="legend-icon">🌱</span> Walking</div>
              <div class="legend-item" style="--legend-color: #0077B6;" onclick="window.filterByMethod('surfing')"><span class="legend-icon">🌊</span> Surfing</div>
              <div class="legend-item" style="--legend-color: #0096C7;" onclick="window.filterByMethod('fishing')"><span class="legend-icon">🎣</span> Fishing</div>
              <div class="legend-item" style="--legend-color: #FB8500;" onclick="window.filterByMethod('morning')"><span class="legend-icon">🌅</span> Morning</div>
              <div class="legend-item" style="--legend-color: #FFB703;" onclick="window.filterByMethod('day')"><span class="legend-icon">☀️</span> Day</div>
              <div class="legend-item" style="--legend-color: #6A4C93;" onclick="window.filterByMethod('night')"><span class="legend-icon">🌙</span> Night</div>
           </div>
        </div>
      </div>
    </div>
  `;
}

function getRegion(genLabel) {
  const regions = {
    'Gen I': 'KANTO', 'Gen II': 'JOHTO', 'Gen III': 'HOENN',
    'Gen IV': 'SINNOH', 'Gen V': 'UNOVA', 'Gen VI': 'KALOS',
    'Gen VII': 'ALOLA', 'Gen VIII': 'GALAR', 'Gen IX': 'PALDEA'
  };
  return regions[genLabel] || 'UNKNOWN';
}

function renderMoves(pokemon, genLabel) {
  const genToGroups = {
    'Gen I': ['red-blue', 'yellow'],
    'Gen II': ['gold-silver', 'crystal'],
    'Gen III': ['ruby-sapphire', 'emerald', 'firered-leafgreen'],
    'Gen IV': ['diamond-pearl', 'platinum', 'heartgold-soulsilver'],
    'Gen V': ['black-white', 'black-2-white-2'],
    'Gen VI': ['x-y', 'omega-ruby-alpha-sapphire'],
    'Gen VII': ['sun-moon', 'ultra-sun-ultra-moon', 'lets-go-pikachu-eevee'],
    'Gen VIII': ['sword-shield', 'the-isle-of-armor', 'the-crown-tundra', 'brilliant-diamond-shining-pearl', 'legends-arceus'],
    'Gen IX': ['scarlet-violet', 'the-teal-mask', 'the-indigo-disk']
  };
  
  const groups = genToGroups[genLabel] || [];

  let filteredMoves = pokemon.moves.filter(m => {
    return m.version_group_details.some(d => 
      groups.includes(d.version_group.name) && d.move_learn_method.name === activeMoveMethod
    );
  });

  if (moveSearchQuery) {
    const query = moveSearchQuery.toLowerCase();
    filteredMoves = filteredMoves.filter(m => m.move.name.replace(/-/g, ' ').toLowerCase().includes(query));
  }

  if (filteredMoves.length === 0) return '<tr><td colspan="3" style="text-align:center; padding: 40px; color: #555; font-weight: 700;">No moves found matching your criteria.</td></tr>';

  return filteredMoves.map(m => {
    const detail = m.version_group_details.find(d => groups.includes(d.version_group.name) && d.move_learn_method.name === activeMoveMethod);
    const req = activeMoveMethod === 'level-up' ? `LV ${detail.level_learned_at}` : activeMoveMethod === 'machine' ? 'TM' : 'Special';
    const type = moveTypeCache.get(m.move.name) || 'normal';
    const typeColor = TYPE_COLORS[type]?.bg || '#888';
    
    return `
      <tr>
        <td style="font-weight: 800; color: #eee; padding: 18px 12px;">${capitalize(m.move.name.replace(/-/g, ' '))}</td>
        <td style="padding: 18px 12px;"><span style="color: ${typeColor}; font-weight: 900; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">${type.toUpperCase()}</span></td>
        <td style="text-align: right; color: #888; font-weight: 800; font-size: 0.75rem; padding: 18px 12px;">${req}</td>
      </tr>
    `;
  }).join('');
}

function renderLocations(pokemon, genLabel) {
  if (!pokemon.encounters || pokemon.encounters.length === 0) {
    return '<p style="color: #555; padding: 20px;">No location data available.</p>';
  }

  const genToVersions = {
    'Gen I': ['red', 'blue', 'yellow'],
    'Gen II': ['gold', 'silver', 'crystal'],
    'Gen III': ['ruby', 'sapphire', 'emerald', 'firered', 'leafgreen'],
    'Gen IV': ['diamond', 'pearl', 'platinum', 'heartgold', 'soulsilver'],
    'Gen V': ['black', 'white', 'black-2', 'white-2'],
    'Gen VI': ['x', 'y', 'omega-ruby', 'alpha-sapphire'],
    'Gen VII': ['sun', 'moon', 'ultra-sun', 'ultra-moon', 'lets-go-pikachu', 'lets-go-eevee'],
    'Gen VIII': ['sword', 'shield', 'brilliant-diamond', 'shining-pearl', 'legends-arceus'],
    'Gen IX': ['scarlet', 'violet']
  };
  
  const versions = genToVersions[genLabel] || [];

  const genEncounters = pokemon.encounters.filter(e => 
    e.version_details.some(v => versions.includes(v.version.name))
  );

  if (genEncounters.length === 0) return '<p style="color: #555; padding: 20px;">Not found in the wild in this generation.</p>';

  const methodIcons = {
    'walking': '🌱', 'surfing': '🌊', 'fishing': '🎣', 'old-rod': '🎣', 'good-rod': '🎣', 'super-rod': '🎣'
  };

  const methodColors = {
    'walking': '#2D6A4F', 'surfing': '#0077B6', 'fishing': '#0096C7', 'morning': '#FB8500', 'day': '#FFB703', 'night': '#6A4C93'
  };

  return genEncounters.map(e => {
    const detail = e.version_details.find(v => versions.includes(v.version.name));
    
    return `
      <div class="premium-location-card">
        <div class="loc-card-header">
           <span class="loc-header-dot"></span>
           <span class="loc-card-title">${capitalize(e.location_area.name.replace(/-/g, ' '))}</span>
        </div>
        <div class="loc-card-body">
           ${detail.encounter_details.map(d => {
             const method = d.method.name;
             const chance = d.chance;
             const minLvl = d.min_level;
             const maxLvl = d.max_level;
             const condition = d.condition_values?.[0]?.name || 'No Special Conditions';
             const icon = methodIcons[method] || '📍';
             const color = methodColors[method] || '#888';

             return `
               <div class="encounter-row">
                  <div class="method-badge-premium" style="--badge-color: ${color}">
                     <span class="badge-icon-mini">${icon}</span>
                     ${method.toUpperCase().replace(/-/g, ' ')}
                  </div>
                  <span class="level-range">Lv. ${minLvl === maxLvl ? minLvl : `${minLvl}-${maxLvl}`}</span>
                  <span class="encounter-condition">${capitalize(condition.replace(/-/g, ' '))}</span>
                  <div class="chance-badge-premium">
                     ${chance}%
                  </div>
               </div>
             `;
           }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Global Event Handlers for UI
window.switchDetailTab = async function(tab) {
  activeTab = tab;
  moveSearchQuery = ''; 

  const pokemon = store.getById(window.currentPokemonId);
  if (pokemon && tab !== 'INFORMATION') {
    const games = GAME_GROUPS[tab] || [];
    if (games.length > 0) {
      currentVersion = games[0];
    }
    await prefetchMoveTypes(pokemon, tab);
  }

  if (pokemon) {
    const availableGens = getAvailableGens(pokemon);
    document.getElementById('modal-body').innerHTML = renderFullDetail(pokemon, availableGens);
  }
};

window.switchVersion = async function(version) {
  currentVersion = version;
  const pokemon = store.getById(window.currentPokemonId);
  if (pokemon) {
    const availableGens = getAvailableGens(pokemon);
    document.getElementById('modal-body').innerHTML = renderFullDetail(pokemon, availableGens);
  }
};

window.switchPokemon = function(id) {
  if (window.openModal) {
    window.openModal(id);
  }
};

window.switchMoveMethod = function(method) {
  activeMoveMethod = method;
  const pokemon = store.getById(window.currentPokemonId);
  if (pokemon) {
    const availableGens = getAvailableGens(pokemon);
    document.getElementById('modal-body').innerHTML = renderFullDetail(pokemon, availableGens);
  }
};

window.handleMoveSearch = function(query) {
  moveSearchQuery = query;
  const pokemon = store.getById(window.currentPokemonId);
  if (pokemon) {
    const availableGens = getAvailableGens(pokemon);
    const tbody = document.querySelector('.premium-moves-table tbody');
    if (tbody) {
      tbody.innerHTML = renderMoves(pokemon, activeTab);
    }
  }
};
