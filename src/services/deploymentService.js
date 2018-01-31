const _       = require('lodash');
const Promise = require('bluebird');

module.exports = function deploymentService(
  apiPlatformGateway,
  chService,
  errors,
  hybridService,
  logger,
  proxyService
) {
  return {
    create,
    update
  };

  function create(context, deployment) {
    let environmentApi;
    let createdDeployment;

    return validate(context, deployment.environmentApiId)
      .then((api) => environmentApi = api)
      .then(() => apiPlatformGateway.createProxyDeploymentEntity(context, deployment.environmentApiId, deployment))
      .then((proxyDeployment) => {
        createdDeployment = proxyDeployment;
        return deployApplication(context, environmentApi, deployment, proxyDeployment, proxyDeployment.overwrite);
      })
      .then(() => createdDeployment)
    ;
  }

  function update(context, deployment) {
    let environmentApi;
    let updatedDeployment;

    return validate(context, deployment.environmentApiId)
      .then((api) => environmentApi = api)
      .then(() => apiPlatformGateway.updateProxyDeploymentEntity(context, deployment.environmentApiId, deployment))
      .then((proxyDeployment) => {
        updatedDeployment = proxyDeployment;
        return deployApplication(context, environmentApi, deployment, proxyDeployment, true);
      })
      .then(() => updatedDeployment)
    ;
  }

  function validate(context, environmentApiId) {
    return apiPlatformGateway.getEnvironmentApi(context, environmentApiId)
      .then((api) => {
        if (api.endpoint && !api.endpoint.muleVersion4OrAbove) {
          return Promise.reject(new errors.BadRequest('Endpoint not configured to use mule4'));
        }

        return api;
      })
    ;
  }

  function deployApplication(context, environmentApi, deployment, proxyDeployment, ignoreDuplicatedError) {
    return deployApplicationToCloudHub(context, environmentApi, deployment, proxyDeployment, ignoreDuplicatedError)
      .tap(() => deployApplicationToHybrid(context, environmentApi, deployment, proxyDeployment))
    ;
  }

  function deployApplicationToCloudHub(context, environmentApi, deployment, proxyDeployment, ignoreDuplicatedError) {
    const applicationInfo = toCloudHubApplicationInfo(deployment.environmentApiId, proxyDeployment);

    if (!applicationInfo) {
      return Promise.resolve();
    }

    const config = { ignoreDuplicatedError };

    // eslint-disable-next-line max-len
    logger.debug(`Deploy proxy of type ${environmentApi.endpoint.type} for API ${environmentApi.id} to CH [name: ${applicationInfo.name} - env: ${applicationInfo.environmentId}`);

    return chService.upsertApplication(context, applicationInfo, config)
      .then(()      => getProxy(context, environmentApi))
      .then((proxy) => chService.deployApplication(context, applicationInfo, proxy.buffer))
    ;
  }

  function toCloudHubApplicationInfo(apiVersionId, proxyDeployment) {
    if (proxyDeployment.type !== 'CH') {
      return null;
    }

    return {
      apiVersionId,
      name:           proxyDeployment.applicationName,
      gatewayVersion: proxyDeployment.gatewayVersion,
      environmentId:  proxyDeployment.environmentId
    };
  }

  function deployApplicationToHybrid(context, environmentApi, deployment, proxyDeployment) {
    const applicationInfo = toHybridApplicationInfo(deployment.environmentApiId, proxyDeployment);

    if (!applicationInfo) {
      return Promise.resolve();
    }

    // eslint-disable-next-line max-len
    logger.debug(`Deploy proxy of type ${environmentApi.endpoint.type} for API ${environmentApi.id} to HY [name: ${applicationInfo.name} - env: ${applicationInfo.environmentId}`);

    return getProxy(context, environmentApi)
      .then((proxy) => hybridService.deployApplication(context, _.assign(applicationInfo, { name: proxy.name }), proxy.buffer))
      .tap((application) => _.assign(proxyDeployment, {
        applicationId:   application.applicationId,
        applicationName: application.name,
        targetId:        application.targetId })
      )
      .tap(() => apiPlatformGateway.updateProxyDeploymentEntity(context, applicationInfo.apiVersionId, proxyDeployment))
    ;
  }

  function toHybridApplicationInfo(apiVersionId, proxyDeployment) {
    if (proxyDeployment.type !== 'HY') {
      return null;
    }

    return {
      apiVersionId,
      name:           proxyDeployment.applicationName,
      applicationId:  proxyDeployment.applicationId,
      targetType:     proxyDeployment.targetType,
      targetId:       proxyDeployment.targetId,
      targetName:     proxyDeployment.targetName,
      gatewayVersion: proxyDeployment.gatewayVersion,
      environmentId:  proxyDeployment.environmentId
    };
  }

  function getProxy(context, environmentApi) {
    return proxyService.get(context, environmentApi);
  }
};
