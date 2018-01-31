const bluebird = require('bluebird');

// ---

module.exports = function superagentify() {
  return function (superagent) {
    return bluebird.fromNode(superagent.end.bind(superagent));
  };
};
