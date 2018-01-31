const container  = require('../../../support/testContainerFactory').createContainer();

// ---

describe('csService', container.describe(function () {
  let callWrapper;
  let callWrapperBuilder;
  let config;
  let context;
  let csService;

  let promise;

  beforeEach(function () {
    callWrapper              = {
      wrap: this.sinon.stub()
    };

    callWrapperBuilder       = this.container.get('callWrapperBuilder');
    config                   = this.container.get('config');
    csService                = this.container.get('csService');

    config.csSiteApi.baseUri = 'https://cs.base.uri:3004';

    this.sinon.stub(callWrapperBuilder, 'build').returns(callWrapper);
  });

  describe('#getEnvironmentCredentials', function () {
    let client;
    let clientId;
    let environment;
    let environmentId;

    beforeEach(function () {
      clientId      = 'ca003411bb0348e0a5b8';
      client        = {
        client_id:     clientId,
        client_secret: '4ac9b5ca0c39d4d47702'
      };

      environmentId = '93501795-aec3-4473-914f-7cb11bbb184b';
      environment   = {
        id:      environmentId,
        clientId
      };

      context       = { environmentId };

      callWrapper.wrap
        .onFirstCall()
        .resolves(environment);

      callWrapper.wrap
        .onSecondCall()
        .resolves(client);

      return promise = csService.getEnvironmentCredentials(context);
    });

    it('should have called CS twice (to retrieve the environment and then the client)', function () {
      callWrapper.wrap.should.have.been.called.callCount(2);
    });

    it('should return the client credentials of the environment', function () {
      promise.should.eventually.be.deep.equal(client);
    });
  });

  describe('#getOrganizationCredentials', function () {
    let client;
    let clientId;
    let organization;
    let organizationId;

    beforeEach(function () {
      clientId      = 'ca003411bb0348e0a5b8';
      client        = {
        client_id:     clientId,
        client_secret: '4ac9b5ca0c39d4d47702'
      };

      organizationId = '93501795-aec3-4473-914f-7cb11bbb184b';
      organization   = {
        id:      organizationId,
        clientId
      };

      context       = { organization: { id: organizationId } };

      callWrapper.wrap
        .onFirstCall()
        .resolves(organization);

      callWrapper.wrap
        .onSecondCall()
        .resolves(client);

      return promise = csService.getOrganizationCredentials(context);
    });

    it('should have called CS twice (to retrieve the organization and then the client)', function () {
      callWrapper.wrap.should.have.been.called.callCount(2);
    });

    it('should return the client credentials of the organization', function () {
      promise.should.eventually.be.deep.equal(client);
    });
  });
}));
