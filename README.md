# Pokédex

A premium Pokédex web application built with Vanilla JS and Vite, using the [PokeAPI](https://pokeapi.co/).

## Features

- **Search**: Find Pokémon by name or ID (supports partial matches). Keyboard shortcut: `Ctrl+K` / `Cmd+K`.
- **Comprehensive Filters**:
  - **Type**: Filter by 18 elemental types.
  - **Generation**: Filter by Gen I–IX.
  - **Evolution Stage**: Filter by Basic, Stage 1, Stage 2, or No Evolution.
  - **Game Version**: Filter by specific game appearances (Red, Blue, Sword, Shield, etc.).
  - **Category**: Filter for Baby, Legendary, and Mythical Pokémon.
- **Detailed View**: View stats, evolution chains, abilities, and flavor text in a beautiful modal.
- **Pagination**: Browse 1025+ Pokémon with smart pagination and progressive loading.
- **Dark Mode**: Premium dark aesthetic with type-specific color accents.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Tech Stack

- **Framework**: Vanilla JavaScript (ES Modules)
- **Bundler**: Vite
- **CSS**: Custom CSS with CSS Variables (No frameworks)
- **API**: PokeAPI.co
