// Type Effectiveness Calculator
// Computes defensive type matchups for single and dual-type Pokemon
import { fetchTypeData } from './api.js';

const ALL_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
];

// Cache type damage relations
const typeRelationsCache = new Map();

async function getTypeRelations(typeName) {
  if (typeRelationsCache.has(typeName)) return typeRelationsCache.get(typeName);
  const data = await fetchTypeData(typeName);
  const relations = data.damage_relations;
  typeRelationsCache.set(typeName, relations);
  return relations;
}

/**
 * Calculate defensive type effectiveness for a Pokemon.
 * For dual-type, multipliers are combined (multiplied).
 * 
 * @param {string[]} pokemonTypes - e.g. ['grass', 'poison']
 * @returns {Promise<Object>} - { typeName: multiplier } for all 18 types
 */
export async function calculateDefensiveEffectiveness(pokemonTypes) {
  // Initialize all types with 1x multiplier
  const effectiveness = {};
  ALL_TYPES.forEach(t => { effectiveness[t] = 1; });

  for (const defType of pokemonTypes) {
    try {
      const relations = await getTypeRelations(defType);

      // 2x damage from these types
      if (relations.double_damage_from) {
        for (const t of relations.double_damage_from) {
          if (effectiveness[t.name] !== undefined) {
            effectiveness[t.name] *= 2;
          }
        }
      }
      // 0.5x damage from these types
      if (relations.half_damage_from) {
        for (const t of relations.half_damage_from) {
          if (effectiveness[t.name] !== undefined) {
            effectiveness[t.name] *= 0.5;
          }
        }
      }
      // 0x damage from these types (immune)
      if (relations.no_damage_from) {
        for (const t of relations.no_damage_from) {
          if (effectiveness[t.name] !== undefined) {
            effectiveness[t.name] = 0;
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to get damage relations for ${defType}`, e);
    }
  }

  return effectiveness;
}

/**
 * Categorize effectiveness into readable groups.
 * @param {Object} effectiveness - { typeName: multiplier }
 * @returns {Object} categorized results
 */
export function categorizeEffectiveness(effectiveness) {
  const result = {
    veryWeak: [],     // 4x
    weak: [],         // 2x
    neutral: [],      // 1x
    resistant: [],    // 0.5x
    veryResistant: [],// 0.25x
    immune: []        // 0x
  };

  for (const [type, multiplier] of Object.entries(effectiveness)) {
    if (multiplier === 0) result.immune.push(type);
    else if (multiplier >= 4) result.veryWeak.push(type);
    else if (multiplier >= 2) result.weak.push(type);
    else if (multiplier <= 0.25) result.veryResistant.push(type);
    else if (multiplier <= 0.5) result.resistant.push(type);
    else result.neutral.push(type);
  }

  return result;
}

export { ALL_TYPES };
