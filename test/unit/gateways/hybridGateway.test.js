const container = require('../../support/testContainerFactory').createContainer();
const _         = require('lodash');

// ---

describe('hybridGateway', container.describe(function () {
  let callWrapper;
  let callWrapperBuilder;
  let config;
  let context;
  let environmentId;
  let hybridGateway;
  let promise;
  let request;
  let superagent;

  beforeEach(function () {
    callWrapperBuilder = this.container.get('callWrapperBuilder');
    config             = this.container.get('config');
    hybridGateway      = this.container.get('hybridGateway');
    superagent         = this.container.get('superagent');

    callWrapper        = {
      wrap: this.sinon.stub()
    };

    context            = {
      user:         { token: `${Date.now() + 1}` },
      organization: { id:    `${Date.now() + 2}` }
    };

    environmentId      = `${Date.now() + 3}`;

    this.sinon.stub(callWrapperBuilder, 'build').returns(callWrapper);
  });

  describe('#getApplication', function () {
    let application;
    let applicationId;

    beforeEach(function () {
      applicationId = Date.now();
      application   = { id: applicationId };
      request       = {};

      this.sinon.stub(superagent, 'get').returns(_.assign(request, {
        set: this.sinon.stub().returns(request)
      }));

      callWrapper.wrap.resolves({ data: application });

      return promise = hybridGateway.getApplication(context, environmentId, applicationId);
    });

    it('should have called hybrid once', function () {
      // eslint-disable-next-line no-unused-expressions
      callWrapper.wrap.should.have.been.calledOnce;
    });

    it('should make a get to retrieve the application from its id', function () {
      superagent.get.should.have.been.calledWith(`${config.hybrid.baseUri}/api/v1/applications/${applicationId}`);
    });

    it('should return the application', function () {
      promise.should.eventually.be.deep.equal(application);
    });
  });

  describe('#getApplicationsByQuery', function () {
    let applicationId;
    let applications;
    let query;

    beforeEach(function () {
      applicationId = Date.now();
      applications  = [{ id: applicationId }];
      query         = { name: 'someApplicationName' };

      callWrapper.wrap.resolves({ data: applications });

      request = {};
      this.sinon.stub(superagent, 'get').returns(_.assign(request, {
        query: this.sinon.stub().returns(request),
        set:   this.sinon.stub().returns(request)
      }));

      return promise = hybridGateway.getApplicationsByQuery(context, environmentId, query);
    });

    it('should have called hybrid once', function () {
      // eslint-disable-next-line no-unused-expressions
      callWrapper.wrap.should.have.been.calledOnce;
    });

    it('should make a get to query applications', function () {
      superagent.get.should.have.been.calledWith(`${config.hybrid.baseUri}/api/v1/applications`);
    });

    it('should return the application', function () {
      promise.should.eventually.be.deep.equal(applications);
    });
  });

  describe('#createApplication', function () {
    let application;
    let createdApplication;

    beforeEach(function () {
      application        = {
        artifactName: 'my-proxy',
        targetId:      Date.now(),
        file:          {
          name:   'my-proxy.zip',
          stream: { value: 'IOU a ProxyStream' }
        }
      };

      createdApplication = { id: Date.now() };

      callWrapper.wrap.resolves({ data: createdApplication });

      request = {};
      this.sinon.stub(superagent, 'post').returns(_.assign(request, {
        field:  this.sinon.stub().returns(request),
        attach: this.sinon.stub().returns(request),
        set:    this.sinon.stub().returns(request)
      }));

      return promise = hybridGateway.createApplication(context, environmentId, application);
    });

    it('should have called hybrid once', function () {
      // eslint-disable-next-line no-unused-expressions
      callWrapper.wrap.should.have.been.calledOnce;
    });

    it('should make a post to create the application', function () {
      superagent.post.should.have.been.calledWith(`${config.hybrid.baseUri}/api/v1/applications`);
    });

    it('should return the created application', function () {
      promise.should.eventually.be.deep.equal(createdApplication);
    });
  });

  describe('#updateApplication', function () {
    let application;
    let applicationId;
    let updatedApplication;

    [
      {
        file: {
          name:   'my-proxy.zip',
          stream: { value: 'IOU a ProxyStream' }
        },
        description: 'updating the file'
      },
      {
        file:        null,
        description: 'not updating the file'
      }
    ].forEach(function (test) {
      describe(`when ${test.description}`, function () {
        beforeEach(function () {
          applicationId = Date.now();

          application   = {
            id:   applicationId,
            file: test.file
          };

          updatedApplication = { id: applicationId };

          callWrapper.wrap.resolves({ data: updatedApplication });

          request = {};
          this.sinon.stub(superagent, 'patch').returns(_.assign(request, {
            attach: this.sinon.stub().returns(request),
            send:   this.sinon.stub().returns(request),
            set:    this.sinon.stub().returns(request)
          }));

          return promise = hybridGateway.updateApplication(context, environmentId, applicationId, application);
        });

        it('should have called hybrid once', function () {
          // eslint-disable-next-line no-unused-expressions
          callWrapper.wrap.should.have.been.calledOnce;
        });

        it('should make a post to create the application', function () {
          superagent.patch.should.have.been.calledWith(`${config.hybrid.baseUri}/api/v1/applications/${applicationId}`);
        });

        it('should return the updated application', function () {
          promise.should.eventually.be.deep.equal(updatedApplication);
        });
      });
    });
  });
}));
