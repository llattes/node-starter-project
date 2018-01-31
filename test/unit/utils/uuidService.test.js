const uuid             = require('node-uuid');
const containerFactory = require('../../support/testContainerFactory');

const container        = containerFactory.createContainer();

describe('uuidService', function () {
  container.resolve(function (
    uuidService
  ) {
    describe('#generateV1', function () {
      beforeEach(function () {
        this.sinon.stub(uuid, 'v1');
        uuidService.generateV1();
      });

      it('should call v1 UUID generation', function () {
        uuid.v1.should.have.been.called; // eslint-disable-line no-unused-expressions
      });
    });

    describe('#generateV4', function () {
      beforeEach(function () {
        this.sinon.stub(uuid, 'v4');
        uuidService.generateV4();
      });

      it('should call v4 UUID generation', function () {
        uuid.v4.should.have.been.called; // eslint-disable-line no-unused-expressions
      });
    });

    describe('#isUuid', function () {
      it('return falsey if null', function () {
        should.equal(uuidService.isUuid(), false);
      });

      it('return falsey if string is shorter than 32 chars', function () {
        should.equal(uuidService.isUuid('12345'), false);
      });

      it('return falsey if string is longer than 32 chars', function () {
        should.equal(uuidService.isUuid('12345678901234567890123456789012'), false);
      });

      it('return truthy for a (lowercase) v1 GUID', function () {
        should.equal(uuidService.isUuid(uuid.v1().toLowerCase()), true);
      });

      it('return truthy for a (lowercase) v4 GUID', function () {
        should.equal(uuidService.isUuid(uuid.v4().toLowerCase()), true);
      });

      it('return truthy for a (upercase) v1 GUID', function () {
        should.equal(uuidService.isUuid(uuid.v1().toUpperCase()), true);
      });

      it('return truthy for a (upercase) v4 GUID', function () {
        should.equal(uuidService.isUuid(uuid.v4().toUpperCase()), true);
      });
    });
  });
});
