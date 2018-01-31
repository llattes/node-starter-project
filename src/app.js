const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

module.exports = function $app(
  apiV1Router,
  errorLoggingMiddleware,
  errorMiddleware,
  winston2LoggerMiddleware
) {
  const app = express();

  // ---

  app.use(winston2LoggerMiddleware());

  // ---

  app.use(cookieParser());
  app.use(bodyParser.json());
  app.use(apiV1Router);

  // ---

  app.use(errorLoggingMiddleware);
  app.use(errorMiddleware);

  return app;
};
