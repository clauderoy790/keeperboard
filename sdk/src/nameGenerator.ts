/**
 * Auto-generated player name system.
 * Generates random AdjectiveNounNumber names (e.g., ArcaneBlob99).
 * Names are PascalCase words plus a numeric suffix, and fit within 4-12 characters.
 */

const MAX_BASE_LENGTH = 10;

// 100 fun adjectives
const ADJECTIVES = [
  'Arcane', 'Astro', 'Blazing', 'Bouncy', 'Brassy', 'Brisk', 'Bubbly', 'Chaotic',
  'Cheeky', 'Chill', 'Chunky', 'Cloaked', 'Cosmic', 'Crimson', 'Crispy', 'Dashing',
  'Dizzy', 'Dynamic', 'Electric', 'Epic', 'Feisty', 'Fiery', 'Flashy', 'Frosty',
  'Funky', 'Furious', 'Galactic', 'Glitchy', 'Golden', 'Goofy', 'Gritty', 'Groovy',
  'Hyper', 'Icy', 'Inky', 'Jazzy', 'Jolly', 'Jumpy', 'Laser', 'Legendary',
  'Loud', 'Lucky', 'Lunar', 'Madcap', 'Magic', 'Majestic', 'Meteor', 'Mighty',
  'Minty', 'Mystic', 'Neon', 'Nimble', 'Nova', 'Nuclear', 'Omega', 'Orbital',
  'Peppy', 'Phantom', 'Pixel', 'Plasma', 'Polished', 'Primal', 'Quantum', 'Quick',
  'Radiant', 'Rampaging', 'Razor', 'Rebel', 'Retro', 'Rogue', 'Rowdy', 'Savage',
  'Shadow', 'Shiny', 'Silly', 'Sketchy', 'Skybound', 'Slick', 'Snappy', 'Solar',
  'Sonic', 'Sparky', 'Speedy', 'Spiky', 'Starry', 'Stealthy', 'Stormy', 'Supreme',
  'Swift', 'Thunder', 'Turbo', 'Twilight', 'Ultra', 'Vibrant', 'Warped', 'Wicked',
  'Wild', 'Wizard', 'Zappy', 'Zesty',
];

// 100 fun nouns
const NOUNS = [
  'Aardvark', 'Asteroid', 'Badger', 'Bandit', 'Banshee', 'Beacon', 'Beetle', 'Blaster',
  'Blob', 'Boomer', 'Bot', 'Brawler', 'Buccaneer', 'Buffalo', 'Cannon', 'Captain',
  'Caribou', 'Charger', 'Cheetah', 'Chimera', 'Cobra', 'Comet', 'Cosmonaut', 'Cougar',
  'Coyote', 'Cyborg', 'Dagger', 'Defender', 'Dino', 'Dragon', 'Drifter', 'Drone',
  'Duck', 'Eagle', 'Eel', 'Falcon', 'Ferret', 'Fireball', 'Fox', 'Fury',
  'Gazelle', 'Ghost', 'Gizmo', 'Gladiator', 'Goblin', 'Griffin', 'Hammer', 'Hawk',
  'Hero', 'Hydra', 'Iguana', 'Jaguar', 'Jester', 'Jetpack', 'Jinx', 'Kangaroo',
  'Katana', 'Kraken', 'Lancer', 'Laser', 'Legend', 'Lemur', 'Leopard', 'Lion',
  'Luchador', 'Lynx', 'Maverick', 'Meteor', 'Monkey', 'Monsoon', 'Moose', 'Ninja',
  'Nova', 'Octopus', 'Oracle', 'Otter', 'Panther', 'Phoenix', 'Pirate', 'Pixel',
  'Puma', 'Quasar', 'Racer', 'Raptor', 'Raven', 'Reactor', 'Rocket', 'Ronin',
  'Saber', 'Scorpion', 'Shark', 'Spartan', 'Sphinx', 'Sprinter', 'Stallion', 'Tiger',
  'Titan', 'Viking', 'Viper', 'Wizard',
];

/**
 * Generate a random player name in the format AdjectiveNoun1-99.
 * Returns a PascalCase string with length 4-12 characters (fits validateName rules).
 * ~990,000 unique combinations possible.
 *
 * @example
 * generatePlayerName() // 'ArcaneBlob99'
 * generatePlayerName() // 'CosmicViper42'
 */
export function generatePlayerName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = Math.floor(Math.random() * 99) + 1;

  // Keep base to 10 chars so adding 1-2 digit suffix remains within 12-char limit.
  const base = (adjective + noun).slice(0, MAX_BASE_LENGTH);
  return `${base}${number}`;
}
