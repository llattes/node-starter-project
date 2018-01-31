const url     = require('url');
const _       = require('lodash');
const flatten = require('flat');

// ---

module.exports = function proxyHelper(
  config
) {
  return {
    createProxyRequest,
    generateProxyName,
    resolveConfigProperties
  };

  // ---

  /**
   * Generates a proxy request object, needed by api-proxy-builder-service for creating a bundle
   *
   * @param {Object} environmentApi
   *
   * @returns {Object} A proxyRequest object
   */
  function createProxyRequest(environmentApi) {
    const proxyRequest = {};

    // Resolve the config properties based on the environmentApi
    const configurationProperties = resolveConfigProperties(environmentApi);
    _.assign(proxyRequest, { configurationProperties });

    // Add the API definition if proxy RAML only, to allow getting assets from Exchange
    if (environmentApi.endpoint.type === 'raml') {
      const apiDefinition = { groupId: environmentApi.groupId, assetId: environmentApi.assetId, assetVersion: environmentApi.assetVersion };
      _.assign(proxyRequest, { apiDefinition });
    }

    // Build the template GAV
    const assetId  = environmentApi.endpoint.type.toUpperCase();
    const template = { groupId: environmentApi.groupId, assetId, assetVersion: config.proxyBuilder.templateVersions[assetId] };
    _.assign(proxyRequest, { template });

    return proxyRequest;
  }

  /**
   * Generates the name of a proxy based on the environmentApi details
   *
   * @param {Object} environmentApi
   *
   * @returns {String} The proxy name of the given environmentApi
   */
  function generateProxyName(environmentApi) {
    const parts = [environmentApi.assetId, environmentApi.productVersion, environmentApi.instanceLabel || environmentApi.autodiscoveryInstanceName];

    return parts.map(sanitize).join('-');

    function sanitize(string) {
      // Replaces all special characters with '_', removing any at the beginning and end.
      // Example: "#Asset:name with-special.characters?;" becomes "Asset_name_with_special_characters"
      return string.replace(/[^\w]+/g, ' ').trim().replace(/ /g, '_');
    }
  }

  /**
   * Resolves a JSON with the configuration properties for the proxy depending
   * on its type, following these formats:
   *
   * WSDL:
   * -----
   * api.id=1
   * proxy.path=/api/*
   * proxy.port=8080
   * proxy.responseTimeout=10000
   * service.port=ExamplePort                  (TBD)
   * service.namespace=http://examplenamespace (TBD)
   * service.name=ExampleName                  (TBD)
   * wsdl=examplewsdl
   *
   * RAML:
   * -----
   * api.id=1
   * proxy.path=/api/*
   * proxy.port=8080
   * implementation.host=baseUri.com
   * implementation.port=80
   * implementation.path=/
   * proxy.responseTimeout=10000
   *
   * HTTP:
   * -----
   * api.id=1
   * proxy.path=/api/*
   * proxy.port=8080
   * implementation.host=baseUri.com
   * implementation.port=80
   * implementation.path=/
   * proxy.responseTimeout=10000
   *
   * HTTPS = HTTP+ (To be supported):
   * --------------------------------
   * keystore.path=
   * keystore.keyPassword=
   * keystore.password=
   *
   * @param {Object} environmentApi
   *
   * @returns {Object} A JSON representation of the proxy config.properties file
   */
  function resolveConfigProperties(environmentApi) {
    const endpointType    = environmentApi.endpoint.type;
    const api             = { id: environmentApi.id };
    const configuration   = {};
    const service         = {};
    let implementationUri = environmentApi.endpoint.uri;
    let proxy             = {};
    let implementation    = {};

    if (environmentApi.endpoint.proxyUri) {
      proxy = url.parse(environmentApi.endpoint.proxyUri);
    }

    // Add "?WSDL" from URI for WSDL-type endpoints if missing
    if (endpointType === 'wsdl' && implementationUri.toLowerCase().indexOf('?wsdl') === -1) {
      implementationUri += '?wsdl';
    }

    implementation = url.parse(implementationUri);

    if (endpointType === 'wsdl' && implementation.pathname === '/') {
      implementationUri = url.format(implementation);
    }

    if (!implementation.port) {
      // eslint-disable-next-line no-unused-expressions
      implementation.protocol === 'https:' ? implementation.port = '443' : implementation.port = '80';
    }

    proxy.responseTimeout = environmentApi.endpoint.responseTimeout || config.defaultResponseTimeout;

    if (_.endsWith(proxy.path, '/')) {
      proxy.path += '*';
    } else if (!_.endsWith(proxy.path, '*')) {
      proxy.path += '/*';
    }

    const baseConfiguration = { api, proxy: _.pick(proxy, ['path', 'port', 'responseTimeout']) };

    if (endpointType !== 'wsdl') {
      // eslint-disable-next-line max-len
      _.assign(configuration, baseConfiguration, { implementation: { host: implementation.hostname, port: implementation.port, path: implementation.path } });
    } else {
      const wsdlConfig  = environmentApi.endpoint.wsdlConfig || {};

      service.name      = wsdlConfig.name      || '';
      service.namespace = wsdlConfig.namespace || '';
      service.port      = wsdlConfig.port      || '';

      _.assign(configuration, baseConfiguration, { service, wsdl: implementationUri });
    }

    return flatten(configuration);
  }
};
