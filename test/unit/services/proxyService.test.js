const testContainerFactory = require('../../support/testContainerFactory');

const container = testContainerFactory.createContainer();

describe('proxyService', container.describe(() => {
  let buffer;
  let proxyService;

  beforeEach(function () {
    proxyService        = this.container.get('proxyService');
  });

  describe('get', () => {
    let context;
    let environmentApi;
    let promise;

    beforeEach(() => {
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
          type:                 'raml',
          uri:                  'http://www.google.com.ar',
          proxyUri:             'http://0.0.0.0:8081/',
          isCloudHub:           true,
          referencesUserDomain: false,
          muleVersion4OrAbove:  true,
          responseTimeout:      15000
        }
      };

      return promise = proxyService.get(context, environmentApi);
    });

    it('should return the environments', () =>
      promise.should.eventually.be.deep.equal({ name: 'http_for_proxies_testing-v1-some_label', buffer })
    );
  });
}));
