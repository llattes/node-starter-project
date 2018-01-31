const bluebird  = require('bluebird');
const supertest = require('supertest');
const containerFactory = require('../support/testContainerFactory');

// ---

const container = containerFactory.createContainer();

// ---

describe('statusController', container.describe(() => {
  let request;

  beforeEach(function beforeEach() {
    this.container.resolve(function (app) {
      request = supertest(app);
    });
  });

  describe('GET /v1/status/echo', () => {
    it('should respond with correct status and body', () => (
      bluebird.fromNode((callback) => {
        request.get('/v1/status/echo')
          .send()
          .expect(200, { status: 'ok' })
          .end(callback)
        ;
      })
    ));
  });

  describe('GET /v1/status/version', () => {
    it('should respond with correct status and body', () => (
      bluebird.fromNode((callback) => {
        request.get('/v1/status/version')
          .send()
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return callback(err);
            }

            res.body.should.contain.keys(['commit', 'date', 'branch', 'tag']);

            return callback();
          })
        ;
      })
    ));
  });
}));
