const testContainerFactory = require('../../support/testContainerFactory');
const _                    = require('lodash');

const container = testContainerFactory.createContainer();

describe('deploymentService', container.describe(() => {
  let apiPlatformGateway;
  let chService;
  let context;
  let deployment;
  let errors;
  let hybridService;
  let deploymentService;
  let environmentApi;
  let environmentApiId;
  let proxyService;

  beforeEach(function () {
    apiPlatformGateway = this.container.get('apiPlatformGateway');
    chService          = this.container.get('chService');
    errors             = this.container.get('errors');
    hybridService      = this.container.get('hybridService');
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
      let applicationInfo;
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

      describe('and deployment type is for Cloudhub', function () {
        [
          {
            overwrite:   false,
            description: 'and deploying without overriding'
          },
          {
            overwrite:   true,
            description: 'and deploying overriding'
          }
        ].forEach(function (test) {
          describe(`${test.description}`, function () {
            let config;

            beforeEach(function () {
              config                          = { ignoreDuplicatedError: test.overwrite };
              proxyDeploymentEntity.type      = 'CH';
              proxyDeploymentEntity.overwrite = test.overwrite;

              applicationInfo                 = {
                apiVersionId:   deployment.environmentApiId,
                name:           proxyDeploymentEntity.applicationName,
                gatewayVersion: proxyDeploymentEntity.gatewayVersion,
                environmentId:  proxyDeploymentEntity.environmentId
              };

              this.sinon.stub(chService, 'upsertApplication').resolves();
              this.sinon.stub(chService, 'deployApplication').resolves();

              return deploymentService.create(context, deployment);
            });

            it('should call API Manager to create the Proxy Deployment entity', function () {
              apiPlatformGateway.createProxyDeploymentEntity.should.have.been.calledWith(context, deployment.environmentApiId, deployment);
            });

            it('should call Cloudhub to upsert the application', function () {
              chService.upsertApplication.should.have.been.calledWith(context, applicationInfo, config);
            });

            it('should call the Proxy Builder to retrieve the corresponding proxy', function () {
              proxyService.get.should.have.been.calledWith(context, environmentApi);
            });

            it('should call Cloudhub to deploy the application', function () {
              chService.deployApplication.should.have.been.calledWith(context, applicationInfo, {});
            });
          });
        });
      });

      describe('and deployment type is for Hybrid', function () {
        let deployedApp;

        beforeEach(function () {
          _.assign(proxyDeploymentEntity, {
            type:          'HY',
            applicationId: Date.now(),
            targetType:    `type-${Date.now()}`,
            targetId:      Date.now() + 1,
            targetName:    `name-${Date.now()}`
          });

          applicationInfo = {
            apiVersionId:   deployment.environmentApiId,
            name:           proxyDeploymentEntity.applicationName,
            applicationId:  proxyDeploymentEntity.applicationId,
            targetType:     proxyDeploymentEntity.targetType,
            targetId:       proxyDeploymentEntity.targetId,
            targetName:     proxyDeploymentEntity.targetName,
            gatewayVersion: proxyDeploymentEntity.gatewayVersion,
            environmentId:  proxyDeploymentEntity.environmentId
          };

          deployedApp     = {
            applicationId: Date.now(),
            name:          `appName-${Date.now()}`,
            targetId:      proxyDeploymentEntity.targetId
          };

          this.sinon.stub(hybridService, 'deployApplication').resolves(deployedApp);

          return deploymentService.create(context, deployment);
        });

        it('should call API Manager to create the Proxy Deployment entity', function () {
          apiPlatformGateway.createProxyDeploymentEntity.should.have.been.calledWith(context, deployment.environmentApiId, deployment);
        });

        it('should call the Proxy Builder to retrieve the corresponding proxy', function () {
          proxyService.get.should.have.been.calledWith(context, environmentApi);
        });

        it('should call Hybrid to deploy the application', function () {
          hybridService.deployApplication.should.have.been.calledWith(context, _.assign(applicationInfo, { name: 'proxyName' }), {});
        });

        it('should call API Manager to update the Proxy Deployment entity', function () {
          // eslint-disable-next-line max-len
          apiPlatformGateway.updateProxyDeploymentEntity.should.have.been.calledWith(context, applicationInfo.apiVersionId, proxyDeploymentEntity);
        });
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

    describe('when endpoint is configured for Mule 4', function () {
      let applicationInfo;
      let proxyDeploymentEntity;

      beforeEach(function () {
        proxyDeploymentEntity = {
          applicationName: 'proxy-name',
          gatewayVersion:  '4.x.x',
          environmentId:   `${Date.now} + 1`
        };

        environmentApi.endpoint.muleVersion4OrAbove = true;

        this.sinon.stub(apiPlatformGateway, 'getEnvironmentApi').resolves(environmentApi);
        this.sinon.stub(apiPlatformGateway, 'updateProxyDeploymentEntity').resolves(proxyDeploymentEntity);
        this.sinon.stub(proxyService,       'get').resolves({ buffer: {}, name: 'proxyName' });
      });

      describe('and deployment type is for Cloudhub', function () {
        let config;

        beforeEach(function () {
          config                          = { ignoreDuplicatedError: true };
          proxyDeploymentEntity.type      = 'CH';

          applicationInfo                 = {
            apiVersionId:   deployment.environmentApiId,
            name:           proxyDeploymentEntity.applicationName,
            gatewayVersion: proxyDeploymentEntity.gatewayVersion,
            environmentId:  proxyDeploymentEntity.environmentId
          };

          this.sinon.stub(chService, 'upsertApplication').resolves();
          this.sinon.stub(chService, 'deployApplication').resolves();

          return deploymentService.update(context, deployment);
        });

        it('should call API Manager to validate API is configured for Mule 4', function () {
          apiPlatformGateway.getEnvironmentApi.should.have.been.calledWith(context, deployment.environmentApiId);
        });

        it('should call API Manager to update the Proxy Deployment entity', function () {
          apiPlatformGateway.updateProxyDeploymentEntity.should.have.been.calledWith(context, deployment.environmentApiId, deployment);
        });

        it('should call Cloudhub to upsert the application', function () {
          chService.upsertApplication.should.have.been.calledWith(context, applicationInfo, config);
        });

        it('should call the Proxy Builder to retrieve the corresponding proxy', function () {
          proxyService.get.should.have.been.calledWith(context, environmentApi);
        });

        it('should call Cloudhub to deploy the application', function () {
          chService.deployApplication.should.have.been.calledWith(context, applicationInfo, {});
        });
      });

      describe('and deployment type is for Hybrid', function () {
        let updatedDeployedApp;

        beforeEach(function () {
          _.assign(proxyDeploymentEntity, {
            type:          'HY',
            applicationId: Date.now(),
            targetType:    `type-${Date.now()}`,
            targetId:      Date.now() + 1,
            targetName:    `name-${Date.now()}`
          });

          applicationInfo    = {
            apiVersionId:   deployment.environmentApiId,
            name:           proxyDeploymentEntity.applicationName,
            applicationId:  proxyDeploymentEntity.applicationId,
            targetType:     proxyDeploymentEntity.targetType,
            targetId:       proxyDeploymentEntity.targetId,
            targetName:     proxyDeploymentEntity.targetName,
            gatewayVersion: proxyDeploymentEntity.gatewayVersion,
            environmentId:  proxyDeploymentEntity.environmentId
          };

          updatedDeployedApp = {
            applicationId: Date.now(),
            name:          `appName-${Date.now()}`,
            targetId:      proxyDeploymentEntity.targetId
          };

          this.sinon.stub(hybridService, 'deployApplication').resolves(updatedDeployedApp);

          return deploymentService.update(context, deployment);
        });

        it('should call API Manager to validate API is configured for Mule 4', function () {
          apiPlatformGateway.getEnvironmentApi.should.have.been.calledWith(context, deployment.environmentApiId);
        });

        it('should call API Manager to update the Proxy Deployment entity', function () {
          apiPlatformGateway.updateProxyDeploymentEntity.should.have.been.calledWith(context, deployment.environmentApiId, deployment);
        });

        it('should call the Proxy Builder to retrieve the corresponding proxy', function () {
          proxyService.get.should.have.been.calledWith(context, environmentApi);
        });

        it('should call Hybrid to deploy the application', function () {
          hybridService.deployApplication.should.have.been.calledWith(context, _.assign(applicationInfo, { name: 'proxyName' }), {});
        });

        it('should call API Manager to update the Proxy Deployment entity', function () {
          // eslint-disable-next-line max-len
          apiPlatformGateway.updateProxyDeploymentEntity.should.have.been.calledWith(context, applicationInfo.apiVersionId, proxyDeploymentEntity);
        });
      });
    });
  });
}));
