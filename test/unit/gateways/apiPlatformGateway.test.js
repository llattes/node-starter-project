const _          = require('lodash');
const container  = require('../../support/testContainerFactory').createContainer();

describe('apiPlatformGateway', container.describe(function () {
  let apiPlatformGateway;
  let callWrapper;
  let callWrapperBuilder;
  let config;
  let promise;
  let superagent;

  beforeEach(function () {
    callWrapper        = {
      wrap: this.sinon.stub()
    };

    callWrapperBuilder = this.container.get('callWrapperBuilder');
    apiPlatformGateway = this.container.get('apiPlatformGateway');
    superagent         = this.container.get('superagent');
    config             = this.container.get('config');

    this.sinon.stub(callWrapperBuilder, 'build').returns(callWrapper);
  });

  describe('#getAllEnvironments', function () {
    let context;
    let environments;

    beforeEach(function () {
      context      = {
        user: {
          token: 'e35aea33-d52b-433e-97dd-4ad5d059e04d'
        },
        organization: {
          id: '8494bd34-bbfd-4342-be57-4137eb0233ad'
        }
      };

      environments = {
        environments: [
          {
            id:             '4fdd8ecb-a027-42fe-a1c4-ecebe3297319',
            name:           'Sandbox',
            organizationId: '8494bd34-bbfd-4342-be57-4137eb0233ad',
            isProduction:   false,
            type:           'sandbox',
            clientId:       'd00a8252a59f46d7be2ed13c6acd133a'
          }, {
            id:             'ee3596c3-416b-4a06-bd03-98044900f71e',
            name:           'Production',
            organizationId: '8494bd34-bbfd-4342-be57-4137eb0233ad',
            isProduction:   true,
            type:           'production',
            clientId:       'ed01c0fab2d74c2f9891cc0338f1eb7a'
          }
        ],
        unclassified: false
      };


      this.sinon.stub(superagent, 'get').callsFake((path) => path);

      callWrapper.wrap.onFirstCall().resolves(environments);

      return promise = apiPlatformGateway.getAllEnvironments(context);
    });

    it('should have called APG once', function () {
      // eslint-disable-next-line no-unused-expressions
      callWrapper.wrap.should.have.been.calledOnce;
    });

    it('should return the environments', function () {
      promise.should.eventually.be.deep.equal(environments);
    });
  });

  describe('#getEnvironmentApi', function () {
    let context;
    let environmentApiId;
    let request;

    beforeEach(function () {
      context          = {
        user: {
          token: 'e35aea33-d52b-433e-97dd-4ad5d059e04d'
        },
        organization: {
          id: '8494bd34-bbfd-4342-be57-4137eb0233ad'
        },
        environmentId: 'ee3596c3-416b-4a06-bd03-98044900f71e'
      };

      environmentApiId = 76;

      request          = {};

      _.assign(request, {
        end:  this.sinon.stub().returns(request),
        then: this.sinon.stub().returns(request),
        set:  this.sinon.stub().returns(request)
      });

      this.sinon.stub(superagent, 'get').returns(request);

      // eslint-disable-next-line max-len
      callWrapper.wrap.onFirstCall().resolves({ apiId: environmentApiId, organizationId: context.organization.id, environmentId: context.environmentId });

      apiPlatformGateway.getEnvironmentApi(context, environmentApiId);
    });

    it('should make a get to an api endpoint in api-platform', function () {
      // eslint-disable-next-line max-len
      superagent.get.should.have.been.calledWith(`${config.apiManager.baseUri}${config.apiManager.apiV1Path}/organizations/${context.organization.id}/environments/${context.environmentId}/apis/${environmentApiId}`);
    });
  });

  describe('#createProxyDeploymentEntity', function () {
    let context;
    let environmentApiId;
    let deployment;
    let postRequest;

    beforeEach(function () {
      context          = {
        user: {
          token: 'e35aea33-d52b-433e-97dd-4ad5d059e04d'
        },
        organization: {
          id: '8494bd34-bbfd-4342-be57-4137eb0233ad'
        },
        environmentId: 'ee3596c3-416b-4a06-bd03-98044900f71e'
      };

      environmentApiId = 76;

      deployment       = {
        applicationName: 'TheApplication',
        gatewayVersion:  '4.0.0',
        overwrite:       false,
        type:            'CH',
        environmentId:   'ee3596c3-416b-4a06-bd03-98044900f71e',
        environmentName: 'Production'
      };

      postRequest      = {};

      this.sinon.stub(superagent, 'post').returns(_.assign(postRequest, {
        set:   this.sinon.stub().returns(postRequest),
        send:  this.sinon.stub().returns(postRequest),
        end:   this.sinon.stub().returns(Promise.resolve({ ok: true }))
      }));

      callWrapper.wrap.onFirstCall().resolves(_.assign({ id: 1, apiId: environmentApiId }, deployment));

      return promise = apiPlatformGateway.createProxyDeploymentEntity(context, environmentApiId, deployment);
    });

    it('should have called APG once', function () {
      // eslint-disable-next-line no-unused-expressions
      callWrapper.wrap.should.have.been.calledOnce;
    });

    it('should make a get to an api endpoint in api-platform', function () {
      // eslint-disable-next-line max-len
      superagent.post.should.have.been.calledWith(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}/organizations/${context.organization.id}/environments/${context.environmentId}/apis/${environmentApiId}/deployments/external`);
    });

    it('should return the recently created deployment', function () {
      promise.should.eventually.be.deep.equal(_.assign({ id: 1, apiId: environmentApiId }, deployment));
    });
  });

  describe('#updateProxyDeploymentEntity', function () {
    let context;
    let environmentApiId;
    let deployment;
    let patchRequest;

    beforeEach(function () {
      context          = {
        user: {
          token: 'e35aea33-d52b-433e-97dd-4ad5d059e04d'
        },
        organization: {
          id: '8494bd34-bbfd-4342-be57-4137eb0233ad'
        },
        environmentId: 'ee3596c3-416b-4a06-bd03-98044900f71e'
      };

      environmentApiId = 76;

      deployment       = {
        applicationName: 'TheApplication',
        gatewayVersion:  '4.0.0',
        overwrite:       false,
        type:            'CH',
        environmentId:   'ee3596c3-416b-4a06-bd03-98044900f71e',
        environmentName: 'Production',
        id:              Date.now()
      };

      this.sinon.stub(superagent, 'patch').returns(_.assign(patchRequest, {
        set:   this.sinon.stub().returns(patchRequest),
        send:  this.sinon.stub().returns(patchRequest),
        end:   this.sinon.stub().returns(Promise.resolve({ ok: true }))
      }));

      callWrapper.wrap.onFirstCall().resolves(_.assign({ id: 1, apiId: environmentApiId }, deployment));

      return promise = apiPlatformGateway.updateProxyDeploymentEntity(context, environmentApiId, deployment);
    });

    it('should have called APG once', function () {
      // eslint-disable-next-line no-unused-expressions
      callWrapper.wrap.should.have.been.calledOnce;
    });

    it('should make a get to an api endpoint in api-platform', function () {
      // eslint-disable-next-line max-len
      superagent.patch.should.have.been.calledWith(`${config.apiManager.baseUri}${config.apiManager.proxiesXapiPath}/organizations/${context.organization.id}/environments/${context.environmentId}/apis/${environmentApiId}/deployments/external/${deployment.id}`);
    });

    it('should return the recently created deployment', function () {
      promise.should.eventually.be.deep.equal(_.assign({ id: 1, apiId: environmentApiId }, deployment));
    });
  });
}));
