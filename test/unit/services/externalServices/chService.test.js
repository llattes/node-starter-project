const _                = require('lodash');
const Promise          = require('bluebird');
const containerFactory = require('../../../support/testContainerFactory');

const container        = containerFactory.createContainer();

describe('chService', function () {
  container.resolve(function (
    apiPlatformGateway,
    config,
    chService,
    csService,
    customErrors,
    errors,
    superagent
  ) {
    describe('#getDomainAvailability', function () {
      let request;
      let endDefer;
      let promise;
      let context;

      const applicationName = 'some-random-application-name';

      beforeEach(function () {
        request = {};
        context = {
          user: {
            token: 'some-random-token'
          }
        };

        this.sinon.stub(superagent, 'get').returns(_.assign(request, {
          query: this.sinon.stub().returns(request),
          set:   this.sinon.stub().returns(request),
          end:   this.sinon.stub().returns((endDefer = Promise.defer()).promise)
        }));

        promise = chService.getDomainAvailability(context, applicationName);
      });

      it('should call superagent.get', function () {
        superagent.get.should.have.been.calledWith(`${config.cloudhub.baseUri}/api/applications/domains/${applicationName}`);
      });

      it('should not have environment header', function () {
        request.set.should.not.have.been.calledWith('X-ANYPNT-ENV-ID');
      });

      describe('when request resolves', function () {
        describe('with results', function () {
          // eslint-disable-next-line no-unused-vars
          let response;

          beforeEach(function () {
            endDefer.resolve(response = {
              ok:   true,
              body: {
                available: 'some-random-availability'
              }
            });
          });

          it('should resolve with whatever availability is in boolean value', function () {
            return promise.should.eventually.deep.equal({
              available: true
            });
          });
        });

        [
          [],
          null,
          'some-random-string',
          {}
        ].forEach(function (data) {
          describe(`with result equal to "${data}"`, function () {
            // eslint-disable-next-line no-unused-vars
            let response;

            beforeEach(function () {
              endDefer.resolve(response = {
                ok:   true,
                body: {
                  data
                }
              });
            });

            it('should resolve to booleanable value', function () {
              return promise.should.eventually.deep.equal({
                available: data ? !!data.available : false
              });
            });
          });
        });
      });
    });

    describe('#upsertApplication', function () {
      let applicationInfo;
      let chApplication;
      let client;
      let context;
      let getRequest;
      let postRequest;

      const options = {};

      beforeEach(function () {
        getRequest = {};
        postRequest = {};
        context = {
          user: {
            token: 'some-random-token'
          }
        };

        const versions = {
          ok:   true,
          body: {
            data: [{
              version: 'API-GATEWAY-1.0.0',
              state:   'ACTIVE'
            }, {
              version: 'API-GATEWAY-1.3.1',
              state:   'ACTIVE'
            }, {
              version: 'API-GATEWAY-2.0.0',
              state:   'ACTIVE'
            }, {
              version: 'API-GATEWAY-2.0.1',
              state:   'ACTIVE'
            }, {
              version: '3.8.0',
              state:   'ACTIVE'
            }, {
              version: '4.0.0',
              state:   'ACTIVE'
            }, {
              version:     '2.2.0-API-GATEWAY-SNAPSHOT',
              displayName: 'API-GATEWAY-2.2.0',
              state:       'ACTIVE'
            }, {
              version:     '2.2.0-API-GATEWAY',
              displayName: 'API-GATEWAY-2.2.0',
              state:       'ACTIVE'
            }]
          }
        };

        client = {
          /* jshint -W106 */
          client_id:     'some-random-client-id',
          client_secret: 'some-random-client-secret'
          /* jshint +W106 */
        };

        applicationInfo = {
          name:           'some-random-application-name',
          gatewayVersion: '4.0.0',
          environmentId:  'some-random-env-id'
        };

        chApplication = {
          domain:      applicationInfo.name,
          muleVersion: '4.0.0',
          properties:  {
            'anypoint.platform.analytics_base_uri': config.analytics.ingestUri,
            'anypoint.platform.client_id':          client.client_id,
            'anypoint.platform.client_secret':      client.client_secret,
            'anypoint.platform.base_uri':           config.platform.baseUri
          },
          workerType:  'Micro',
          workers:     1
        };

        // gets mule versions (/api/mule-versions)
        this.sinon.stub(superagent, 'get').returns(_.assign(getRequest, {
          set:   this.sinon.stub().returns(getRequest),
          end:   this.sinon.stub().returns(Promise.resolve(versions))
        }));

        // gets organization properties
        this.sinon.stub(csService, 'getOrganizationCredentials').returns(Promise.resolve(client));

        // posts to (/api/applications)
        this.sinon.stub(superagent, 'post').returns(_.assign(postRequest, {
          set:   this.sinon.stub().returns(postRequest),
          send:  this.sinon.stub().returns(postRequest),
          end:   this.sinon.stub().returns(Promise.resolve({ ok: true }))
        }));
      });

      describe('when mapping gateway version 4.0.0', function () {
        beforeEach(function () {
          return chService.upsertApplication(context, applicationInfo, options);
        });

        it('should create application in CH with the correct AMI version', function () {
          postRequest.send.should.have.been.calledWith(chApplication);
        });
      });

      describe('when application does not exist in CH', function () {
        beforeEach(function () {
          return chService.upsertApplication(context, applicationInfo, options);
        });

        it('should get all mule versions', function () {
          superagent.get.should.have.been.calledWith(`${config.cloudhub.baseUri}/api/mule-versions`);
        });

        it('should get organization\'s properties', function () {
          csService.getOrganizationCredentials.should.have.been.calledWith(context);
        });

        it('should create application in CH', function () {
          superagent.post.should.have.been.calledWith(`${config.cloudhub.baseUri}/api/applications`);
          postRequest.send.should.have.been.calledWith(chApplication);
        });

        it('should create property of analytics base uri', function () {
          chApplication.properties['anypoint.platform.analytics_base_uri'].should.be.equal(config.analytics.ingestUri);
        });

        it('should create property client id', function () {
          chApplication.properties['anypoint.platform.client_id'].should.be.equal(client.client_id);
        });

        it('should create property client secret', function () {
          chApplication.properties['anypoint.platform.client_secret'].should.be.equal(client.client_secret);
        });

        it('should create property of platform base uri', function () {
          chApplication.properties['anypoint.platform.base_uri'].should.be.equal(config.platform.baseUri);
        });
      });

      describe('when application exists in CH', function () {
        beforeEach(function () {
          const errorResponse = {
            ok:     false,
            status: 409,
            text:   'some-text',
            req:    {
              path:   '/some/path',
              method: 'some-method'
            },
            body:   {
              message: 'test was wrong!'
            }
          };

          // posts to (/api/applications)
          superagent.post.returns(_.assign(postRequest, {
            set:   this.sinon.stub().returns(postRequest),
            send:  this.sinon.stub().returns(postRequest),
            end:   this.sinon.stub().returns(Promise.resolve(errorResponse))
          }));
        });

        describe('and over-write was not specified', function () {
          it('should reject promise', function () {
            // eslint-disable-next-line max-len
            return chService.upsertApplication(context, {}, {}).should.be.rejectedWith(customErrors.CloudHubError, /There was an error while talking to CloudHub/);
          });
        });

        describe('and over-write option is used', function () {
          let updateRequest;
          let promise;

          beforeEach(function () {
            updateRequest = {};
            context = {
              user: {
                token: 'some-random-token'
              }
            };

            applicationInfo = {
              name:           'some-random-application-name',
              gatewayVersion: '4.0.0',
              environmentId:  'some-random-env-id'
            };
          });

          describe('when there is no error on updateApplication PUT', function () {
            beforeEach(function () {
              // updates /api/application/some-random-application-name
              this.sinon.stub(superagent, 'put').returns(_.assign(updateRequest, {
                set:   this.sinon.stub().returns(updateRequest),
                send:  this.sinon.stub().returns(updateRequest),
                end:   this.sinon.stub().returns(Promise.resolve(
                  {
                    ok:   true,
                    body: {
                      fullDomain:        'fullDomain',
                      id:                Date.now(),
                      name:              applicationInfo.name,
                      status:            'START',
                      gatewayVersion:    applicationInfo.gatewayVersion,
                      supportedVersions: []
                    }
                  }
                ))
              }));

              promise = chService.upsertApplication(context, applicationInfo, { ignoreDuplicatedError: true });
              return promise;
            });

            it('should update the application', function () {
              const update = {
                muleVersion: chApplication.muleVersion,
                properties:  chApplication.properties
              };

              superagent.put.should.have.been.calledWith(`${config.cloudhub.baseUri}/api/applications/${applicationInfo.name}`);
              updateRequest.send.should.have.been.calledWith(update);
            });
          });

          describe('when there is a 403 error on updateApplication PUT', function () {
            let environments;
            let delRequest;

            beforeEach(function () {
              // updates /api/application/some-random-application-name
              this.sinon.stub(superagent, 'put').returns(_.assign(updateRequest, {
                set:   this.sinon.stub().returns(updateRequest),
                send:  this.sinon.stub().returns(updateRequest),
                end:   this.sinon.stub().returns(Promise.resolve(
                  {
                    ok:     false,
                    status: 403,
                    text:   'some-text',
                    req:    {
                      path:   '/some/path',
                      method: 'some-method'
                    },
                    body:   {
                      message: 'test was wrong!'
                    }
                  }
                ))
              }));

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

              this.sinon.stub(apiPlatformGateway, 'getAllEnvironments').resolves(environments);

              delRequest = {};

              this.sinon.stub(superagent, 'del').returns(_.assign(delRequest, {
                set: this.sinon.stub().returns(delRequest),
                end: this.sinon.stub().returns(Promise.reject(new errors.Unauthorized()))
              }));

              promise = chService.upsertApplication(context, applicationInfo, { ignoreDuplicatedError: true }).catch(_.noop);
              return promise;
            });

            it('should attempt to delete application from all environments', function () {
              const update = {
                muleVersion: chApplication.muleVersion,
                properties:  chApplication.properties
              };

              superagent.put.should.have.been.calledWith(`${config.cloudhub.baseUri}/api/applications/${applicationInfo.name}`);
              updateRequest.send.should.have.been.calledWith(update);
              // eslint-disable-next-line no-unused-expressions
              superagent.del.should.have.been.calledTwice;
            });
          });
        });
      });
    });

    describe('#deployApplication', function () {
      let uploadFileRequest;
      let statusRequest;
      let promise;
      let context;
      let applicationInfo;
      let stream;

      describe('when status responds OK', function () {
        beforeEach(function () {
          uploadFileRequest = {};
          statusRequest = {};
          context = {
            user: {
              token: 'some-random-token'
            }
          };

          applicationInfo = {
            name:           'some-random-application-name',
            gatewayVersion: '4.0.0',
            environmentId:  'some-random-env-id'
          };

          stream = 'a-stream-goes-here';

          this.sinon.stub(superagent, 'post').onCall(0).returns(_.assign(uploadFileRequest, {
            set:    this.sinon.stub().returns(uploadFileRequest),
            attach: this.sinon.stub().returns(uploadFileRequest),
            send:   this.sinon.stub().returns(uploadFileRequest),
            end:    this.sinon.stub().returns(Promise.resolve({ ok: true }))
          }));

          superagent.post.onCall(1).returns(_.assign(statusRequest, {
            set:   this.sinon.stub().returns(statusRequest),
            send:  this.sinon.stub().returns(statusRequest),
            end:   this.sinon.stub().returns(Promise.resolve({ ok: true }))
          }));

          promise = chService.deployApplication(context, applicationInfo, stream);

          return promise;
        });

        it('should upload file', function () {
          superagent.post.should.have.been.calledWith(`${config.cloudhub.baseUri}/api/v2/applications/${applicationInfo.name}/files`);
          uploadFileRequest.attach.should.have.been.calledWith('file', stream, `${applicationInfo.name}-api-gateway.jar`);
        });

        it('should set the status', function () {
          // eslint-disable-next-line no-unused-expressions
          superagent.post.calledTwice.should.be.ok;
          superagent.post.args[1].should.deep.equal([`${config.cloudhub.baseUri}/api/applications/${applicationInfo.name}/status`]);
          statusRequest.send.should.have.been.calledWith({ status: 'START' });
        });
      });

      describe('when status responds 304', function () {
        beforeEach(function () {
          uploadFileRequest = {};
          statusRequest = {};
          context = {
            user: {
              token: 'some-random-token'
            }
          };

          applicationInfo = {
            name:           'some-random-application-name',
            gatewayVersion: '4.0.0',
            environmentId:  'some-random-env-id'
          };

          stream = 'a-stream-goes-here';

          this.sinon.stub(superagent, 'post').onCall(0).returns(_.assign(uploadFileRequest, {
            set:    this.sinon.stub().returns(uploadFileRequest),
            attach: this.sinon.stub().returns(uploadFileRequest),
            send:   this.sinon.stub().returns(uploadFileRequest),
            end:    this.sinon.stub().returns(Promise.resolve({ ok: true }))
          }));

          superagent.post.onCall(1).returns(_.assign(statusRequest, {
            set:   this.sinon.stub().returns(statusRequest),
            send:  this.sinon.stub().returns(statusRequest),
            end:   this.sinon.stub().returns(Promise.resolve({
              ok:     false,
              status: 304,
              text:   'some-text',
              req:    {
                path:   '/some/path',
                method: 'some-method'
              }
            }))
          }));

          promise = chService.deployApplication(context, applicationInfo, stream);
          return promise;
        });

        it('should not fail', function () {
          // eslint-disable-next-line no-unused-expressions
          promise.should.be.fulfilled;
        });
      });
    });

    describe('#getApplication', function () {
      let getApplicationRequest;
      let context;
      let promise;
      let applicationName;

      beforeEach(function () {
        applicationName = 'non-existing-app';
        getApplicationRequest = {};
        context = {
          user: {
            token: 'some-random-token'
          }
        };

        this.sinon.stub(superagent, 'get').onCall(0).returns(_.assign(getApplicationRequest, {
          set:    this.sinon.stub().returns(getApplicationRequest),
          attach: this.sinon.stub().returns(getApplicationRequest),
          send:   this.sinon.stub().returns(getApplicationRequest),
          end:    this.sinon.stub().returns(Promise.resolve({ ok: true }))
        }));
      });

      describe('when ch appliction is not found', function () {
        beforeEach(function () {
          getApplicationRequest.end.returns(Promise.resolve({
            ok:     false,
            status: 404,
            text:   'app-not-found',
            req:    {
              path:   '/some/path',
              method: 'GET'
            }
          }));

          promise = chService.getApplication(context, applicationName);
        });

        it('should report a NotFoundError', function () {
          return promise.should.have.been.rejectedWith(errors.NotFound, /CloudHub Application/);
        });
      });

      describe('when CH error is other than not found', function () {
        beforeEach(function () {
          getApplicationRequest.end.returns(Promise.resolve({
            ok:     false,
            status: 400,
            text:   'Bad Request',
            req:    {
              path:   '/some/path',
              method: 'GET'
            }
          }));

          promise = chService.getApplication(context, applicationName);
        });

        it('should report a CloudHubError', function () {
          return promise.should.have.been.rejectedWith(customErrors.CloudHubError, /error while talking to CloudHub/);
        });
      });
    });
  });
});
