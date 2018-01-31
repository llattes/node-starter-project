module.exports = function errorLoggingMiddleware(logger) {
  const innerErrorLoggingMiddleware = (err, req, res, next) => {
    logger.error(err);
    next(err);
  };

  return innerErrorLoggingMiddleware;
};
