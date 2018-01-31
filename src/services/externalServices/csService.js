const _ = require('lodash');

// ---

module.exports = function csService(
  callWrapperBuilder,
  config,
  customErrors,
  superagent
) {
  const wrapper = () => callWrapperBuilder.build(customErrors.CoreServicesError, config.csSiteApi.timeout);

  return {
    getEnvironmentCredentials,
    getOrganizationCredentials
  };

  function getClientCredentials(clientId) {
    return wrapper().wrap(
      config.authorization.token,
      superagent.get(`${config.csSiteApi.baseUri}/api/clients/${clientId}`)
    )
      .then((client) => _.pick(client, ['client_id', 'client_secret']))
    ;
  }

  function getEnvironmentCredentials(context) {
    return wrapper().wrap(
      config.authorization.token,
      superagent.get(`${config.csSiteApi.baseUri}/api/environments/${context.environmentId}`)
    )
      .then((environment) => getClientCredentials(environment.clientId))
    ;
  }

  function getOrganizationCredentials(context) {
    return wrapper().wrap(
      config.authorization.token,
      superagent.get(`${config.csSiteApi.baseUri}/api/organizations/${context.organization.id}`)
    )
      .then((organization) => getClientCredentials(organization.clientId))
    ;
  }
};
