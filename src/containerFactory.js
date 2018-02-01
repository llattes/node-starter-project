const bluebird          = require('bluebird');
const dependable        = require('dependable');
const errors            = require('http-errors');
const path              = require('path');
const superagent        = require('superagent');
const superagentPromise = require('superagent-promise');

function createContainer() {
  const container = dependable.container();
  const entries   = [
    'app.js',
    'config.js',
    'controllers',
    'db',
    'gateways',
    'logger.js',
    'middlewares',
    'routers',
    'services',
    'services/externalServices',
    'utils'
  ];

  container.register('superagent', function () {
    return superagentPromise(superagent, bluebird);
  });

  container.register('requestBodyBinaryParser', function requestBodyBinaryParser() {
    return superagent.parse.image;
  });

  container.register('errors', function () {
    return errors;
  });

  entries.forEach((entry) => container.load(path.join(__dirname, entry)));
  return container;
}

module.exports = {
  createContainer
};
