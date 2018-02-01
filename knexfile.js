'use strict';

module.exports[process.env.NODE_ENV || 'development'] = require('./src/config')().database;
