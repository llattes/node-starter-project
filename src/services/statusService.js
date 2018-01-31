const fs      = require('fs');
const path    = require('path');
const Promise = require('bluebird');

// ---

module.exports = function statusService(
  config
) {
  return {
    getVersion
  };

  // ---

  /**
   * Returns the version of the deployed service.
   *
   * @returns {Promise}
   */
  function getVersion() {
    return Promise.promisify(fs.readFile, fs)(path.join(config.root, 'VERSION'), 'utf8')
      .then(JSON.parse)
      .catch(function () {
        return { NOVERSION: '' };
      })
    ;
  }
};
