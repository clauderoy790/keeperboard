/**
 * Post-build obfuscation script for production SDK builds.
 * Run via: node scripts/obfuscate.js
 */

const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const OBFUSCATOR_OPTIONS = {
  // Core obfuscation
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,

  // String protection (hides magic numbers and strings)
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  stringArrayRotate: true,
  stringArrayShuffle: true,

  // Number protection (hides magic numbers like 0xBEEF)
  numbersToExpressions: true,

  // Identifier renaming
  identifierNamesGenerator: 'hexadecimal',

  // Disable features that break ESM/CJS
  selfDefending: false, // Can break in strict mode
  debugProtection: false, // Causes issues in dev tools

  // Keep module exports working
  target: 'browser',
  renameGlobals: false,
};

function obfuscateFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  const code = fs.readFileSync(fullPath, 'utf8');

  const result = JavaScriptObfuscator.obfuscate(code, OBFUSCATOR_OPTIONS);

  fs.writeFileSync(fullPath, result.getObfuscatedCode());
  console.log(`  Obfuscated: ${filePath}`);
}

// Obfuscate both CJS and ESM outputs
obfuscateFile('dist/index.js');
obfuscateFile('dist/index.mjs');

console.log('Obfuscation complete');
