const _       = require('lodash');
const Promise = require('bluebird');

// ---

module.exports = function hybridService(
  constants,
  customErrors,
  errors,
  hybridGateway
) {
  const hybridDeploymentStatus = constants.hybridDeploymentStatus;

  return {
    deployApplication,
    getApplication
  };

  /**
   * Deploys or re-deploys a proxy to a Hybrid server or group
   *
   * @param {Object} context
   * @param {Object} applicationInfo
   * @param {Object} proxyStream
   *
   * @returns {Promise} a Promise to a applicationInfo
   */
  function deployApplication(context, applicationInfo, proxyStream) {
    return internalGetApplication()
      .then(updateProxyFile)
      .catch(errors.NotFound, createApplication)
      .thenReturn(applicationInfo)
    ;

    function internalGetApplication() {
      if (!applicationInfo.applicationId) {
        return Promise.reject(new errors.NotFound());
      }

      return getApplication(context, applicationInfo.environmentId, applicationInfo.applicationId);
    }

    function updateProxyFile() {
      return hybridGateway.getApplicationsByQuery(context, applicationInfo.environmentId, {
        applicationName: applicationInfo.name,
        targetId:        applicationInfo.targetId
      })
      .then((deployedApps) => {
        // If there is are no apps with that name, create it
        if (deployedApps.length === 0) {
          return createApplication();
        }

        const applicationId           = deployedApps[0].id;
        // eslint-disable-next-line no-param-reassign
        applicationInfo.applicationId = applicationId;

        return hybridGateway.updateApplication(context, applicationInfo.environmentId, applicationId, {
          file: {
            name:   `${applicationInfo.name}.jar`,
            stream: proxyStream
          }
        });
      })
      ;
    }

    function createApplication() {
      return hybridGateway.createApplication(context, applicationInfo.environmentId, {
        artifactName: applicationInfo.name,
        targetId:     applicationInfo.targetId,
        file:         {
          name:   `${applicationInfo.name}.jar`,
          stream: proxyStream
        }
      })
      .then(function (application) {
        // eslint-disable-next-line no-param-reassign
        applicationInfo.applicationId = application.id;
      })
      .catch(function (error) {
        if (error.responseStatus === 409) {
          // eslint-disable-next-line max-len
          return Promise.reject(new customErrors.EntityConsistencyError('This target has an application with the same name already deployed. Please delete it in order to create a new deployment.'));
        }

        return Promise.reject(error);
      })
      ;
    }
  }

  /**
   * Returns an application
   *
   * @param {Object} context
   * @param {String} environmentId
   * @param {String} applicationId
   *
   * @returns {Promise} a Promise to a hybrid application
   */
  function getApplication(context, environmentId, applicationId) {
    return hybridGateway.getApplication(context, environmentId, applicationId)
      .then(function (application) {
        return {
          name:          (application.artifact || {}).name,
          applicationId: application.id,
          targetId:      (application.target || {}).id,
          status:        resolveApplicationStatus(application),
          desiredStatus: application.desiredStatus
        };
      })
      .catch(function (error) {
        if (error.responseStatus === 404) {
          return Promise.reject(new errors.NotFound(`Hybrid application ID: ${applicationId}`));
        }

        return Promise.reject(error);
      })
    ;

    function resolveApplicationStatus(application) {
      if (application.lastReportedStatus === hybridDeploymentStatus.partial) {
        // if one of the serverArtifacts failed to deploy then the entire deploy failed
        return _.find(application.serverArtifacts, { lastReportedStatus: hybridDeploymentStatus.failed }) ?
                hybridDeploymentStatus.failed : hybridDeploymentStatus.partial;
      }

      return application.lastReportedStatus;
    }
  }
};
