module.exports = function apiPlatformGateway(
  callWrapperBuilder,
  config,
  customErrors,
  superagent
) {
  const wrapper = () => callWrapperBuilder.build(customErrors.ApiManagerError, config.apiManager.timeout);

  return {
    createProxyDeploymentEntity,
    getAllEnvironments,
    getEnvironmentApi,
    updateProxyDeploymentEntity
  };

  function createProxyDeploymentEntity(context, environmentApiId, deployment) {
    return wrapper().wrap(
      context.user.token, // eslint-disable-next-line max-len
      superagent.post(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}/organizations/${context.organization.id}/environments/${context.environmentId}/apis/${environmentApiId}/deployments/external`)
        .send(deployment)
    )
      .then()
    ;
  }

  function getAllEnvironments(context) {
    return wrapper().wrap(
      context.user.token,
      superagent.get(`${config.apiManager.baseUri}${config.apiManager.v2ApiPath}/organizations/${context.organization.id}/environments`)
    )
      .then((environments) => environments)
    ;
  }

  function getEnvironmentApi(context, environmentApiId) {
    return wrapper().wrap(
      context.user.token, // eslint-disable-next-line max-len
      superagent.get(`${config.apiManager.baseUri}${config.apiManager.apiV1Path}/organizations/${context.organization.id}/environments/${context.environmentId}/apis/${environmentApiId}`)
    )
      .then((environmentApi) => environmentApi)
    ;
  }

  function updateProxyDeploymentEntity(context, environmentApiId, deployment) {
    return wrapper().wrap(
      context.user.token, // eslint-disable-next-line max-len
      superagent.patch(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}/organizations/${context.organization.id}/environments/${context.environmentId}/apis/${environmentApiId}/deployments/external/${deployment.id}`)
        .send(deployment)
    )
      .then()
    ;
  }
};
