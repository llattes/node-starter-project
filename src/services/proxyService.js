module.exports = function proxyService(
  errors,
  logger,
  proxyHelper
) {
  return {
    get
  };

  function get(context, environmentApi) {
    // eslint-disable-next-line max-len
    logger.debug(`Download proxy of type ${environmentApi.endpoint.type} for API ${environmentApi.groupId}:${environmentApi.assetId}:${environmentApi.assetVersion}`);

    return proxyHelper.generateProxyName(environmentApi);
  }
};
