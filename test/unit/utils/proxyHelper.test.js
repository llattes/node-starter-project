const containerFactory = require('../../support/testContainerFactory');

const container        = containerFactory.createContainer();

describe('proxyHelper', function () {
  container.resolve(function (
    config,
    proxyHelper
  ) {
    let environmentApi;

    beforeEach(function () {
      environmentApi = {
        organizationId:            'f0c9b011-980e-4928-9430-e60e3a97c043',
        id:                        76,
        environmentId:             'ee3596c3-416b-4a06-bd03-98044900f71e',
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

      // eslint-disable-next-line no-param-reassign
      config.proxyBuilder.templateVersions.RAML = '1.0.0';
    });

    describe('#resolveConfigProperties', function () {
      let expectedResponse;

      describe('when endpoint type is RAML', function () {
        describe('in the most basic scenario', function () {
          beforeEach(function () {
            expectedResponse                          = {};
            expectedResponse['api.id']                = environmentApi.id;
            expectedResponse['proxy.path']            = '/*';
            expectedResponse['proxy.port']            = '8081';
            expectedResponse['proxy.responseTimeout'] = 15000;
            expectedResponse['implementation.host']   = 'www.google.com.ar';
            expectedResponse['implementation.port']   = '80';
            expectedResponse['implementation.path']   = '/';
          });

          it('should return an object matching the expectedResponse', function () {
            proxyHelper.resolveConfigProperties(environmentApi).should.deep.equal(expectedResponse);
          });
        });

        describe('when the proxyUri does not end with a slash', function () {
          beforeEach(function () {
            environmentApi.endpoint.proxyUri          = 'http://0.0.0.0:8081/non-slash';

            expectedResponse                          = {};
            expectedResponse['api.id']                = environmentApi.id;
            expectedResponse['proxy.path']            = '/non-slash/*';
            expectedResponse['proxy.port']            = '8081';
            expectedResponse['proxy.responseTimeout'] = 15000;
            expectedResponse['implementation.host']   = 'www.google.com.ar';
            expectedResponse['implementation.port']   = '80';
            expectedResponse['implementation.path']   = '/';
          });

          it('should return an object matching the expectedResponse', function () {
            proxyHelper.resolveConfigProperties(environmentApi).should.deep.equal(expectedResponse);
          });
        });

        describe('when response timeout is not set', function () {
          beforeEach(function () {
            environmentApi.endpoint.responseTimeout = null;

            expectedResponse                          = {};
            expectedResponse['api.id']                = environmentApi.id;
            expectedResponse['proxy.path']            = '/*';
            expectedResponse['proxy.port']            = '8081';
            expectedResponse['proxy.responseTimeout'] = config.defaultResponseTimeout;
            expectedResponse['implementation.host']   = 'www.google.com.ar';
            expectedResponse['implementation.port']   = '80';
            expectedResponse['implementation.path']   = '/';
          });

          it('should return an object matching the expectedResponse', function () {
            proxyHelper.resolveConfigProperties(environmentApi).should.deep.equal(expectedResponse);
          });
        });
      });

      describe('when endpoint type is HTTP', function () {
        describe('with http URL protocol', function () {
          beforeEach(function () {
            environmentApi.endpoint.type              = 'http';

            expectedResponse                          = {};
            expectedResponse['api.id']                = environmentApi.id;
            expectedResponse['proxy.path']            = '/*';
            expectedResponse['proxy.port']            = '8081';
            expectedResponse['proxy.responseTimeout'] = 15000;
            expectedResponse['implementation.host']   = 'www.google.com.ar';
            expectedResponse['implementation.port']   = '80';
            expectedResponse['implementation.path']   = '/';
          });

          it('should return an object matching the expectedResponse', function () {
            proxyHelper.resolveConfigProperties(environmentApi).should.deep.equal(expectedResponse);
          });
        });

        describe('with https URL protocol', function () {
          beforeEach(function () {
            environmentApi.endpoint.type              = 'http';
            environmentApi.endpoint.uri               = 'https://www.google.com.ar';

            expectedResponse                          = {};
            expectedResponse['api.id']                = environmentApi.id;
            expectedResponse['proxy.path']            = '/*';
            expectedResponse['proxy.port']            = '8081';
            expectedResponse['proxy.responseTimeout'] = 15000;
            expectedResponse['implementation.host']   = 'www.google.com.ar';
            expectedResponse['implementation.port']   = '443';
            expectedResponse['implementation.path']   = '/';
          });

          it('should return an object matching the expectedResponse', function () {
            proxyHelper.resolveConfigProperties(environmentApi).should.deep.equal(expectedResponse);
          });
        });
      });

      describe('when endpoint type is WSDL', function () {
        describe('and for whatever reason endpoint.wsdlConfig is not provided', function () {
          beforeEach(function () {
            environmentApi.endpoint.type              = 'wsdl';

            expectedResponse                          = {};
            expectedResponse['api.id']                = environmentApi.id;
            expectedResponse['proxy.path']            = '/*';
            expectedResponse['proxy.port']            = '8081';
            expectedResponse['proxy.responseTimeout'] = 15000;
            expectedResponse.wsdl                     = 'http://www.google.com.ar/?wsdl';
            expectedResponse['service.name']          = '';
            expectedResponse['service.namespace']     = '';
            expectedResponse['service.port']          = '';
          });

          it('should return an object matching the expectedResponse', function () {
            proxyHelper.resolveConfigProperties(environmentApi).should.deep.equal(expectedResponse);
          });
        });

        describe('and endpoint.wsdlConfig is provided as expected', function () {
          beforeEach(function () {
            environmentApi.endpoint.type              = 'wsdl';
            environmentApi.endpoint.wsdlConfig        = {
              name:      'theName',
              namespace: 'theNamespace',
              port:      'thePort'
            };

            expectedResponse                          = {};
            expectedResponse['api.id']                = environmentApi.id;
            expectedResponse['proxy.path']            = '/*';
            expectedResponse['proxy.port']            = '8081';
            expectedResponse['proxy.responseTimeout'] = 15000;
            expectedResponse.wsdl                     = 'http://www.google.com.ar/?wsdl';
            expectedResponse['service.name']          = 'theName';
            expectedResponse['service.namespace']     = 'theNamespace';
            expectedResponse['service.port']          = 'thePort';
          });

          it('should return an object matching the expectedResponse', function () {
            proxyHelper.resolveConfigProperties(environmentApi).should.deep.equal(expectedResponse);
          });
        });
      });
    });

    describe('#generateProxyName', function () {
      describe('when environmentApi has instanceLabel', function () {
        it('should return an API name including the instanceLabel', function () {
          proxyHelper.generateProxyName(environmentApi).should.equal('http_for_proxies_testing-v1-some_label');
        });
      });

      describe('when environmentApi does NOT have instanceLabel', function () {
        beforeEach(function () {
          delete environmentApi.instanceLabel;
        });

        it('should return an API name including the autodiscoveryInstanceName', function () {
          proxyHelper.generateProxyName(environmentApi).should.equal('http_for_proxies_testing-v1-v1_76');
        });
      });
    });

    describe('#createProxyRequest', function () {
      describe('when environmentApi has RAML type endpoint', function () {
        it('should return a proxyRequest object with apiDefinition, configurationProperties and template', function () {
          const proxyRequest = {
            apiDefinition: {
              assetId:      'http-for-proxies-testing',
              assetVersion: undefined,
              groupId:      undefined
            },
            configurationProperties: {
              'api.id':                76,
              'implementation.host':   'www.google.com.ar',
              'implementation.path':   '/',
              'implementation.port':   '80',
              'proxy.path':            '/*',
              'proxy.port':            '8081',
              'proxy.responseTimeout': 15000
            },
            template: {
              assetId:      'RAML',
              assetVersion: '1.0.0',
              groupId:      undefined
            }
          };

          // config.proxyBuilder.templateVersions.RAML is overriden in the first beforeEach!
          proxyHelper.createProxyRequest(environmentApi).should.deep.equal(proxyRequest);
        });
      });
    });
  });
});
