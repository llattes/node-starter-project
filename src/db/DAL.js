'use strict';

module.exports = function DAL(
  config,
  constants,
  queryFactory
) {
  /**
   * Important: We use these source queries to help enforce tenant separation,
   * so that repositories build on this DAL do not accidentally return data
   * that crosses multiple tenants. Thus, all source queries here require an
   * organization (tenant) id. This also help eliminate some upstream
   * redundancy. (I call this pattern 'layered repositories.')
   */
  var self = {

    // Unfiltered tables, use only for inserts/admin! These are functions
    // so that we can return a new query builder every time.
    createOrganizationQuery:          function (context) { return queryFactory.createTableQuery(context, 'Organizations');         },
    createPortalQuery:                function (context) { return queryFactory.createTableQuery(context, 'Portals');               },
    createPageQuery:                  function (context) { return queryFactory.createTableQuery(context, 'Pages');                 },
    createPortalFileQuery:            function (context) { return queryFactory.createTableQuery(context, 'PortalFiles');           },
    createPortalTermsQuery:           function (context) { return queryFactory.createTableQuery(context, 'PortalTerms');           },
    createPortalTermsAcceptanceQuery: function (context) { return queryFactory.createTableQuery(context, 'PortalTermsAcceptance'); },
    createWidgetQuery:                function (context) { return queryFactory.createTableQuery(context, 'Widgets');               },

    // Filtered tables, preferred for most repo calls

    // ---------------------- ORGANIZATION TABLES -------------------------------

    Organization: function (context) {
      return self.createOrganizationQuery(context)
        .where(getWhereOrganizationByScope(context));
    },

    // ---------------------- CMS PORTAL TABLES -------------------------------

    Portals: function (context) {
      return self.createPortalQuery(context)
        .where(getWhereByScope(context));
    },

    Pages: function (context) {
      return self.createPageQuery(context)
        .where(getWhereByScope(context));
    },

    Widgets: function (context) {
      return self.createWidgetQuery(context)
        .where(getWhereByScope(context));
    },

    PortalFiles: function (context) {
      return self.createPortalFileQuery(context)
        .where(getWhereByScope(context));
    },

    PortalTerms: function (context) {
      return self.createPortalTermsQuery(context)
        .where(getWhereByScope(context));
    },

    PortalTermsAcceptance: function (context) {
      return self.createPortalTermsAcceptanceQuery(context)
        .where(getWhereByScope(context));
    },

    // ---------------------- API REPOSITORY TABLES -------------------------------

    createApiQuery:             function (context) { return queryFactory.createTableQuery(context, 'Apis');            },
    createApiVersionQuery:      function (context) { return queryFactory.createTableQuery(context, 'ApiVersions');     },
    createApiVersionPinQuery:   function (context) { return queryFactory.createTableQuery(context, 'ApiVersionPins');  },
    createTierQuery:            function (context) { return queryFactory.createTableQuery(context, 'Tiers');           },
    createApplicationQuery:     function (context) { return queryFactory.createTableQuery(context, 'Applications');    },
    createContractQuery:        function (context) { return queryFactory.createTableQuery(context, 'Contracts');       },
    createEndpointQuery:        function (context) { return queryFactory.createTableQuery(context, 'Endpoints');       },
    createProxyDeploymentQuery: function (context) { return queryFactory.createTableQuery(context, 'ProxyDeployments'); },
    createPolicyQuery:          function (context) { return queryFactory.createTableQuery(context, 'Policies');        },

    /**
     * Creates a query for all APIs. We explicitly specify columns here to avoid pulling
     * in the search vector column.
     */
    Apis: function (context) {
      return self.createApiQuery(context)
        .where(getWhereByScope(context));
    },

    /**
     * Creates a query for all APIs. We explicitly specify columns here to avoid pulling
     * in the search vector columns.
     */
    ApiVersions: function (context) {
      return self.createApiVersionQuery(context)
        .where(getWhereByScope(context));
    },

    ApiVersionPins: function (context) {
      return self.createApiVersionPinQuery(context)
        .where({
          userId:               context.user.id
        })
      ;
    },

    Applications: function (context) {
      return self.createApplicationQuery(context)
        .where('masterOrganizationId', context.user.organization.id);
    },

    Contracts: function (context) {
      return self.createContractQuery(context)
        .where(getWhereByScope(context));
    },

    Endpoints: function (context) {
      return self.createEndpointQuery(context)
        .where(getWhereByScope(context));
    },

    ProxyDeployments: function (context) {
      return self.createProxyDeploymentQuery(context)
        .where({
          masterOrganizationId: context.user.organization.id,
          organizationId:       context.organization.id
        });
    },

    // ---------------------- API VERSION FILES REPOSITORY TABLES -------------------------------

    createApiVersionFileQuery: function (context) {
      return queryFactory.createTableQuery(context, 'ApiVersionFiles');
    },

    createApiVersionMigrationQuery: (context) => queryFactory.createTableQuery(context, 'ApiVersionMigrationMappings'),

    ApiVersionFiles: function (context) {
      return self.createApiVersionFileQuery(context)
        .where(getWhereByScope(context));
    },

    Policies: function (context) {
      return self.createPolicyQuery(context)
        .where(getWhereByScope(context));
    },

    Tiers: function (context) {
      return self.createTierQuery(context)
        .where(getWhereByScope(context));
    },

    ApiVersionMigrationMapping: (context) => {
      return self.createApiVersionMigrationQuery(context)
        .where(getWhereByScope(context));
    },

    // ---------------------- CUSTOM POLICIES TABLES -------------------------------

    createCustomPolicyTemplateQuery: function (context) {
      return queryFactory.createTableQuery(context, 'PolicyTemplates');
    },

    CustomPolicyTemplates: function (context) {
      return self.createCustomPolicyTemplateQuery(context)
        .where({
          masterOrganizationId: context.user.organization.id,
          organizationId:       context.organization.id
        });
    },

    // ---------------------- EXCHANGE POLICIES TEMPLATES TABLES -------------------------------

    createExchangePolicyTemplateQuery: function (context) {
      return queryFactory.createTableQuery(context, 'ExchangePolicyTemplates');
    },

    AnyExchangePolicyTemplates: function (context) {
      return self.createExchangePolicyTemplateQuery(context)
        .where(function () {
          this.where({orgId: context.organization.id})
            .orWhere({orgId: config.exchange.defaultMuleOrganizationId});
        });
    },

    // --------------------- UTILITY TABLES -------------------------------------
    createCacheQuery: function (context) { return queryFactory.createTableQuery(context, 'Cache'); },

    Cache: function (context) {
      return self.createCacheQuery(context);
    },

    createAssetCleanupAuditQuery: function (context) { return queryFactory.createTableQuery(context, 'AssetCleanupAudit'); },

    AssetCleanupAudit: function (context) {
      return self.createAssetCleanupAuditQuery(context);
    },

    createLostAlertQuery: function (context) { return queryFactory.createTableQuery(context, 'LostAlerts'); },

    LostAlerts: function (context) {
      return self.createLostAlertQuery(context);
    },

    // --------------------- AUDIT LOGGING -------------------------------------
    createAuditLogEntryQuery: function (context) { return queryFactory.createTableQuery(context, 'audit_log_entries'); }
  };

  function getWhereByScope(context) {
    // global
    if (context.scope === constants.CONTEXT_SCOPES.GLOBAL) {
      return {};
    }

    // tenant
    if (context.scope === constants.CONTEXT_SCOPES.TENANT) {
      return {masterOrganizationId: context.user.organization.id};
    }

    // organization
    return {
      masterOrganizationId: context.user.organization.id,
      organizationId:       context.organization.id
    };
  }

  function getWhereOrganizationByScope(context) {
    // global
    if (context.scope === constants.CONTEXT_SCOPES.GLOBAL) {
      return {};
    }
    return {id: context.organization.id};
  }

  return self;
};
