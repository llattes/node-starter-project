module.exports = {
  gatewayVersions:        [
    {
      id:                      '4.0.0',
      label:                   '4.0.x',
      proxyFileNameSuffix:     '4.0.x',
      condition:               '>=4.0.0',
      backwardsCompatibleWith: [],
      ramlVersionSupported:    '<=1.0.0'
    }
  ],

  hybridDeploymentStatus: {
    started:     'STARTED',
    deployed:    'DEPLOYED',
    deploying:   'DEPLOYING',
    undeploying: 'UNDEPLOYING',
    undeployed:  'UNDEPLOYED',
    partial:     'PARTIALLY_STARTED',
    failed:      'DEPLOYMENT_FAILED'
  },

  muleVersionThreshold:   '>=4'
};
