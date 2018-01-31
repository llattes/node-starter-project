const testContainerFactory = require('../../support/testContainerFactory');
const Promise              = require('bluebird');
const _                    = require('lodash');

// ---

const container = testContainerFactory.createContainer();

// ---

describe('RedirectController', container.describe(() => {
  let config;
  let endDefer;
  let error;
  let promise;
  let redirectController;
  let req;
  let request;
  let res;
  let response;
  let superagent;

  beforeEach(function () {
    redirectController = this.container.get('redirectController');
    superagent         = this.container.get('superagent');
    config             = this.container.get('config');
    endDefer           = Promise.defer();
    request            = {};
    res                = {};
    config.redirect    = {
      baseUri:     'https://redirect.uri',
      proxiesPath: '/proxies/path'
    };

    _.assign(res, {
      attachment: this.sinon.stub().returns(res),
      body:       this.sinon.stub().returns(res),
      send:       this.sinon.stub().returns(res),
      status:     this.sinon.stub().returns(res)
    });

    _.assign(request, {
      buffer:  this.sinon.stub().returns(request),
      end:     this.sinon.stub().returns(endDefer.promise),
      parse:   this.sinon.stub().returns(endDefer.promise),
      query:   this.sinon.stub().returns(request),
      send:    this.sinon.stub().returns(request),
      set:     this.sinon.stub().returns(request),
      timeout: this.sinon.stub().returns(request)
    });
  });

  describe('GET', () => {
    beforeEach(function () {
      this.sinon.stub(superagent, 'get').returns(request);
    });

    describe('When redirect fails', () => {
      beforeEach(() => {
        error = {
          response: {
            body:    'some-error',
            status:  412
          }
        };

        endDefer.reject(error);

        req = {
          url:     '/get/path',
          headers: { authorization: 'token' }
        };

        promise = redirectController.get(req, res).catch(_.noop);
      });

      it('should set header with authorization token', () =>
        promise.then(() => request.set.should.have.been.calledWith('Authorization', req.headers.authorization))
      );

      it('should set header with content-type application/json', () =>
        promise.then(() => request.set.should.have.been.calledWith('content-type', 'application/json'))
      );

      it('should redirect to api platform', () => {
        superagent.get.should.have.been.calledWith(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}/get/path`);
      });

      it('should set error status code', () =>
        promise.then(() => res.status.should.have.been.calledWith(error.response.status))
      );

      it('should respond with error body', () =>
        promise.then(() => res.send.should.have.been.calledWith(error.response.body))
      );
    });

    describe('When redirect is successful', () => {
      beforeEach(() => {
        response = {
          body:    'some-body',
          status:  321
        };

        endDefer.resolve(response);

        req = {
          url:     '/get/path',
          headers: { authorization: 'token' }
        };

        promise = redirectController.get(req, res).catch(_.noop);
      });

      it('should set header with authorization token', () =>
        promise.then(() => request.set.should.have.been.calledWith('Authorization', req.headers.authorization))
      );

      it('should set header with content-type application/json', () =>
        promise.then(() => request.set.should.have.been.calledWith('content-type', 'application/json'))
      );

      it('should redirect to api platform', () => {
        superagent.get.should.have.been.calledWith(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}/get/path`);
      });

      it('should set status code', () =>
        promise.then(() => res.status.should.have.been.calledWith(response.status))
      );

      it('should respond with body', () =>
        promise.then(() => res.send.should.have.been.calledWith(response.body))
      );
    });
  });

  describe('GET Proxy', () => {
    beforeEach(function () {
      this.sinon.stub(superagent, 'get').returns(request);
    });

    describe('When redirect fails', () => {
      beforeEach(() => {
        error = {
          response: {
            body:    'some-error',
            status:  412
          }
        };

        endDefer.reject(error);

        req = {
          url:     '/get/path',
          headers: { authorization: 'bearer token' }
        };

        promise = redirectController.getProxy(req, res).catch(_.noop);
      });

      it('should set header with authorization token', () =>
        promise.then(() => request.set.should.have.been.calledWith('Authorization', req.headers.authorization))
      );

      it('should set header with content-type application/json', () =>
        promise.then(() => request.set.should.have.been.calledWith('content-type', 'application/json'))
      );

      it('should redirect to api platform', () => {
        superagent.get.should.have.been.calledWith(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}/get/path`);
      });

      it('should set error status code', () =>
        promise.then(() => res.status.should.have.been.calledWith(error.response.status))
      );

      it('should respond with error body', () =>
        promise.then(() => res.send.should.have.been.calledWith(error.response.body))
      );
    });

    describe('When redirect is successful', () => {
      describe('When token is passed in header', () => {
        let filename;
        beforeEach(() => {
          filename = 'filename.jpg';
          response = {
            headers: {
              'content-disposition': `attachment; filename = "${filename}"`
            },
            body:    'some-body',
            status:  321
          };
          endDefer.resolve(response);

          req = {
            url:     '/get/path',
            headers: { authorization: 'bearer token' }
          };

          promise = redirectController.getProxy(req, res).catch(_.noop);
        });

        it('should set header with authorization token', () =>
          promise.then(() => request.set.should.have.been.calledWith('Authorization', req.headers.authorization))
        );

        it('should not set cookie', () =>
          promise.then(() => request.set.should.not.have.been.calledWith('Cookie'))
        );

        it('should set header with content-type application/json', () =>
          promise.then(() => request.set.should.have.been.calledWith('content-type', 'application/json'))
        );

        it('should redirect to api platform', () => {
          superagent.get.should.have.been.calledWith(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}/get/path`);
        });

        it('should pass filename as attachment', () =>
          promise.then(() => res.attachment.should.have.been.calledWith(filename))
        );

        it('should set status code', () =>
          promise.then(() => res.status.should.have.been.calledWith(response.status))
        );

        it('should respond with body', () =>
          promise.then(() => res.send.should.have.been.calledWith(response.body))
        );
      });

      describe('When token is passed in cookie', () => {
        let filename;
        beforeEach(() => {
          filename = 'filename.jpg';
          response = {
            headers: {
              'content-disposition': `attachment; filename = "${filename}"`
            },
            body:    'some-body',
            status:  321
          };
          endDefer.resolve(response);

          req = {
            url:     '/get/path',
            cookies: { token: 'token' },
            headers: { cookie: 'token=token;' }
          };

          promise = redirectController.getProxy(req, res).catch(_.noop);
        });

        it('should set cookie', () =>
          promise.then(() => request.set.should.have.been.calledWith('Cookie', req.headers.cookie))
        );

        it('should not set authorization token', () =>
          promise.then(() => request.set.should.not.have.been.calledWith('Authorization'))
        );

        it('should set header with content-type application/json', () =>
          promise.then(() => request.set.should.have.been.calledWith('content-type', 'application/json'))
        );

        it('should redirect to api platform', () => {
          superagent.get.should.have.been.calledWith(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}/get/path`);
        });

        it('should pass filename as attachment', () =>
          promise.then(() => res.attachment.should.have.been.calledWith(filename))
        );

        it('should set status code', () =>
          promise.then(() => res.status.should.have.been.calledWith(response.status))
        );

        it('should respond with body', () =>
          promise.then(() => res.send.should.have.been.calledWith(response.body))
        );
      });
    });
  });

  describe('POST', () => {
    beforeEach(function () {
      this.sinon.stub(superagent, 'post').returns(request);
    });

    describe('When redirect fails', () => {
      beforeEach(() => {
        error = {
          response: {
            body:    'some-error',
            status:  412
          }
        };

        endDefer.reject(error);

        req = {
          url:     '/post/path',
          headers: { authorization: 'token' }
        };

        promise = redirectController.post(req, res).catch(_.noop);
      });

      it('should set header with authorization token', () =>
        promise.then(() => request.set.should.have.been.calledWith('Authorization', req.headers.authorization))
      );

      it('should set header with content-type application/json', () =>
        promise.then(() => request.set.should.have.been.calledWith('content-type', 'application/json'))
      );

      it('should redirect to api platform', () => {
        superagent.post.should.have.been.calledWith(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}/post/path`);
      });

      it('should set error status code', () =>
        promise.then(() => res.status.should.have.been.calledWith(error.response.status))
      );

      it('should respond with error body', () =>
        promise.then(() => res.send.should.have.been.calledWith(error.response.body))
      );
    });

    describe('When redirect is successful', () => {
      beforeEach(function () {
        response = {
          body:    'some-body',
          status:  321
        };

        endDefer.resolve(response);

        req = {
          url:     '/post/path',
          headers: { authorization: 'token' }
        };

        promise = redirectController.post(req, res).catch(_.noop);
      });

      it('should set header with authorization token', () =>
        promise.then(() => request.set.should.have.been.calledWith('Authorization', req.headers.authorization))
      );

      it('should set header with content-type application/json', () =>
        promise.then(() => request.set.should.have.been.calledWith('content-type', 'application/json'))
      );

      it('should redirect to api platform', () => {
        superagent.post.should.have.been.calledWith(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}/post/path`);
      });

      it('should set status code', () =>
        promise.then(() => res.status.should.have.been.calledWith(response.status))
      );

      it('should respond with body', () =>
        promise.then(() => res.send.should.have.been.calledWith(response.body))
      );
    });
  });

  describe('PATCH', () => {
    beforeEach(function () {
      this.sinon.stub(superagent, 'patch').returns(request);
    });

    describe('When redirect fails', () => {
      beforeEach(() => {
        error = {
          response: {
            body:    'some-error',
            status:  412
          }
        };

        endDefer.reject(error);

        req = {
          url:     '/patch/path',
          headers: { authorization: 'token' }
        };

        promise = redirectController.patch(req, res).catch(_.noop);
      });

      it('should set header with authorization token', () =>
        promise.then(() => request.set.should.have.been.calledWith('Authorization', req.headers.authorization))
      );

      it('should set header with content-type application/json', () =>
        promise.then(() => request.set.should.have.been.calledWith('content-type', 'application/json'))
      );

      it('should redirect to api platform', () => {
        superagent.patch.should.have.been.calledWith(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}/patch/path`);
      });

      it('should set error status code', () =>
        promise.then(() => res.status.should.have.been.calledWith(error.response.status))
      );

      it('should respond with error body', () =>
        promise.then(() => res.send.should.have.been.calledWith(error.response.body))
      );
    });

    describe('When redirect is successful', () => {
      beforeEach(() => {
        response = {
          body:    'some-body',
          status:  321
        };

        endDefer.resolve(response);

        req = {
          url:     '/patch/path',
          headers: { authorization: 'token' }
        };

        promise = redirectController.patch(req, res).catch(_.noop);
      });

      it('should set header with authorization token', () =>
        promise.then(() => request.set.should.have.been.calledWith('Authorization', req.headers.authorization))
      );

      it('should set header with content-type application/json', () =>
        promise.then(() => request.set.should.have.been.calledWith('content-type', 'application/json'))
      );

      it('should redirect to api platform', () => {
        superagent.patch.should.have.been.calledWith(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}/patch/path`);
      });

      it('should set status code', () =>
        promise.then(() => res.status.should.have.been.calledWith(response.status))
      );

      it('should respond with body', () =>
        promise.then(() => res.send.should.have.been.calledWith(response.body))
      );
    });
  });

  describe('PUT', () => {
    beforeEach(function () {
      this.sinon.stub(superagent, 'put').returns(request);
    });

    describe('When redirect fails', () => {
      beforeEach(() => {
        error = {
          response: {
            body:    'some-error',
            status:  412
          }
        };

        endDefer.reject(error);

        req = {
          url:     '/put/path',
          headers: { authorization: 'token' }
        };

        promise = redirectController.put(req, res).catch(_.noop);
      });

      it('should set header with authorization token', () =>
        promise.then(() => request.set.should.have.been.calledWith('Authorization', req.headers.authorization))
      );

      it('should set header with content-type application/json', () =>
        promise.then(() => request.set.should.have.been.calledWith('content-type', 'application/json'))
      );

      it('should redirect to api platform', () => {
        superagent.put.should.have.been.calledWith(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}/put/path`);
      });

      it('should set error status code', () =>
        promise.then(() => res.status.should.have.been.calledWith(error.response.status))
      );

      it('should respond with error body', () =>
        promise.then(() => res.send.should.have.been.calledWith(error.response.body))
      );
    });

    describe('When redirect is successful', () => {
      beforeEach(() => {
        response = {
          body:    'some-body',
          status:  321
        };

        endDefer.resolve(response);

        req = {
          url:     '/put/path',
          headers: { authorization: 'token' }
        };

        promise = redirectController.put(req, res).catch(_.noop);
      });

      it('should set header with authorization token', () =>
        promise.then(() => request.set.should.have.been.calledWith('Authorization', req.headers.authorization))
      );

      it('should set header with content-type application/json', () =>
        promise.then(() => request.set.should.have.been.calledWith('content-type', 'application/json'))
      );

      it('should redirect to api platform', () => {
        superagent.put.should.have.been.calledWith(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}/put/path`);
      });

      it('should set status code', () =>
        promise.then(() => res.status.should.have.been.calledWith(response.status))
      );

      it('should respond with body', () =>
        promise.then(() => res.send.should.have.been.calledWith(response.body))
      );
    });
  });
}));
