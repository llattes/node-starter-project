const path = require('path');
const _    = require('lodash');

// ---

const ROOT = path.join(__dirname, '..');
const ENV  = process.env.NODE_ENV || 'development';

// ---

module.exports = {
  root: ROOT,

  apis: {
    v1: {
      baseUri:     '/v1',
      raml:        path.join(ROOT, '/assets/raml/api.v1.raml'),
      jsonMaxSize: '400kb'
    }
  },

  authorization: {
    token:          'someAuthToken',
    anonymousPaths: [
      '/status/echo',
      '/status/version'
    ]
  },

  database: {
    debug:      false,
    client:     'pg',
    connection: {
      host:     process.env.DATABASE_HOST || null,
      user:     process.env.DATABASE_USER || null,
      password: process.env.DATABASE_PASS || null,
      database: 'node_starter_project',
      charset:  'utf8'
    }
  },

  externalService: {
    baseUri: _.get(process.env, 'EXT_SVC_BASE_URI', 'https://<<add-some-public-api-here>>'),
    timeout: 10000,
    apiPath: '/<<add-some-path-here>>>',
  },

  express: {
    host: '0.0.0.0',
    port: _.get(process.env, 'PORT', 8080)
  },

  logger: {
    console: {
      enabled:     true,
      level:       'debug',
      timestamp:   true,
      prettyPrint: true
    },

    syslog: {
      enabled:  false,
      protocol: 'udp4',
      path:     '/dev/log',
      app_name: 'node-starter-project',
      facility: 'local6'
    }
  },

  newRelic: {
    appName:      `node-starter-project (${ENV})`,
    enabled:      _.get(process.env, 'NEW_RELIC_ENABLED', false),
    licenseKey:   _.get(process.env, 'NEW_RELIC_LICENSE_KEY'),
    noConfigFile: _.get(process.env, 'NEW_RELIC_NO_CONFIG_FILE', true)
  },

  defaultResponseTimeout: 10000
};
