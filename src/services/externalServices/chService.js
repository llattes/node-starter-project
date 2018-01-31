const _       = require('lodash');
const Promise = require('bluebird');
const semver  = require('semver');

// ---

module.exports = function chService(
  apiPlatformGateway,
  config,
  csService,
  customErrors,
  errors,
  gatewayVersionResolver,
  logger,
  superagent
) {
  const baseUri = config.cloudhub.baseUri;

  // ---

  return {
    getApplication,
    getDomainAvailability,
    upsertApplication,
    deployApplication
  };

  // ---

  /**
   * Gets a CH application
   *
   * @param {Object} context
   * @param {String} applicationName
   * @param {String} [environmentId]
   *
   * @returns {Promise} A CH application
   */
  function getApplication(context, applicationName, environmentId) {
    return wrap(context, environmentId, superagent
      .get(`${baseUri}/api/v2/applications/${applicationName}`)
    )
      .catch(function (error) {
        return Promise.reject(error.status === 404 ? new errors.NotFound(`CloudHub Application, domain: ${applicationName}`) : error);
      })
    ;
  }

  /**
   * Gets the availability of a CH domain name
   *
   * @param {Object} context
   * @param {String} applicationName
   *
   * @returns {Promise} Availability for a domain
   */
  function getDomainAvailability(context, applicationName) {
    return wrap(context, null, superagent
      .get(`${baseUri}/api/applications/domains/${applicationName}`)
    )
      .then(function (data) {
        if (data) {
          return {
            available: !!data.available
          };
        }

        return {
          available: false
        };
      })
    ;
  }

  /**
   * Creates a CH application, if it exists, then it retrieves it,
   * if the application is readable for the user, then it sees if the application's muleVersion matches
   * the desired and if not, updates it.
   *
   * @param {Object} context
   * @param {Object} applicationInfo
   * @param {Object} options
   *
   * @returns {Promise} A CH application
   */
  function upsertApplication(context, applicationInfo, options) {
    let chAmiVersion;
    let chApplication;

    return getMuleVersions(context)
      .then(function (versions) {
        // If the version requested match a known gateway version, we extract the version expression,
        // otherwise we user what the user requested
        const version = gatewayVersionResolver.resolve(applicationInfo.gatewayVersion);
        chAmiVersion  = findSuitableVersion(versions, version ? version.condition : applicationInfo.gatewayVersion);

        return addApplicationProperties(context, {});
      })
      .then(function (applicationProperties) {
        return createApplication(context, applicationInfo.environmentId, chApplication = {
          domain:      applicationInfo.name,
          muleVersion: chAmiVersion.name,
          properties:  applicationProperties,
          workerType:  config.cloudhub.workerType,
          workers:     1
        });
      })
      .catch(function (error) {
        if (options.ignoreDuplicatedError && error.status === 409) {
          return updateOrRecreateApplication(context, applicationInfo.environmentId, chApplication);
        }

        return Promise.reject(error);
      })
    ;
  }

  /**
   * Deploys a CH application
   *
   * @param {Object} context
   * @param {Object} applicationInfo
   * @param {Stream} proxyStream
   *
   * @returns {Promise} A CH application
   */
  function deployApplication(context, applicationInfo, proxyStream) {
    // Upload the file
    return wrap(context, applicationInfo.environmentId, superagent
      .post(`${baseUri}/api/v2/applications/${applicationInfo.name}/files`)
      .attach('file', proxyStream, `${applicationInfo.name}-api-gateway.jar`)
    )
      .then(function () {
        // START the deployment
        return wrap(context, applicationInfo.environmentId, superagent
          .post(`${baseUri}/api/applications/${applicationInfo.name}/status`)
          .send({ status: 'START' })
        )
          .catch(function (error) {
            if (error.status === 304) {
              return Promise.resolve();
            }

            return Promise.reject(error);
          })
        ;
      })
    ;
  }

  // ---

  /**
   * Get all the mule versions
   *
   * @param {Object} context
   *
   * @returns {Promise} Versions list
   */
  function getMuleVersions(context) {
    return wrap(context, null, superagent
      .get(`${baseUri}/api/mule-versions`)
    )
      .then(function (data) {
        if (data && data.data && data.data.length) {
          // Only use the active AMIs for API-GATEWAY-*
          return data.data
            .filter(function (version) {
              // eslint-disable-next-line no-mixed-operators
              return version.state === 'ACTIVE' &&
                // eslint-disable-next-line no-mixed-operators
                (version.version.match(/^(\d+\.\d+.\d+)-API-GATEWAY/i) && !version.version.match(/SNAPSHOT/i)) ||
                (version.version.match(/^API-GATEWAY-/i)               && !version.version.match(/SNAPSHOT/i)) ||
                (version.version.match(/^API Gateway /i)               && !version.version.match(/SNAPSHOT/i)) ||
                (version.version.match(/^(\d+\.\d+.\d+)/i)             && !version.version.match(/SNAPSHOT/i));
            })
            .map(function (version) {
              let versionParts = version.version.match(/^(\d+\.\d+.\d+)-API-GATEWAY/i);

              if (!versionParts) {
                versionParts = version.version.match(/^API-GATEWAY-(\d+\.\d+.\d+)/i);
              }

              // Match the naming scheme in STG/production
              if (!versionParts) {
                versionParts = version.version.match(/^API Gateway (\d+\.\d+.\d+)/i);
              }

              // Match the naming scheme for Mule Runtimes
              if (!versionParts) {
                versionParts = version.version.match(/^(\d+\.\d+.\d+)/i);
              }

              return {
                semver: versionParts[1],
                name:   version.version
              };
            })
            .filter(function (version) {
              return semver.satisfies(version.semver, config.cloudhub.supportedRuntimeVersions);
            })
          ;
        }

        return [];
      })
    ;
  }

  /**
   * Updates CH application properties or promotes the application to a different environment
   *
   * @param {Object} context
   * @param {String} environmentId
   * @param {Object} chApplication
   *
   * @returns {Promise} A CH application
   */
  function updateOrRecreateApplication(context, environmentId, chApplication) {
    // We obtain the application to update its properties and Mule version
    return getApplication(context, chApplication.domain, environmentId)
      .then(function (application) {
        return addApplicationProperties(context, application.properties || {});
      })
      .then(function (applicationProperties) {
        // if the application does not have the correct version, we must update it
        return updateApplication(context, environmentId, _.extend(chApplication, { properties: applicationProperties }));
      })
      .catch(function (error) {
        // If we receive an authorization denied error, the application might exists in another environment,
        // so we delete it from there and then re-create it in the requested environment
        if (error.status === 403) {
          return deleteApplicationFromAllEnvironments(context, chApplication.domain)
            .then(function () {
              return createApplication(context, environmentId, chApplication);
            })
          ;
        }

        return Promise.reject(error);
      })
    ;
  }

  /**
   * Updates an application's version and properties
   *
   * @param {Object} context
   * @param {String} environmentId
   * @param {Object} chApplication
   *
   * @returns {Promise} A CH application
   */
  function updateApplication(context, environmentId, chApplication) {
    return wrap(context, environmentId, superagent
      .put(`${baseUri}/api/applications/${chApplication.domain}`)
      .send({
        muleVersion: chApplication.muleVersion,
        properties:  chApplication.properties
      })
    )
      .then(mapChApplication)
    ;
  }

  /**
   * Creates an application in cloudhub
   *
   * @param {Object} context
   * @param {String} environmentId
   * @param {Object} chApplication
   *
   * @returns {Promise} A CH application
   */
  function createApplication(context, environmentId, chApplication) {
    return wrap(context, environmentId, superagent
      .post(`${baseUri}/api/applications`)
      .send(chApplication)
    )
      .then(mapChApplication)
    ;
  }

  /**
   * Tries to delete an application from all the existing environments, fails with AuthorizationError() if the application cannot be deleted
   *
   * @param {Object} context
   * @param {String} applicationName
   *
   * @returns {Promise} A CH application
   */
  function deleteApplicationFromAllEnvironments(context, applicationName) {
    return apiPlatformGateway.getAllEnvironments(context)
      .then(function (response) {
        return Promise
          .any(response.environments.map(function (environment) {
            return deleteApplication(context, environment.id, applicationName);
          }))
          .catch(function () {
            return Promise.reject(new errors.Unauthorized());
          })
        ;
      })
    ;
  }

  /**
   * Tries to delete an application from a specific environments and then it polls until the app is actually deleted
   *
   * @param {Object} context
   * @param {String} environmentId
   * @param {String} applicationName
   *
   * @returns {Promise} A CH application
   */
  function deleteApplication(context, environmentId, applicationName) {
    return wrap(context, environmentId, superagent
      .del(`${baseUri}/api/applications/${applicationName}`)
    )
      .then(function () {
        const defer = Promise.defer();
        let counter = 0;

        // eslint-disable-next-line wrap-iife
        (function pollUntilDeleted() {
          counter += 1;
          getApplication(context, applicationName, environmentId)
            .then(function () {
              // eslint-disable-next-line no-unused-expressions
              counter < 10 ? setTimeout(pollUntilDeleted, 1000) :
                defer.reject(new customErrors.CloudhubError(409, 'The application cannot be deleted (timeout)'));
            })
            .catch(function (error) {
              // eslint-disable-next-line no-unused-expressions
              error instanceof errors.NotFound ? defer.resolve() : defer.reject(error);
            })
          ;
        })();

        return defer.promise
          .catch(function (error) {
            logger.error('The application %s cannot be deleted from environment %s: %s', applicationName, environmentId, error.stack || error);
            return Promise.reject(error);
          })
        ;
      })
    ;
  }

  /**
   * Takes an object and inserts into it, the values needed for the properties in CH for an API GW to work
   *
   * @param {Object} context
   * @param {Object} properties
   *
   * @returns {Promise} with the properties
   */
  function addApplicationProperties(context, properties) {
    const updatedProperties = properties;

    updatedProperties['anypoint.platform.base_uri']           = config.platform.baseUri;
    updatedProperties['anypoint.platform.analytics_base_uri'] = config.analytics.ingestUri;

    // Before CROWD environments release: GWs use client_id & client_secret of the master organization
    // After CROWD environments release: GWs use client_id & client_secret of the environment associated
    const getClient = context.environmentId ? 'getEnvironmentCredentials' : 'getOrganizationCredentials';

    return csService[getClient](context)
      .then(function (client) {
        updatedProperties['anypoint.platform.client_id']        = client.client_id;
        updatedProperties['anypoint.platform.client_secret']    = client.client_secret;

        return updatedProperties;
      })
    ;
  }

  /**
   * Wraps request into `bluebird` promise and attaches
   * token to it as `Authorization` header.
   *
   * We still use `superagent-promise` here, but it is based on
   * `promise` library which is half-backed and does not provide
   * 100% promises API so we need to wrap it into real promises.
   *
   * @param {Object} context
   * @param {String} environmentId
   * @param {Object} req
   *
   * @returns {Promise} Response body or error.
   */
  function wrap(context, environmentId, req) {
    return (environmentId ? req.set('X-ANYPNT-ENV-ID', environmentId) : req)
      .set('Authorization', `Bearer ${context.user.token}`)
      .end()
      .then(body)
    ;
  }

  /**
   * Handles response by wrapping all NON 2xx status
   * codes into `Errors` and in case
   * of 2xx it extract and returns body of response.
   *
   * @param {Object} res
   *
   * @returns {Promise} Response body or error.
   */
  function body(res) {
    if (!res.ok) {
      // eslint-disable-next-line max-len
      return Promise.reject(new customErrors.CloudhubError(_.isObject(res.body) ? res.body.message : null, res.status, { method: res.req.method, path: res.req.path }));
    }

    return Promise.resolve(res.body);
  }

  /**
   * Tries to find a version suitable for a deployment,
   *
   * @param {Array} allVersions a list of all the mule versions supported by CH
   * @param {String} versionExpression the version needed by the proxy
   *
   * @returns {Object} an object in allVersions who matches the versionExpression and is the greatest version.
   */
  function findSuitableVersion(allVersions, versionExpression) {
    // It will iterate all versions and will store the highest version that satifies the versionExpression
    // All versions are asumed to be semver 2.0
    // seed chosenVersion with the lowest possible semver
    let chosenVersion = { semver: '0.0.0' };

    allVersions.forEach(function (version) {
      if (semver.satisfies(version.semver, versionExpression)) {
        if (semver.gt(version.semver, chosenVersion.semver)) {
          chosenVersion = version;
        }
      }
    });

    return chosenVersion;
  }

  /**
   * Maps a CH application to something more understandable for us
   *
   * @param {Object} application
   *
   * @returns {Object} an object with some information valuable for us
   */
  function mapChApplication(application) {
    if (!application) {
      return {};
    }

    return {
      fullDomain:        application.fullDomain,
      id:                application.id,
      name:              application.domain,
      status:            application.status,
      gatewayVersion:    application.muleVersion,
      supportedVersions: application.supportedVersions
    };
  }
};
