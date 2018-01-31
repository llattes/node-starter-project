const container = require('../../support/testContainerFactory').createContainer();
const jwt       = require('jsonwebtoken');

// ---

describe('authenticationMiddleware', container.describe(() => {
  let authenticationMiddleware;
  let uuidService;

  let req;
  let res;
  let next;

  beforeEach(function initauthenticationMiddleware() {
    authenticationMiddleware = this.container.get('authenticationMiddleware');
    uuidService              = this.container.get('uuidService');
    req                      = { context: {} };
  });

  describe('#setToken', function () {
    describe('and there is no authorization header', function () {
      beforeEach(function () {
        req.headers = {};
      });

      describe('and it is an available anonymous endpoint', function () {
        const config         = container.get('config');
        const anonymousPaths = config.authorization.anonymousPaths;

        anonymousPaths.forEach(function (anonymousPath) {
          describe(`like: ${anonymousPath}`, function () {
            beforeEach(function () {
              req.path = anonymousPath;
            });

            it('should populate the context with a null token', function (done) {
              next = function () {
                req.context.user.should.be.deep.equal({ token: null });
                done();
              };

              authenticationMiddleware.setToken(req, res, next);
            });
          });
        });
      });

      describe('for any path that is not permitted to be anonymous', function () {
        beforeEach(function () {
          req.path = '/some/different/path';
        });

        it('should reject', function (done) {
          next = function (error) {
            error.message.should.be.equal('Authorization Token missing');
            done();
          };

          authenticationMiddleware.setToken(req, res, next);
        });
      });
    });

    describe('and there is a malformed authorization header', function () {
      beforeEach(function () {
        req.headers = { authorization: 'malformedHeader' };
      });

      it('should reject', function (done) {
        next = function (error) {
          error.message.should.be.equal('Malformed header');
          done();
        };

        authenticationMiddleware.setToken(req, res, next);
      });
    });

    describe('and there is an authorization header with a scheme not supported', function () {
      let unsupportedScheme;

      beforeEach(function () {
        unsupportedScheme = 'unsupported';
        req.headers = { authorization: `${unsupportedScheme} token` };
      });

      it('should reject', function (done) {
        next = function (error) {
          error.message.should.be.equal(`Unsupported scheme: ${unsupportedScheme}`);
          done();
        };

        authenticationMiddleware.setToken(req, res, next);
      });
    });

    describe('and there is a valid authorization header with a CS token as bearer', function () {
      let validToken;

      beforeEach(function () {
        validToken  = uuidService.generateV4();
        req.headers = { authorization: `bearer ${validToken}` };
      });

      it('should populate the context with the token', function (done) {
        next = function () {
          req.context.user.token.should.be.equal(validToken);
          done();
        };

        authenticationMiddleware.setToken(req, res, next);
      });
    });

    describe('and there is a valid authorization header with a JWT as bearer', function () {
      let csToken;
      let validJwt;

      beforeEach(function () {
        csToken     = uuidService.generateV4();
        validJwt    = jwt.sign({ token: csToken }, 'secret');
        req.headers = { authorization: `bearer ${validJwt}` };

        this.sinon.spy(jwt, 'decode');
      });

      it('should decode the jwt and populate the context with the cs token', function (done) {
        next = function () {
          jwt.decode.should.have.been.calledWith(validJwt);
          req.context.user.token.should.be.equal(csToken);
          done();
        };

        authenticationMiddleware.setToken(req, res, next);
      });
    });

    describe('and there is an invalid authorization header with a JWT as bearer', function () {
      let invalidJwt;

      beforeEach(function () {
        invalidJwt    = 'invalid-jwt-token';
        req.headers = { authorization: `bearer ${invalidJwt}` };

        this.sinon.spy(jwt, 'decode');
      });

      it('should try to decode the jwt and reject', function (done) {
        next = function (error) {
          jwt.decode.should.have.been.calledWith(invalidJwt);
          error.message.should.be.equal('Invalid token');
          done();
        };

        authenticationMiddleware.setToken(req, res, next);
      });
    });

    describe('When token is sent by cookie without authorization header', function () {
      let csToken;
      let validJwt;

      beforeEach(function () {
        csToken  = uuidService.generateV4();
        validJwt = jwt.sign({ token: csToken }, 'secret');
        req      = {
          headers: {},
          method:  'GET',
          path:    `/organizations/${uuidService.generateV4()}/environments/${uuidService.generateV4()}/apis/${Date.now()}/proxy`,
          cookies: { token: validJwt },
          context: {}
        };

        this.sinon.spy(jwt, 'decode');
      });

      it('should decode the jwt and populate the context with the cs token', function (done) {
        next = function () {
          jwt.decode.should.have.been.calledWith(validJwt);
          req.context.user.token.should.be.equal(csToken);
          done();
        };

        authenticationMiddleware.setToken(req, res, next);
      });
    });

    describe('When token is sent by cookie and authorization header', function () {
      let csToken;
      let validJwt;

      beforeEach(function () {
        csToken  = uuidService.generateV4();
        validJwt = jwt.sign({ token: csToken }, 'secret');
        req      = {
          headers: { authorization: `bearer ${validJwt}` },
          method:  'GET',
          path:    `/organizations/${uuidService.generateV4()}/environments/${uuidService.generateV4()}/apis/${Date.now()}/proxy`,
          cookies: { token: validJwt },
          context: {}
        };

        this.sinon.spy(jwt, 'decode');
      });

      it('should decode the jwt and populate the context with the cs token', function (done) {
        next = function () {
          jwt.decode.should.have.been.calledWith(validJwt);
          req.context.user.token.should.be.equal(csToken);
          done();
        };

        authenticationMiddleware.setToken(req, res, next);
      });
    });

    describe('When token sent by cookie and authorization header mismatch', function () {
      beforeEach(function () {
        const csToken  = uuidService.generateV4();
        const validJwt = jwt.sign({ token: csToken }, 'secret');
        const csToken2  = uuidService.generateV4();
        const validJwt2 = jwt.sign({ token: csToken2 }, 'secret');
        req      = {
          headers: { authorization: `bearer ${validJwt}` },
          method:  'GET',
          path:    `/organizations/${uuidService.generateV4()}/environments/${uuidService.generateV4()}/apis/${Date.now()}/proxy`,
          cookies: { token: validJwt2 },
          context: {}
        };

        this.sinon.spy(jwt, 'decode');
      });

      it('should decode the jwt and populate the context with the cs token', function (done) {
        next = function (error) {
          error.message.should.be.equal('Cookie vs Header mismatch');
          done();
        };

        authenticationMiddleware.setToken(req, res, next);
      });
    });
  });

  describe('#setOrganizationId', function () {
    let organizationId;

    beforeEach(function () {
      organizationId = 'organization-b5252bf8-f8c8-4b7d-bd02-40a123fb24ec';
      req.params = {
        organizationId
      };
    });

    it('should populate the context with the organization', function (done) {
      next = function () {
        req.context.organization.should.be.deep.equal({ id: organizationId });
        done();
      };

      authenticationMiddleware.setOrganizationId(req, res, next);
    });
  });

  describe('#setEnvironmentId', function () {
    let environmentId;

    beforeEach(function () {
      environmentId = 'environment-5c55d067-cf46-429c-8eab-8bb8af30e778';
      req.params = {
        environmentId
      };
    });

    it('should populate the context with the environment', function (done) {
      next = function () {
        req.context.environmentId.should.be.equal(environmentId);
        done();
      };

      authenticationMiddleware.setEnvironmentId(req, res, next);
    });
  });
}));
