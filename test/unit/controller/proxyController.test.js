const testContainerFactory = require('../../support/testContainerFactory');
const Promise              = require('bluebird');

const container = testContainerFactory.createContainer();

describe('proxyController', container.describe(() => {
  let apiPlatformGateway;
  let endDefer;
  let getDefer;
  let next;
  let proxyController;
  let proxyService;
  let redirectController;
  let req;
  let res;

  beforeEach(function initErrorMiddleware() {
    apiPlatformGateway = this.container.get('apiPlatformGateway');
    proxyController    = this.container.get('proxyController');
    proxyService       = this.container.get('proxyService');
    redirectController = this.container.get('redirectController');

    req                = {
      context: {
        user: { token: 'token' }
      },
      params:  {
        environmentApiId: 1
      }
    };

    res                = {
      attachment: this.sinon.stub(),
      send:       this.sinon.stub()
    };

    next               = this.sinon.stub();
    endDefer           = Promise.defer();
    getDefer           = Promise.defer();

    this.sinon.stub(apiPlatformGateway, 'getEnvironmentApi').returns(endDefer.promise);
    this.sinon.stub(proxyService,       'get').returns(getDefer.promise);
    this.sinon.stub(redirectController, 'getProxy');
  });

  describe('get', () => {
    let promise;
    let result;

    describe('when mule 4', () => {
      beforeEach(() => {
        promise = proxyController.get(req, res, next);

        endDefer.resolve({
          endpoint: { muleVersion4OrAbove: true }
        });

        getDefer.resolve(result = {
          name:   `${Date.now()}`,
          buffer: `${Date.now()}`
        });
      });

      it('should have called proxyService', () =>
        promise.then(() => proxyService.get.should.have.been.called)
      );

      it('should call res.attachment', () =>
        promise.then(() => res.attachment.should.have.been.calledWith(`${result.name}.jar`))
      );

      it('should call res.send', () =>
        promise.then(() => res.send.should.have.been.calledWith(result.buffer))
      );
    });

    describe('when not mule 4', () => {
      beforeEach(() => {
        promise = proxyController.get(req);
        endDefer.resolve({
          endpoint: { muleVersion4OrAbove: false }
        });
      });

      it('should have called redirectController', () =>
        promise.then(() => redirectController.getProxy.should.have.been.called)
      );
    });
  });
}));
