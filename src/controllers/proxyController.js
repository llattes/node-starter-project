module.exports = function proxyController(
  apiPlatformGateway,
  proxyService
) {
  return {
    get
  };

  function get(req, res, next) {
    return apiPlatformGateway.getEnvironmentApi(req.context, req.params.environmentApiId)
      .then((api) => {
        if (api.endpoint && api.endpoint.muleVersion4OrAbove) {
          return proxyService.get(req.context, api)
            .then((result) => {
              res.attachment(`${result.name}.jar`);
              res.send(result.buffer);
            })
          ;
        }
        return null;
      })
      .catch(next)
    ;
  }
};
