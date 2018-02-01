const express          = require('express');
const ospreyMiddleware = require('osprey-middleware');

module.exports = function apiV1Router(
  config,
  authenticationMiddleware,
  deploymentController,
  proxyController,
  statusController
) {
  // eslint-disable-next-line new-cap
  return express.Router().use(config.apis.v1.baseUri, express.Router()

    .use(ospreyMiddleware(config.apis.v1.raml, {
      disableErrorInterception: true,
      server:                   {
        limit: config.apis.v1.jsonMaxSize
      }
    }))

    .use(initContext)

    .use('/',
      authenticationMiddleware.setToken
    )

    .use('/organizations/:organizationId',
      authenticationMiddleware.setOrganizationId
    )

    .use('/organizations/:organizationId/environments/:environmentId',
      authenticationMiddleware.setEnvironmentId
    )

    .get('/organizations/:organizationId/environments/:environmentId/apis/:environmentApiId/proxy',
      proxyController.get
    )

    .post('/organizations/:organizationId/environments/:environmentId/apis/:environmentApiId/deployments',
      deploymentController.post
    )

    .put('/organizations/:organizationId/environments/:environmentId/apis/:environmentApiId/deployments/:proxyDeploymentId',
      deploymentController.put
    )

    .patch('/organizations/:organizationId/environments/:environmentId/apis/:environmentApiId/deployments/:proxyDeploymentId',
      deploymentController.patch
    )

    // Status echo endpoint
    .get('/status/echo',
      statusController.get
    )

    // Status version endpoint
    .get('/status/version',
      statusController.getVersion
    )
  );
};

function initContext(req, res, next) {
  // eslint-disable-next-line no-param-reassign
  req.context = {};
  next();
}
