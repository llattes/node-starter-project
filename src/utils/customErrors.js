const _ = require('lodash');

module.exports = function customErrors(
  errors
) {
  return {
    ApiManagerError,
    CloudhubError,
    CoreServicesError,
    EntityConsistencyError,
    HybridError,
    InvalidAuthHeaderError,
    InvalidTokenError,
    ProxyBuilderError
  };

  function ApiManagerError(message) {
    return errors(502, `Error talking to API Manager: ${message}`);
  }

  function CloudhubError(message, status, properties) {
    const effectiveStatus = (status && _.isFinite(status)) ? status : 502;

    // eslint-disable-next-line max-len
    return (properties && _.isPlainObject(properties)) ? errors(effectiveStatus, `There was an error while talking to CloudHub: ${message}`, properties) : errors(effectiveStatus, `There was an error while talking to CloudHub: ${message}`);
  }

  function CoreServicesError(message) {
    return errors(502, `Error talking to Core Services: ${message}`);
  }

  function EntityConsistencyError(message) {
    return errors(409, `${message}`);
  }

  function HybridError(message) {
    return errors(502, `Error talking to Hybrid: ${message}`);
  }

  function InvalidAuthHeaderError(message) {
    return errors(401, `${message}`);
  }

  function InvalidTokenError(message) {
    return errors(401, `${message}`);
  }

  function ProxyBuilderError(message) {
    return errors(502, `Error talking to Proxy Builder Service: ${message}`);
  }
};
