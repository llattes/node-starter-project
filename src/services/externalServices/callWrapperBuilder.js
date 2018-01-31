module.exports = function callWrapperBuilder(
  errors,
  superagentify
) {
  return {
    build
  };

  // ---

  function build(ServiceError, timeout) {
    return {
      wrap,
      wrapCached
    };

    function wrap(accessToken, req) {
      return superagentify(
          req.set('Authorization', `Bearer ${accessToken}`)
            .timeout(timeout)
        )
        .get('body')
        .catch((err) => {
          if (err.timeout) {
            throw new errors.GatewayTimeout(err.message);
          }

          if (err.status === 401) {
            throw new errors.Unauthorized();
          }

          if (err.status === 403) {
            throw new errors.Forbidden();
          }

          if (err.status === 404) {
            throw new errors.NotFound();
          }

          let message =  (err.response && err.response.body) ? `${err.response.body.name}: ${err.response.body.message}` : 'unknown error';
          message     += ` [code ${err.status}]`;

          throw new ServiceError(message);
        })
      ;
    }

    function wrapCached(cacheService, args, request, _mapper) {
      const mapper = _mapper || ((content) => content);

      return cacheService.get.apply(null, args)
        .then((cachedValue) => {
          if (cachedValue) {
            return cachedValue;
          }

          return wrap(args[0], request)
            .then(mapper)
            .tap((response) => {
              if (!cachedValue) {
                args.push(response);
                cacheService.set.apply(null, args);
              }
            })
          ;
        })
      ;
    }
  }
};
