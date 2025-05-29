/**
 * Index file for test fixtures
 * Exports all fixture factory functions for easy access
 */

// Combine all exports from other fixture files
const bookFixtures = require('./books');
const assetFixtures = require('./assets');
const responseFixtures = require('./responses');

module.exports = {
  ...bookFixtures,
  ...assetFixtures,
  ...responseFixtures,
};