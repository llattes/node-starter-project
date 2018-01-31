const _                    = require('lodash');
const testContainerFactory = require('../../support/testContainerFactory');

const container = testContainerFactory.createContainer();

describe('deploymentController', container.describe(() => {
  let context;
  let deploymentController;
  let deploymentService;
  let redirectController;
  let res;

  const httpMethodMapping = {
    patch: 'update',
    post:  'create',
    put:   'update'
  };

  beforeEach(function () {
    deploymentController = this.container.get('deploymentController');
    deploymentService    = this.container.get('deploymentService');
    redirectController   = this.container.get('redirectController');

    context              = {};
    res                  = {
      status: this.sinon.stub().returnsThis(),
      send:   this.sinon.stub().returnsThis()
    };
  });

  _.keys(httpMethodMapping).forEach((httpMethod) => {
    describe(httpMethod, () => {
      beforeEach(function () {
        this.sinon.stub(deploymentService,  httpMethodMapping[httpMethod]).resolves({});
        this.sinon.stub(redirectController, httpMethod);
      });

      describe('when Mule4', () => {
        beforeEach(() => {
          deploymentController[httpMethod]({
            context,
            body:   { gatewayVersion: '4.0.0' },
            params: { environmentApiId: '123' }
          }, res);
        });

        it('should call deploymentService', () =>
          deploymentService[httpMethodMapping[httpMethod]].should.have.been.calledWith({}, { gatewayVersion: '4.0.0', environmentApiId: 123 })
        );
      });

      describe('when not Mule4', () => {
        beforeEach(() => {
          deploymentController[httpMethod]({ body: { gatewayVersion: '3.9.0' } });
        });

        it('should redirect the request', () =>
          redirectController[httpMethod].should.have.been.called
        );
      });
    });
  });

  describe('rejection', () => {
    let next;

    beforeEach(function () {
      next = this.sinon.stub();

      this.sinon.stub(deploymentService, 'create').rejects(new Error());
    });

    describe('when Mule4', () => {
      beforeEach(function () {
        // eslint-disable-next-line max-len
        return deploymentController.post({ context, body: { gatewayVersion: '4.0.0' }, params: { environmentApiId: '123' } }, res, next);
      });

      it('should call deploymentService', () =>
        deploymentService.create.should.have.been.calledWith({}, { gatewayVersion: '4.0.0', environmentApiId: 123 })
      );

      it('should call next with an Error', function () {
        return next.should.have.been.calledWithMatch(this.sinon.match.instanceOf(Error));
      });
    });
  });
}));
