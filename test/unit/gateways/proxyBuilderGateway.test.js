const _          = require('lodash');
const container  = require('../../support/testContainerFactory').createContainer();

describe('proxyBuilderGateway', container.describe(function () {
  let callWrapper;
  let callWrapperBuilder;
  let config;
  let promise;
  let proxyBuilderGateway;
  let proxyHelper;
  let superagent;

  beforeEach(function () {
    callWrapper         = {
      wrap: this.sinon.stub()
    };

    callWrapperBuilder  = this.container.get('callWrapperBuilder');
    proxyBuilderGateway = this.container.get('proxyBuilderGateway');
    proxyHelper         = this.container.get('proxyHelper');
    superagent          = this.container.get('superagent');
    config              = this.container.get('config');

    this.sinon.stub(callWrapperBuilder, 'build').returns(callWrapper);
  });

  describe('#createProxy', function () {
    let context;
    let environmentApi;
    let postRequest;
    let proxyRequest;

    beforeEach(function () {
      context        = {
        user: {
          token: 'e35aea33-d52b-433e-97dd-4ad5d059e04d'
        },
        organization: {
          id: '8494bd34-bbfd-4342-be57-4137eb0233ad'
        },
        environmentId: 'ee3596c3-416b-4a06-bd03-98044900f71e'
      };

      environmentApi = {
        organizationId:            '8494bd34-bbfd-4342-be57-4137eb0233ad',
        id:                        76,
        environmentId:             'ee3596c3-416b-4a06-bd03-98044900f71e',
        groupId:                   '8494bd34-bbfd-4342-be57-4137eb0233ad',
        assetId:                   'http-for-proxies-testing',
        productVersion:            'v1',
        instanceLabel:             'some#label',
        autodiscoveryInstanceName: 'v1:76',
        endpoint:                  {
          id:                   76,
          type:                 'http',
          uri:                  'http://www.google.com.ar',
          proxyUri:             'http://0.0.0.0:8081/',
          isCloudHub:           true,
          referencesUserDomain: false,
          muleVersion4OrAbove:  true,
          responseTimeout:      15000
        }
      };

      proxyRequest   = proxyHelper.createProxyRequest(environmentApi);

      postRequest    = {};

      this.sinon.stub(superagent, 'post').returns(_.assign(postRequest, {
        set:    this.sinon.stub().returns(postRequest),
        send:   this.sinon.stub().returns(postRequest),
        end:    this.sinon.stub().resolves({ ok: true }), // eslint-disable-next-line object-shorthand
        buffer: this.sinon.stub().returns({ parse: function () { } }),
        parse:  this.sinon.stub()
      }));

      // Using instanceLabel just because, could have been used a custom string
      callWrapper.wrap.onFirstCall().resolves(environmentApi.instanceLabel);

      return promise = proxyBuilderGateway.createProxy(context, proxyRequest);
    });

    it('should have called APG once', function () {
      // eslint-disable-next-line no-unused-expressions
      callWrapper.wrap.should.have.been.calledOnce;
    });

    it('should make a post to an api endpoint in api-proxy-builder-service', function () {
      superagent.post.should.have.been.calledWith(`${config.proxyBuilder.baseUri}/proxies`);
    });

    it('should return the recently created deployment', function () {
      promise.should.eventually.be.equal(environmentApi.instanceLabel);
    });
  });
}));
