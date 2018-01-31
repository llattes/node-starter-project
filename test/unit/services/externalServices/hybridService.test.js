const container = require('../../../support/testContainerFactory').createContainer();
const _         = require('lodash');

// ---

describe('hybridService', container.describe(function () {
  let errors;
  let hybridService;
  let hybridGateway;

  beforeEach(function () {
    errors        = this.container.get('errors');
    hybridService = this.container.get('hybridService');
    hybridGateway = this.container.get('hybridGateway');
  });

  describe('#deployApplication', function () {
    let applicationInfo;
    let applicationId;
    let environmentId;
    let proxyStream;
    let promise;

    beforeEach(function () {
      this.sinon.stub(hybridGateway, 'getApplication');
      this.sinon.stub(hybridGateway, 'createApplication');
      this.sinon.stub(hybridGateway, 'updateApplication');
      this.sinon.stub(hybridGateway, 'getApplicationsByQuery');

      environmentId   = `${Date.now()}`;

      proxyStream     = {
        value: 'IOU a ProxyStream'
      };

      applicationId   = Date.now();

      applicationInfo = {
        environmentId,
        name:     'my-proxy',
        targetId: Date.now()
      };
    });

    describe('when application id is not provided', function () {
      beforeEach(function () {
        hybridGateway.createApplication.returns(Promise.resolve({ id: applicationId }));

        return promise = hybridService.deployApplication(context, applicationInfo, proxyStream);
      });

      it('should not call hybridGateway.getApplication', function () {
        // eslint-disable-next-line no-unused-expressions
        hybridGateway.getApplication.should.not.have.been.called;
      });

      it('should call hybridGateway.createApplication', function () {
        hybridGateway.createApplication.should.have.been.calledWith(context, applicationInfo.environmentId, {
          artifactName: applicationInfo.name,
          targetId:     applicationInfo.targetId,
          file:         {
            name:   `${applicationInfo.name}.jar`,
            stream: proxyStream
          }
        });
      });

      it('should return the id of the created application', function () {
        return promise.should.eventually.have.property('applicationId', applicationId);
      });
    });

    describe('when application does not exist', function () {
      beforeEach(function () {
        applicationInfo.applicationId = applicationId;
        hybridGateway.getApplication.rejects({ responseStatus: 404 });
      });

      [
        409,
        500
      ].forEach(function (errorCode) {
        describe(`and hybrid returns an error of code ${errorCode}`, function () {
          beforeEach(function () {
            hybridGateway.createApplication.rejects({ responseStatus: errorCode });

            return (promise = hybridService.deployApplication(context, applicationInfo, proxyStream)).catch(_.noop);
          });

          it('should call hybridGateway.getApplication', function () {
            hybridGateway.getApplication.should.have.been.calledWith(context, applicationInfo.environmentId, applicationInfo.applicationId);
          });

          it('should call hybridGateway.createApplication', function () {
            hybridGateway.createApplication.should.have.been.calledWith(context, applicationInfo.environmentId, {
              artifactName: applicationInfo.name,
              targetId:     applicationInfo.targetId,
              file:         {
                name:   `${applicationInfo.name}.jar`,
                stream: proxyStream
              }
            });
          });

          it('should reject the deployment', function () {
            return promise.should.eventually.be.rejected;
          });
        });
      });

      describe('and it is succesfully deployed', function () {
        beforeEach(function () {
          hybridGateway.createApplication.resolves({ id: applicationId });

          return promise = hybridService.deployApplication(context, applicationInfo, proxyStream);
        });

        it('should call hybridGateway.getApplication', function () {
          hybridGateway.getApplication.should.have.been.calledWith(context, applicationInfo.environmentId, applicationInfo.applicationId);
        });

        it('should call hybridGateway.createApplication', function () {
          hybridGateway.createApplication.should.have.been.calledWith(context, applicationInfo.environmentId, {
            artifactName: applicationInfo.name,
            targetId:     applicationInfo.targetId,
            file:         {
              name:   `${applicationInfo.name}.jar`,
              stream: proxyStream
            }
          });
        });

        it('should return the id of the created application', function () {
          return promise.should.eventually.have.property('applicationId', applicationId);
        });
      });
    });

    describe('when there is NO application deployed in the same target with the same name', function () {
      let application;

      beforeEach(function () {
        application = {
          target: {
            id: 666
          }
        };

        applicationInfo.applicationId = applicationId;

        hybridGateway.getApplication.resolves(application);
        hybridGateway.createApplication.resolves({ id: applicationId });
        hybridGateway.getApplicationsByQuery.resolves([]);

        return promise = hybridService.deployApplication(context, applicationInfo, proxyStream);
      });

      it('should call hybridGateway.getApplication', function () {
        hybridGateway.getApplication.should.have.been.calledWith(context, applicationInfo.environmentId, applicationInfo.applicationId);
      });

      it('should call hybridGateway.createApplication', function () {
        hybridGateway.createApplication.should.have.been.calledWith(context, applicationInfo.environmentId, {
          artifactName: applicationInfo.name,
          targetId:     applicationInfo.targetId,
          file:         {
            name:   `${applicationInfo.name}.jar`,
            stream: proxyStream
          }
        });
      });

      it('should not call hybridGateway.updateApplication', function () {
        // eslint-disable-next-line no-unused-expressions
        hybridGateway.updateApplication.should.have.not.been.called;
      });

      it('should return the id of the created application', function () {
        return promise.should.eventually.have.property('applicationId', applicationId);
      });
    });

    describe('when there is an application deployed in the same target with the same name', function () {
      let application;

      beforeEach(function () {
        application = {
          target: {
            id: applicationInfo.targetId
          }
        };

        applicationInfo.applicationId = applicationId;

        hybridGateway.getApplication.resolves(application);
        hybridGateway.updateApplication.resolves({ id: applicationId });
        hybridGateway.getApplicationsByQuery.resolves([{ id: applicationId }]);

        return promise = hybridService.deployApplication(context, applicationInfo, proxyStream);
      });

      it('should call hybridGateway.getApplication', function () {
        hybridGateway.getApplication.should.have.been.calledWith(context, applicationInfo.environmentId, applicationInfo.applicationId);
      });

      it('should call hybridGateway.updateApplication to upload the proxy', function () {
        hybridGateway.updateApplication.should.have.been.calledWith(context, applicationInfo.environmentId, applicationInfo.applicationId, {
          file: {
            name:   `${applicationInfo.name}.jar`,
            stream: proxyStream
          }
        });
      });

      it('should not call hybridGateway.createApplication', function () {
        // eslint-disable-next-line no-unused-expressions
        hybridGateway.createApplication.should.have.not.been.called;
      });

      it('should return the applicationInfo', function () {
        return promise.should.eventually.be.equal(applicationInfo);
      });
    });
  });

  describe('#getApplication', function () {
    let promise;
    let application;
    let environmentId;

    beforeEach(function () {
      application = {
        id: Date.now()
      };

      environmentId = `${Date.now() + 5}`;

      this.sinon.stub(hybridGateway, 'getApplication').resolves({});
    });

    describe('on call', function () {
      beforeEach(function () {
        return hybridService.getApplication(context, environmentId, application.id);
      });

      it('should call hybridGateway.getApplication', function () {
        hybridGateway.getApplication.should.have.been.calledWith(context, environmentId, application.id);
      });
    });

    describe('when hybridGateway.getApplication succeeds', function () {
      let hybridApplication;

      beforeEach(function () {
        hybridApplication = {
          id:                 application.id,
          target:             {
            id: Date.now()
          },
          artifact:           {
            name: 'my-proxy.jar'
          },
          lastReportedStatus: 'STARTED',
          desiredStatus:      'STARTED'
        };

        hybridGateway.getApplication.resolves(hybridApplication);

        return promise = hybridService.getApplication(context, environmentId, application.id);
      });

      it('should resolve with deployment', function () {
        return promise.should.eventually.deep.equal({
          applicationId: hybridApplication.id,
          targetId:      hybridApplication.target.id,
          name:          hybridApplication.artifact.name,
          status:        hybridApplication.lastReportedStatus,
          desiredStatus: hybridApplication.desiredStatus
        });
      });
    });

    describe('when hybridGateway.getApplication rejects with a 404', function () {
      beforeEach(function () {
        hybridGateway.getApplication.rejects({ responseStatus: 404 });

        promise = hybridService.getApplication(context, environmentId, application.id);
      });

      it('should reject with NotFoundError', function () {
        return promise.should.have.been.rejectedWith(errors.NotFound);
      });
    });

    describe('when hybridGateway.getApplication rejects with something different than 404', function () {
      let error;

      beforeEach(function () {
        hybridGateway.getApplication.rejects(error = { someKey: 'someValue' });

        promise = hybridService.getApplication(context, environmentId, application.id);
      });

      it('should reject with error', function () {
        return promise.should.have.been.rejectedWith(error);
      });
    });

    describe('when application status is partially started', function () {
      [{
        description:          'and none of the artifacts failed to deploy',
        expectedStatus:       'PARTIALLY_STARTED',
        serverArtifacts: [{
          lastReportedStatus: 'STARTED'
        }, {
          lastReportedStatus: 'DEPLOYING'
        }, {
          lastReportedStatus: 'STARTED'
        }]
      }, {
        description:          'and at least one of the artifacts failed to deploy',
        expectedStatus:       'DEPLOYMENT_FAILED',
        serverArtifacts: [{
          lastReportedStatus: 'STARTED'
        }, {
          lastReportedStatus: 'DEPLOYING'
        }, {
          lastReportedStatus: 'DEPLOYMENT_FAILED'
        }, {
          lastReportedStatus: 'DEPLOYMENT_FAILED'
        }]
      }]
      .forEach(function (test) {
        describe(test.description, function () {
          let hybridApplication;

          beforeEach(function () {
            hybridApplication = {
              id:                 application.id,
              target:             {
                id: Date.now()
              },
              artifact:           {
                name: 'my-proxy.jar'
              },
              lastReportedStatus: 'PARTIALLY_STARTED',
              desiredStatus:      'STARTED',
              serverArtifacts:    test.serverArtifacts
            };

            hybridGateway.getApplication.returns(Promise.resolve(hybridApplication));

            return promise = hybridService.getApplication(context, environmentId, application.id);
          });

          it(`should report application status ${test.expectedStatus}`, function () {
            return promise.should.eventually.have.property('status', test.expectedStatus);
          });
        });
      });
    });
  });
}));
