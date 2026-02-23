// Type color constants
export const TYPE_COLORS = {
  normal:   { bg: '#A8A878', text: '#fff' },
  fire:     { bg: '#F08030', text: '#fff' },
  water:    { bg: '#6890F0', text: '#fff' },
  electric: { bg: '#F8D030', text: '#333' },
  grass:    { bg: '#78C850', text: '#fff' },
  ice:      { bg: '#98D8D8', text: '#333' },
  fighting: { bg: '#C03028', text: '#fff' },
  poison:   { bg: '#A040A0', text: '#fff' },
  ground:   { bg: '#E0C068', text: '#333' },
  flying:   { bg: '#A890F0', text: '#fff' },
  psychic:  { bg: '#F85888', text: '#fff' },
  bug:      { bg: '#A8B820', text: '#fff' },
  rock:     { bg: '#B8A038', text: '#fff' },
  ghost:    { bg: '#705898', text: '#fff' },
  dragon:   { bg: '#7038F8', text: '#fff' },
  dark:     { bg: '#705848', text: '#fff' },
  steel:    { bg: '#B8B8D0', text: '#333' },
  fairy:    { bg: '#EE99AC', text: '#333' }
};

export const STAT_NAMES = {
  'hp': 'HP',
  'attack': 'ATK',
  'defense': 'DEF',
  'special-attack': 'SpA',
  'special-defense': 'SpD',
  'speed': 'SPD'
};

export const GENERATION_LABELS = {
  'generation-i':    'Gen I',
  'generation-ii':   'Gen II',
  'generation-iii':  'Gen III',
  'generation-iv':   'Gen IV',
  'generation-v':    'Gen V',
  'generation-vi':   'Gen VI',
  'generation-vii':  'Gen VII',
  'generation-viii': 'Gen VIII',
  'generation-ix':   'Gen IX'
};

export const GAME_GROUPS = {
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

export const VERSION_DATA = {
  'red':    { name: 'Pokémon Red',    color: '#FF1111' },
  'blue':   { name: 'Pokémon Blue',   color: '#1111FF' },
  'yellow': { name: 'Pokémon Yellow', color: '#FFD700', text: '#333' },
  'gold':   { name: 'Pokémon Gold',   color: '#D4AF37' },
  'silver': { name: 'Pokémon Silver', color: '#C0C0C0' },
  'crystal':{ name: 'Pokémon Crystal',color: '#4B90B5' },
  'ruby':   { name: 'Pokémon Ruby',   color: '#A00000' },
  'sapphire':{ name: 'Pokémon Sapphire',color: '#0000A0' },
  'emerald': { name: 'Pokémon Emerald', color: '#00A858' },
  'firered': { name: 'Pokémon FireRed', color: '#FF7327' },
  'leafgreen':{ name: 'Pokémon LeafGreen',color: '#00DD00' },
  'diamond': { name: 'Pokémon Diamond', color: '#AAAAFF', text: '#333' },
  'pearl':   { name: 'Pokémon Pearl',   color: '#FFAAAA', text: '#333' },
  'platinum':{ name: 'Pokémon Platinum',color: '#999999' },
  'heartgold':{ name: 'Pokémon HeartGold',color: '#B69E31' },
  'soulsilver':{ name: 'Pokémon SoulSilver',color: '#C0C0E1', text: '#333' },
  'black':   { name: 'Pokémon Black',   color: '#333333' },
  'white':   { name: 'Pokémon White',   color: '#EEEEEE', text: '#333' },
  'black-2': { name: 'Pokémon Black 2', color: '#333333' },
  'white-2': { name: 'Pokémon White 2', color: '#EEEEEE', text: '#333' },
  'x':       { name: 'Pokémon X',       color: '#0055AA' },
  'y':       { name: 'Pokémon Y',       color: '#AA2211' },
  'omega-ruby': { name: 'Pokémon Omega Ruby', color: '#CF4038' },
  'alpha-sapphire': { name: 'Pokémon Alpha Sapphire', color: '#314E99' },
  'sun':     { name: 'Pokémon Sun',     color: '#F1912B' },
  'moon':    { name: 'Pokémon Moon',    color: '#5599CA' },
  'ultra-sun': { name: 'Pokémon Ultra Sun', color: '#E95B33' },
  'ultra-moon': { name: 'Pokémon Ultra Moon', color: '#226DB5' },
  'lets-go-pikachu': { name: 'Let\'s Go Pikachu', color: '#F1D62C', text: '#333' },
  'lets-go-eevee': { name: 'Let\'s Go Eevee', color: '#B68252' },
  'sword':   { name: 'Pokémon Sword',   color: '#00A1E9' },
  'shield':  { name: 'Pokémon Shield',  color: '#E5005A' },
  'brilliant-diamond': { name: 'Brilliant Diamond', color: '#3FBAE3' },
  'shining-pearl': { name: 'Shining Pearl', color: '#E397D1' },
  'legends-arceus': { name: 'Legends: Arceus', color: '#445E6D' },
  'scarlet': { name: 'Pokémon Scarlet', color: '#F83210' },
  'violet':  { name: 'Pokémon Violet',  color: '#8420B4' }
};

export const VERSION_TO_FOLDER = {
  'red': 'red-blue', 'blue': 'red-blue', 'yellow': 'yellow',
  'gold': 'gold', 'silver': 'silver', 'crystal': 'crystal',
  'ruby': 'ruby-sapphire', 'sapphire': 'ruby-sapphire', 'emerald': 'emerald', 'firered': 'firered-leafgreen', 'leafgreen': 'firered-leafgreen',
  'diamond': 'diamond-pearl', 'pearl': 'diamond-pearl', 'platinum': 'platinum', 'heartgold': 'heartgold-soulsilver', 'soulsilver': 'heartgold-soulsilver',
  'black': 'black-white', 'white': 'black-white', 'black-2': 'black-2-white-2', 'white-2': 'black-2-white-2',
  'x': 'x-y', 'y': 'x-y', 'omega-ruby': 'omegaruby-alphasapphire', 'alpha-sapphire': 'omegaruby-alphasapphire',
  'sun': 'sun-moon', 'moon': 'sun-moon', 'ultra-sun': 'ultra-sun-ultra-moon', 'ultra-moon': 'ultra-sun-ultra-moon', 'lets-go-pikachu': 'lets-go-pikachu-eevee', 'lets-go-eevee': 'lets-go-pikachu-eevee',
  'sword': 'sword-shield', 'shield': 'sword-shield', 'brilliant-diamond': 'brilliant-diamond-shining-pearl', 'shining-pearl': 'brilliant-diamond-shining-pearl', 'legends-arceus': 'legends-arceus',
  'scarlet': 'scarlet-violet', 'violet': 'scarlet-violet'
};
