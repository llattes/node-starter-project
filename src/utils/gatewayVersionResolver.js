const _      = require('lodash');
const semver = require('semver');

// ---

module.exports = function gatewayVersionResolver(
  config,
  constants
) {
  return {
    getAll,
    getVersionsByRamlVersion,
    normalizeNumberToComparable,
    resolve,
    resolveCompatibleVersion
  };

  // ---

  function getAll() {
    return constants.gatewayVersions;
  }

  function getVersionsByRamlVersion(ramlVersion) {
    // eslint-disable-next-line max-len
    return constants.gatewayVersions.filter((gwVersion) => semver.satisfies(normalizeNumberToComparable(ramlVersion), gwVersion.ramlVersionSupported));
  }

  /**
   * Returns a version number compatible for comparisons between gateways
   */
  function normalizeNumberToComparable(versionNumber) {
    if (!versionNumber) {
      return null;
    }

    let normalizedVersionNumber = versionNumber;

    // We need to handle version numbers like 2.0.0-SNAPSHOT
    normalizedVersionNumber = normalizedVersionNumber.split('-')[0];

    // Some versions ids do not define a patch version and therefore can't be directly used to compare versions
    const patchRangeRegexps = [
      new RegExp(/^\d+\.\d+\.x/), // Generic patch version
      new RegExp(/^(\d+\.\d+)$/) // Undefined patch version
    ];

    const regexMatch = _.some(patchRangeRegexps, (regex) => regex.test(normalizedVersionNumber));

    // Adds '.0' part of patch version if not present
    if (regexMatch) {
      normalizedVersionNumber = `${normalizedVersionNumber.split('.')[0]}.${normalizedVersionNumber.split('.')[1]}.0`;
    }

    return normalizedVersionNumber;
  }

  function resolve(versionNumber) {
    let resolved;

    if (!versionNumber) {
      return null;
    }

    let resolvedVersionNumber = versionNumber;

    // Version number must be normalized in case it comes with a wildcard in patch version
    resolvedVersionNumber = normalizeNumberToComparable(resolvedVersionNumber);

    getAll().some(function (version) {
      return resolved = semver.satisfies(resolvedVersionNumber, version.condition) ? version : null;
    });

    return resolved;
  }

  function resolveCompatibleVersion(versionNumbers) {
    if (versionNumbers.length === 1) {
      return resolve(versionNumbers[0]);
    }

    return versionNumbers
      .map(normalizeNumberToComparable)
      .sort(function (a, b) {
        // First we need to sort versions in descending order
        return semver.gt(a, b) ? -1 : 1;
      })
      .reduce(function (a, b, index) {
        const currentVersion  = resolve(b);
        const previousVersion = index === 1 ? resolve(a) : a;

        // eslint-disable-next-line max-len
        if (previousVersion && (previousVersion === currentVersion || previousVersion.backwardsCompatibleWith.indexOf(currentVersion.id) >= 0)) {
          return currentVersion;
        }

        // Versions are not compatible
        return null;
      })
    ;
  }
};
