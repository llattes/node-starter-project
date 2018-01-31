const _       = require('lodash');
const jwt     = require('jsonwebtoken');
const Promise = require('bluebird');

// ---

module.exports = function authenticationMiddleware(
  config,
  customErrors,
  uuidService
) {
  return {
    setToken,
    setOrganizationId,
    setEnvironmentId
  };

  // ---

  /**
   * Gets token by looking for `Authorization` request header
   * and, if valid, it stores it inside the context.
   *
   * @param {Object} req
   * @param {Object} res
   * @param {Object} next
   *
   */
  function setToken(req, res, next) {
    Promise.resolve(req)
      // Get token from request headers
      .then(getToken)

      // Decode the token if is's a jwt
      .then(decodeToken)

      // Create context
      .then((token) => saveTokenInContext(token))

      .then(() => next())
      .catch(next)
    ;

    function getToken() {
      const cookieJwt = getJwtFromCookie(req);
      const header = req.headers.authorization;

      // No authorization header?
      if (!header) {
        // Is it a permitted anonymous path?
        if (_.includes(config.authorization.anonymousPaths, req.path)) {
          return Promise.resolve(null);
        }

        if (!isCookieBasedEndpoint(req)) {
          return Promise.reject(new customErrors.InvalidAuthHeaderError('Authorization Token missing'));
        }

        return Promise.resolve(cookieJwt);
      }

      return Promise
        .try(() => {
          // Parse `Authorization` header which should look like `Authorization: Bearer <token>`
          const parts = header.split(' ');
          if (parts.length !== 2) {
            return Promise.reject(new customErrors.InvalidAuthHeaderError('Malformed header'));
          }

          const authorizationScheme = parts[0].toLowerCase();
          const authorizationToken  = parts[1];

          if (authorizationScheme !== 'bearer') {
            return Promise.reject(new customErrors.InvalidAuthHeaderError(`Unsupported scheme: ${authorizationScheme}`));
          }

          return Promise.resolve(authorizationToken);
        })
        .then((authorizationToken) => {
          // At this point it is possible that we have both tokens provided to us
          // and so for cookie based endpoint we have to validate that they match
          if (isCookieBasedEndpoint(req) && cookieJwt && authorizationToken !== cookieJwt) {
            return Promise.reject(new customErrors.InvalidAuthHeaderError('Cookie vs Header mismatch'));
          }

          return authorizationToken;
        })
      ;
    }

    /**
     * If the token is a JWT, then decode it and return just the CS's token
     * Otherwise, just place the token in the context.
     *
     * @param {String|null} token
     *
     * @returns {Object} User
     */
    function decodeToken(token) {
      // If there is no token or it is a CS token, then return it as it is
      if (!token || uuidService.isUuid(token)) {
        return Promise.resolve(token);
      }

      const decodedToken = jwt.decode(token);
      if (!decodedToken) {
        return Promise.reject(new customErrors.InvalidTokenError('Invalid token'));
      }
      return Promise.resolve(decodedToken.token);
    }

    function saveTokenInContext(token) {
      req.context.user   = { token };   // eslint-disable-line no-param-reassign
      req.requestTraceId = req.traceId; // eslint-disable-line no-param-reassign
    }
  }

  /**
   * Gets token from a cookie, we only allow this method of authentication
   * for some endpoints
   *
   * @param {Object} req
   *
   * @returns {String|null} Token
   */
  function getJwtFromCookie(req) {
    return req.cookies && req.cookies.token;
  }

  /**
   * Checks whether endpoint is allowed to use
   * cookie based authentication.
   *
   * @param {Object} req
   *
   * @returns {Boolean}
   */
  function isCookieBasedEndpoint(req) {
    // compile and cache regexp
    if (!isCookieBasedEndpoint.whiteList) {
      isCookieBasedEndpoint.whiteList = [
        '/organizations/*/environments/*/apis/*/proxy'
      ].map(function (path) {
        return new RegExp(`^${path.replace(/\*/g, '[^/]+')}$`);
      });
    }

    return req.method === 'GET' && isCookieBasedEndpoint.whiteList.some(function (pathRe) {
      return pathRe.test(req.path);
    });
  }

  /**
   * Gets the organization ID from the params of the request
   * and stores it inside the context.
   *
   * @param {Object} req
   * @param {Object} res
   * @param {Object} next
   *
   */
  function setOrganizationId(req, res, next) {
    // eslint-disable-next-line no-param-reassign
    req.context.organization = {
      id: req.params.organizationId
    };

    next();
  }

  /**
   * Gets the environment ID from the params of the request
   * and stores it inside the context.
   *
   * @param {Object} req
   * @param {Object} res
   * @param {Object} next
   *
   */
  function setEnvironmentId(req, res, next) {
    req.context.environmentId = req.params.environmentId; // eslint-disable-line no-param-reassign

    next();
  }
};
