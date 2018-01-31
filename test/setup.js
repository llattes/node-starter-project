const chai            = require('chai');
const chaiAsPromised  = require('chai-as-promised');
const Promise         = require('bluebird');
const sinon           = require('sinon');
const sinonChai       = require('sinon-chai');

// ---

global.should = chai.should();

// ---

chai.use(chaiAsPromised);
chai.use(sinonChai);

// ---

beforeEach(function setupTest() {
  this.sinon = sinon.sandbox.create().usingPromise(Promise);
});

afterEach(function closeTest() {
  this.sinon.restore();
});
