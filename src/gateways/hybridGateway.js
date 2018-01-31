module.exports = function hybridGateway(
  callWrapperBuilder,
  config,
  customErrors,
  errors,
  superagent
  ) {
  const baseUri = config.hybrid.baseUri;
  const wrapper = () => callWrapperBuilder.build(customErrors.HybridError, config.hybrid.timeout);

  // ---

  return {
    getApplication,
    getApplicationsByQuery,
    createApplication,
    updateApplication
  };

  // ---

  function getApplication(context, environmentId, applicationId) {
    return gatewayWrap(
      context,
      environmentId,
      superagent.get(`${baseUri}/api/v1/applications/${applicationId}`)
    );
  }

  function getApplicationsByQuery(context, environmentId, query) {
    return gatewayWrap(
      context,
      environmentId,
      superagent
        .get(`${baseUri}/api/v1/applications`)
        .query(query)
    );
  }

  function createApplication(context, environmentId, application) {
    return gatewayWrap(
      context,
      environmentId,
      superagent
        .post(`${baseUri}/api/v1/applications`)
        .field('artifactName', application.artifactName)
        .field('targetId',     application.targetId)
        .attach('file',        application.file.stream, application.file.name)
    );
  }

  function updateApplication(context, environmentId, applicationId, application) {
    const req = superagent.patch(`${baseUri}/api/v1/applications/${applicationId}`);

    // the same operation is used to redeploy a proxy file or update the properties
    return gatewayWrap(
      context,
      environmentId,
      application.file ? req.attach('file', application.file.stream,  application.file.name) : req.send(application)
    );
  }

  /**
   * Calls callWrapperBuilder to wrap the request and adds 2
   * properties to it:
   *   - X-ANYPNT-ENV-ID
   *   - X-ANYPNT-ORG-ID
   *
   * @param {Object} context
   * @param {String} environmentId
   * @param {Object} req
   *
   * @returns {Promise} Response body or `customErrors.HybridError`
   * error.
   */
  function gatewayWrap(context, environmentId, req) {
    return wrapper().wrap(
      context.user.token,
      req.set('X-ANYPNT-ENV-ID', environmentId)
         .set('X-ANYPNT-ORG-ID', context.organization.id)
    )
      .then((response) => response.data)
    ;
  }
};
