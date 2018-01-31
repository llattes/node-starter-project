const contentDisposition = require('content-disposition');

module.exports = function redirectController(
  config,
  requestBodyBinaryParser,
  superagent
) {
  const body = (res) => (response) => res.status(response.status).send(response.body);

  return {
    get,
    getProxy,
    patch,
    post,
    put
  };

  function get(req, res) {
    return superagent
      .get(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}${req.url}`)
      .set('content-type', 'application/json')
      .set('Authorization', req.headers.authorization)
      .end()
      .then(body(res))
      .catch((error) => body(res)(error.response))
    ;
  }


  function getProxy(req, res) {
    return [
      setCookie,
      setAuthorizationToken
    ].reduce(
      (promise, fn) => fn(promise),
      superagent
        .get(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}${req.url}`)
        .set('content-type', 'application/json')
    )
      .buffer(true)
      .parse(requestBodyBinaryParser)
      .then((response) => {
        const filename = contentDisposition.parse(response.headers['content-disposition']).parameters.filename;
        res.attachment(filename);
        return response;
      })
      .then(body(res))
      .catch((error) => body(res)(error.response))
    ;

    function setCookie(request) {
      const hasCookies = Object.keys(req.cookies || {}).length !== 0;
      if (hasCookies) {
        return request.set('Cookie', req.headers.cookie);
      }
      return request;
    }

    function setAuthorizationToken(request) {
      const hasAuthorization = !!req.headers.authorization;
      if (hasAuthorization) {
        return request.set('Authorization', req.headers.authorization);
      }
      return request;
    }
  }

  function post(req, res) {
    return superagent
      .post(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}${req.url}`)
      .set('content-type', 'application/json')
      .set('Authorization', req.headers.authorization)
      .send(req.body)
      .end()
      .then(body(res))
      .catch((error) => body(res)(error.response))
    ;
  }

  function put(req, res) {
    return superagent
      .put(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}${req.url}`)
      .set('content-type', 'application/json')
      .set('Authorization', req.headers.authorization)
      .send(req.body)
      .end()
      .then(body(res))
      .catch((error) => body(res)(error.response))
    ;
  }

  function patch(req, res) {
    return superagent
      .patch(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}${req.url}`)
      .set('content-type', 'application/json')
      .set('Authorization', req.headers.authorization)
      .send(req.body)
      .end()
      .then(body(res))
      .catch((error) => body(res)(error.response))
    ;
  }
};
