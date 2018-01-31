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
    token:          'proxiesXapiServiceToken',
    anonymousPaths: [
      '/status/echo',
      '/status/version'
    ]
  },

  analytics: {
    ingestUri: _.get(process.env, 'ANALYTICS_INGEST_URI', 'https://analytics-ingest-qax.anypoint.mulesoft.com')
  },

  platform: {
    baseUri: _.get(process.env, 'ANYPOINT_PLATFORM_BASE_URI', 'https://qax.anypoint.mulesoft.com')
  },

  apiManager: {
    baseUri:         _.get(process.env, 'AM_API_BASE_URI', 'https://qax.anypoint.mulesoft.com'),
    timeout:         10000,
    apiV1Path:       '/apimanager/api/v1',
    proxiesXapiPath: '/proxies/xapi/v1',
    v2ApiPath:       '/apiplatform/repository/v2'
  },

  cloudhub: {
    baseUri:                  _.get(process.env, 'CH_SITE_API_BASE_URI', 'https://qax.anypoint.mulesoft.com/cloudhub'),
    supportedRuntimeVersions: '>=4.0.0',
    timeout:                  10000,
    workerType:               'Micro'
  },

  csSiteApi: {
    baseUri: _.get(process.env, 'CS_SITE_API_BASE_URI', 'https://qax.anypoint.mulesoft.com/accounts'),
    timeout: 10000
  },

  express: {
    host: '0.0.0.0',
    port: _.get(process.env, 'PORT', 8080)
  },

  hybrid: {
    baseUri: _.get(process.env, 'HY_SITE_API_BASE_URI', 'https://qax.anypoint.mulesoft.com/hybrid'),
    timeout: 10000
  },

  proxyBuilder: {
    baseUri:          _.get(process.env, 'PROXY_BUILDER_BASE_URI', 'http://localhost:3000/v1'),
    templateVersions: {
      HTTP:  '1.0.0',
      HTTPS: '1.0.0',
      RAML:  '1.0.0',
      WSDL:  '1.0.0'
    },
    timeout:          10000
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
