/**
 * Words that should NOT trigger the profanity filter.
 * These are common false positives (Scunthorpe problem).
 */
export const ALLOWED_WORDS: string[] = [
  // Place names
  'Scunthorpe',
  'Penistone',
  'Shitterton',
  'Cockermouth',

  // Names
  'Dickens',
  'Hancock',
  'Hitchcock',
  'Babcock',

  // Animal/nature words
  'Cockatoo',
  'Peacock',
  'Woodcock',
  'Shuttlecock',
  'Cockpit',
  'Cockerel',

  // Words with "ass" substring
  'Assassin',
  'Bassist',
  'Classic',
  'Compass',
  'Embassy',
  'Grass',
  'Mass',
  'Pass',
  'Class',
  'Massive',
  'Passport',
  'Rassle',
  'Sassy',
  'Trespass',

  // Words with "tit" substring
  'Titanic',
  'Title',
  'Constitution',
  'Petition',
  'Repetition',

  // Words with "cum" substring
  'Document',
  'Cucumber',
  'Circumstance',
  'Accumulate',

  // Words with "hell" substring
  'Hello',
  'Shell',
  'Michelle',
  'Seashell',
  'Nutshell',

  // Words with "damn" substring
  'Fundamentalist',
  'Amsterdam',

  // Gaming terms that might get flagged
  'Sniper',
  'Striker',
  'Killer',
  'Slayer',
];

/**
 * Names that SHOULD trigger the profanity filter.
 * Used for testing purposes only.
 */
export const PROFANE_TEST_WORDS: string[] = [
  // Basic profanity
  'fuck',
  'shit',
  'ass',
  'bitch',
  'dick',
  'pussy',
  'cunt',
  'cock',

  // Leetspeak variants
  'f4ck',
  'sh1t',
  'a55',
  'b1tch',
  'd1ck',
  'pu55y',
  'c0ck',
  'fuk',
  'f*ck',

  // Extended/repeated letters
  'fuuuck',
  'shiiit',
  'fuuuuuck',

  // Mixed into player names
  'FuckBoy',
  'ShitKing',
  'AssMan',
  'xXfuckXx',
  'PussySlayer',
];
