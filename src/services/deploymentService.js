// const _       = require('lodash');
// const Promise = require('bluebird');

module.exports = function deploymentService(
  // apiPlatformGateway,
  // errors,
  // logger,
  // proxyService
) {
  return {
    create,
    update
  };

  function create(context, deployment) {
    console.log(context);
    console.log(deployment);
    // let environmentApi;
    // let createdDeployment;

    // return validate(context, deployment.environmentApiId)
    //   .then((api) => environmentApi = api)
    //   .then(() => apiPlatformGateway.createProxyDeploymentEntity(context, deployment.environmentApiId, deployment))
    //   .then((proxyDeployment) => {
    //     createdDeployment = proxyDeployment;
    //     return deployApplication(context, environmentApi, deployment, proxyDeployment, proxyDeployment.overwrite);
    //   })
    //   .then(() => createdDeployment)
    // ;
  }

  function update(context, deployment) {
    console.log(context);
    console.log(deployment);
    // let environmentApi;
    // let updatedDeployment;

    // return validate(context, deployment.environmentApiId)
    //   .then((api) => environmentApi = api)
    //   .then(() => apiPlatformGateway.updateProxyDeploymentEntity(context, deployment.environmentApiId, deployment))
    //   .then((proxyDeployment) => {
    //     updatedDeployment = proxyDeployment;
    //     return deployApplication(context, environmentApi, deployment, proxyDeployment, true);
    //   })
    //   .then(() => updatedDeployment)
    // ;
  }
};
