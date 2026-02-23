/**
 * Manual exclusions for Pokemon per game.
 * This file is the SINGLE SOURCE OF TRUTH for exclusions.
 * To update this file, use the Admin Settings page to generate new content.
 */

export const GAME_EXCLUSIONS = {
  "red": [
    2,
    4,
    6
  ],
  "blue": [
    1
  ]
};

/**
 * Gets the list of excluded IDs for a specific game.
 */
export function getExclusions(gameName) {
  return GAME_EXCLUSIONS[gameName] || [];
}

/**
 * Checks if a pokemon should be hidden from a game.
 */
export function isExcluded(pokemonId, gameName) {
  if (!gameName) return false;
  return getExclusions(gameName).includes(pokemonId);
}
