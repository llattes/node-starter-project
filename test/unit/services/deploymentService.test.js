const testContainerFactory = require('../../support/testContainerFactory');
const _                    = require('lodash');

const container = testContainerFactory.createContainer();

describe('deploymentService', container.describe(() => {
  let apiPlatformGateway;
  let context;
  let deployment;
  let errors;
  let deploymentService;
  let environmentApi;
  let environmentApiId;
  let proxyService;

  beforeEach(function () {
    apiPlatformGateway = this.container.get('apiPlatformGateway');
    errors             = this.container.get('errors');
    deploymentService  = this.container.get('deploymentService');
    proxyService       = this.container.get('proxyService');

    environmentApiId   = Date.now();
    environmentApi     = {
      endpoint: { muleVersion4OrAbove: null },
      id:       environmentApiId
    };

    context            = {};
    deployment         = { environmentApiId };
  });

  describe('#create', function () {
    describe('when endpoint is not configured for Mule 4', function () {
      let promise;

      beforeEach(function () {
        this.sinon.stub(apiPlatformGateway, 'getEnvironmentApi').resolves(environmentApi);
        return (promise = deploymentService.create(context, deployment)).catch(_.noop);
      });

      it('should reject promise', function () {
        return promise.should.be.rejectedWith(errors.BadRequest);
      });
    });

    describe('when endpoint is configured for Mule 4', function () {
      let proxyDeploymentEntity;

      beforeEach(function () {
        proxyDeploymentEntity = {
          applicationName: 'proxy-name',
          gatewayVersion:  '4.x.x',
          environmentId:   `${Date.now} + 1`
        };

        environmentApi.endpoint.muleVersion4OrAbove = true;

        this.sinon.stub(apiPlatformGateway, 'getEnvironmentApi').resolves(environmentApi);
        this.sinon.stub(apiPlatformGateway, 'createProxyDeploymentEntity').resolves(proxyDeploymentEntity);
        this.sinon.stub(apiPlatformGateway, 'updateProxyDeploymentEntity').resolves();
        this.sinon.stub(proxyService,       'get').resolves({ buffer: {}, name: 'proxyName' });
      });
    });
  });

  describe('#update', function () {
    describe('when endpoint is not configured for Mule 4', function () {
      let promise;

      beforeEach(function () {
        this.sinon.stub(apiPlatformGateway, 'getEnvironmentApi').resolves(environmentApi);
        return (promise = deploymentService.update(context, deployment)).catch(_.noop);
      });

      it('should reject promise', function () {
        return promise.should.be.rejectedWith(errors.BadRequest);
      });
    });
  });
}));
