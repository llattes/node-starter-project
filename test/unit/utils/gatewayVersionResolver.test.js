const _                = require('lodash');
const containerFactory = require('../../support/testContainerFactory');

const container        = containerFactory.createContainer();

describe('gatewayVersionResolver', function () {
  container.resolve(function (
    constants,
    gatewayVersionResolver
  ) {
    let v400;

    beforeEach(function () {
      v400 = _.find(constants.gatewayVersions, { id: '4.0.0' });
    });

    describe('#getAll', function () {
      it('should return all gateway versions', function () {
        gatewayVersionResolver.getAll().should.be.deep.equal(constants.gatewayVersions);
      });
    });

    describe('#getVersionsByRamlVersion', function () {
      let ramlVersion;

      describe('for RAML version 0.8', function () {
        beforeEach(function () {
          ramlVersion = '0.8';
        });

        it('should return all gateway versions', function () {
          gatewayVersionResolver.getVersionsByRamlVersion(ramlVersion).should.be.deep.equal(constants.gatewayVersions);
        });
      });

      describe('for RAML version 1.0', function () {
        beforeEach(function () {
          ramlVersion = '1.0';
        });

        it('should return only gateway version 3.8', function () {
          const gatewayVersions = gatewayVersionResolver.getVersionsByRamlVersion(ramlVersion);
          gatewayVersions.length.should.be.equals(1);
          gatewayVersions[0].should.be.deep.equal(v400);
        });
      });
    });

    describe('#normalizeNumberToComparable', function () {
      describe('when gateway version has number referencing snapshot', function () {
        it('should remove it', function () {
          gatewayVersionResolver.normalizeNumberToComparable('1.2.3-snapshot').should.be.equal('1.2.3');
        });
      });

      describe('when gateway version has number with wildcard symbol in patch part ', function () {
        it('should remove it', function () {
          gatewayVersionResolver.normalizeNumberToComparable('1.3.x').should.be.equal('1.3.0');
          gatewayVersionResolver.normalizeNumberToComparable('1.2.x').should.be.equal('1.2.0');
        });
      });

      describe('when gateway version has number with defined major, minor and patch part', function () {
        it('should return the same id', function () {
          gatewayVersionResolver.normalizeNumberToComparable('1.3.0').should.be.equal('1.3.0');
          gatewayVersionResolver.normalizeNumberToComparable('1.2.0').should.be.equal('1.2.0');
        });
      });

      describe('when gateway version has number with defined major, minor and but does not have patch part', function () {
        it('should return with 0 in patch', function () {
          gatewayVersionResolver.normalizeNumberToComparable('1.3').should.be.equal('1.3.0');
          gatewayVersionResolver.normalizeNumberToComparable('1.2').should.be.equal('1.2.0');
        });
      });

      describe('when input is null', function () {
        it('should return null', function () {
          should.equal(gatewayVersionResolver.normalizeNumberToComparable(null), null);
        });
      });
    });

    describe('#resolve', function () {
      [
        '4.0.1',
        '4.0.0',
        '4.0.x',
        '4.0.0-SNAPSHOT'
      ]
      .forEach(function (version) {
        it('should resolve version 4.0.0', function () {
          gatewayVersionResolver.resolve(version).should.be.equal(v400);
        });
      });

      describe('when there is no version provided', function () {
        it('should resolve null', function () {
          should.equal(gatewayVersionResolver.resolve(_.noop()), null);
        });
      });
    });

    describe('#resolveCompatibleVersion', function () {
      [
        ['4.0.0', '4.1.3', '4.1.x'],
        ['4.1.3'],
        ['4.0.x', '4.2.3']
      ]
      .forEach(function (versions) {
        it('should resolve compatible version 4.0.0', function () {
          gatewayVersionResolver.resolveCompatibleVersion(versions).should.be.equal(v400);
        });
      });
    });
  });
});
