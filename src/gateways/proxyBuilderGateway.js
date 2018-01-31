module.exports = function proxyBuilderGateway(
  callWrapperBuilder,
  config,
  customErrors,
  requestBodyBinaryParser,
  superagent
) {
  const wrapper = () => callWrapperBuilder.build(customErrors.ProxyBuilderError, config.proxyBuilder.timeout);

  return {
    createProxy
  };

  function createProxy(context, proxyRequest) {
    return wrapper().wrap(
      context.user.token,
      superagent.post(`${config.proxyBuilder.baseUri}/proxies`)
        .set('content-type', 'application/json')
        .send(proxyRequest)
        .buffer(true)
        .parse(requestBodyBinaryParser)
    )
      .then((content) => content)
    ;
  }
};
