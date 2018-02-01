'use strict';

module.exports = function knex(config) {
  return require('knex')(config.database);
};
