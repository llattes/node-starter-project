const _       = require('lodash');
const uuidLib = require('node-uuid');

module.exports = function uuidService() {
  return {
    generateV1,
    generateV4,
    isUuid
  };

  /**
   * Generate and return a RFC4122 v1 (timestamp-based) UUID.
   *
   * @returns {String}
   */
  function generateV1() {
    return uuidLib.v1();
  }

  /**
   * Generate and return a RFC4122 v4 UUID.
   *
   * @returns {String}
   */
  function generateV4() {
    return uuidLib.v4();
  }

  /**
   * Validates a RFC4122 UUID.
   *
   * @returns {Boolean}
   */
  function isUuid(uuid) {
    const uuidRegex = new RegExp(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    return _.isString(uuid) && uuid.length === 36 && uuidRegex.test(uuid);
  }
};
