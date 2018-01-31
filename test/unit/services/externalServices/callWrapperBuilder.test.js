const container = require('../../../support/testContainerFactory').createContainer();

const _          = require('lodash');
const nock       = require('nock');
const superagent = require('superagent');

// ---

describe('callWrapper', container.describe(function () {
  let callWrapper;
  let customErrors;
  let errors;

  let accessToken;
  let host;
  let request;
  let resource;
  let response;
  let timeout;

  let promise;
  let callMock;

  beforeEach(function () {
    accessToken   = 'a9ca36ca-55c0-45fe-9857-sd1sd1d1wwd';
    host          = 'http://asd.com/api';
    resource      = '/organizations/4g5y4g5y-4g5y-d64h-h98r-4g5y4g5y4g5y';
    request       = superagent.get(`${host}${resource}`);
    response      = { a: 1, b: 2 };

    timeout       = 50;

    customErrors  = this.container.get('customErrors');
    errors        = this.container.get('errors');

    callMock      = nock(host)
      .get(resource)
    ;
  });

  afterEach(function () {
    nock.cleanAll();
  });

  describe('#wrap', function () {
    describe('when the call succeeds returning 200', function () {
      beforeEach(function () {
        callWrapper    = this.container.get('callWrapperBuilder').build(Error, timeout);
        callMock       = callMock.reply(200, response);

        return promise = callWrapper.wrap(accessToken, request);
      });

      it('should make the call', function () {
        callMock.isDone().should.be.true; // eslint-disable-line no-unused-expressions
      });

      it('should resolve with true', function () {
        return promise.should.eventually.deep.eq(response);
      });
    });

    describe('when call does not succeeds', function () {
      [
        {
          code: 502,
          type: 'ApiManagerError'
        },
        {
          code: 502,
          type: 'CoreServicesError'
        },
        {
          code: 502,
          type: 'CloudhubError'
        },
        {
          code: 502,
          type: 'HybridError'
        },
        {
          code: 502,
          type: 'ProxyBuilderError'
        }
      ].forEach(function (serviceError) {
        describe(`and it corresponds to a Bad Gateway coming from the serviceError ${serviceError.type}`, function () {
          beforeEach(function () {
            callWrapper = this.container.get('callWrapperBuilder').build(customErrors[serviceError.type], timeout);

            callMock    = callMock.reply(serviceError.code);

            return (promise = callWrapper.wrap(accessToken, request)).catch(_.noop);
          });

          it('should make the call', function () {
            callMock.isDone().should.be.true; // eslint-disable-line no-unused-expressions
          });

          it(`should build ${serviceError.type}`, function () {
            return promise.should.be.rejectedWith(errors.BadGatewayError);
          });
        });
      });
    });

    [{
      code: 200,
      time: 500,
      type: 'TimeoutError'
    }, {
      code: 401,
      type: 'UnauthorizedError'
    }, {
      code: 403,
      type: 'ForbiddenError'
    }, {
      code: 404,
      type: 'NotFoundError'
    }, {
      code: 504,
      type: 'Error'
    }].forEach((testCase) => {
      describe(`when the call does not succeeds returning ${testCase.code}`, function () {
        beforeEach(function () {
          if (testCase.time) {
            callMock = callMock.delayConnection(testCase.time);
          }

          callMock        = callMock.reply(testCase.code);

          return (promise = callWrapper.wrap(accessToken, request)).catch(_.noop);
        });

        it('should make the call', function () {
          callMock.isDone().should.be.true; // eslint-disable-line no-unused-expressions
        });

        it(`should build ${testCase.type}`, function () {
          return promise.should.be.rejectedWith(errors[testCase.type]);
        });
      });
    });
  });

  describe('#wrapCached', function () {
    let args;
    let cacheService;

    beforeEach(function () {
      args         = [1, 2, 3];

      cacheService = {
        get: this.sinon.stub(),
        set: this.sinon.stub()
      };

      cacheService.get.resolves(null);
      cacheService.set.resolves(null);

      callMock     = callMock.reply(200, response);
    });

    describe('when there is a cache hit', function () {
      beforeEach(function () {
        cacheService.get.resolves(response);

        return promise = callWrapper.wrapCached(cacheService, args, request);
      });

      it('should try to get from cache', function () {
        cacheService.get.getCall(0).args.should.deep.eq(args);
      });

      it('should not make the external call', function () {
        callMock.isDone().should.be.false; // eslint-disable-line no-unused-expressions
      });

      it('should not try to set to cache', function () {
        cacheService.set.should.have.not.been.called; // eslint-disable-line no-unused-expressions
      });

      it('should resolve with correct response', function () {
        return promise.should.eventually.deep.equal(response);
      });
    });

    describe('when there is a cache miss', function () {
      describe('without mapping', function () {
        beforeEach(function () {
          return promise = callWrapper.wrapCached(cacheService, args.slice(0), request);
        });

        it('should try to get from cache', function () {
          cacheService.get.getCall(0).args.should.deep.eq(args);
        });

        it('should make the external call', function () {
          callMock.isDone().should.be.true; // eslint-disable-line no-unused-expressions
        });

        it('should try to set to cache', function () {
          cacheService.set.getCall(0).args.should.deep.eq(args.concat(response));
        });

        it('should resolve with correct response', function () {
          return promise.should.eventually.deep.equal(response);
        });
      });

      describe('with mapping', function () {
        const mapping = (content) => content.a;

        beforeEach(function () {
          return promise = callWrapper.wrapCached(cacheService, args.slice(0), request, mapping);
        });

        it('should try to get from cache', function () {
          cacheService.get.getCall(0).args.should.deep.eq(args);
        });

        it('should make the external call', function () {
          callMock.isDone().should.be.true; // eslint-disable-line no-unused-expressions
        });

        it('should try to set to cache', function () {
          cacheService.set.getCall(0).args.should.deep.eq(args.concat(mapping(response)));
        });

        it('should resolve with correct response', function () {
          return promise.should.eventually.deep.equal(mapping(response));
        });
      });
    });
  });
}));
