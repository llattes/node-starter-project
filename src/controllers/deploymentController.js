const semver = require('semver');

module.exports = function deploymentController(
  constants,
  deploymentService
) {
  return {
    patch,
    post,
    put
  };

  function patch(req, res, next) {
    if (semver.satisfies(req.body.gatewayVersion, constants.muleVersionThreshold)) {
      const deployment            = req.body;

      // Ensure that we are updating the same API version specified on the URL
      deployment.environmentApiId = +(req.params.environmentApiId);

      return deploymentService.update(req.context, deployment)
        .then((response) => res.send(response))
        .catch(next);
    }

    return null;
  }

  function post(req, res, next) {
    if (semver.satisfies(req.body.gatewayVersion, constants.muleVersionThreshold)) {
      const deployment            = req.body;

      // Ensure that we are updating the same API version specified on the URL
      deployment.environmentApiId = +(req.params.environmentApiId);

      return deploymentService.create(req.context, req.body)
        .then((response) => res.status(201).send(response))
        .catch(next);
    }

    return null;
  }

  function put(req, res, next) {
    if (semver.satisfies(req.body.gatewayVersion, constants.muleVersionThreshold)) {
      const deployment            = req.body;

      // Ensure that we are updating the same API version specified on the URL
      deployment.environmentApiId = +(req.params.environmentApiId);

      return deploymentService.update(req.context, deployment)
        .then((response) => res.status(201).send(response))
        .catch(next);
    }

    return null;
  }
};
