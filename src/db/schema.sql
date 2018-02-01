-- Create Database ApiPortals;

DROP SCHEMA IF EXISTS "public" CASCADE;
CREATE SCHEMA "public";

---------------------------------------- Functions ----------------------------------------

CREATE FUNCTION set_updateddate_tonow()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedDate" = NOW();
  RETURN NEW;
END; $$
LANGUAGE plpgsql;

------------------------------------ COMMON Tables & Triggers -------------------------------------

-- ORGANIZATIONS
CREATE TABLE "Organizations" (
  "id" varchar(40) PRIMARY KEY,
  "theme" text, -- JSON
  "terms" text, -- JSON = {text, updatedDate}
  "portalTermsId" integer,
  "redirectUri" text,

  "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedDate" TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER Organizations_before_update BEFORE UPDATE
ON "Organizations" FOR EACH ROW EXECUTE PROCEDURE set_updateddate_tonow();

------------------------------------ CMS PORTAL Tables & Triggers -------------------------------------

-- PORTALS
CREATE TABLE "Portals" (
  "masterOrganizationId" varchar(40)
    CONSTRAINT "Portals_masterOrganizationId_fkey" REFERENCES "Organizations" ("id") ON DELETE CASCADE,
  "organizationId" varchar(40)
    CONSTRAINT "Portals_organizationId_fkey" REFERENCES "Organizations" ("id") ON DELETE CASCADE,
  "id" serial UNIQUE,
  PRIMARY KEY ("masterOrganizationId", "organizationId", "id"),

  "name" varchar(150),
  "isPublic" boolean NOT NULL DEFAULT FALSE,
  "theme" text, -- JSON
  "redirectUri" TEXT,

  "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedDate" TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER Portals_before_update BEFORE UPDATE
ON "Portals" FOR EACH ROW EXECUTE PROCEDURE set_updateddate_tonow();

-- PORTAL TERMS
CREATE TABLE "PortalTerms" (
  "id"                   serial UNIQUE NOT NULL,
  "masterOrganizationId" varchar(40),
  "organizationId"       varchar(40),
  "text"                 text, -- JSON
  "createdDate"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedDate"          TIMESTAMP WITH TIME ZONE,

  PRIMARY KEY ("masterOrganizationId", "organizationId", "id")
);

-- PORTAL TERMS ACCEPTANCE
CREATE TABLE "PortalTermsAcceptance" (
  "id"                   serial UNIQUE NOT NULL,
  "masterOrganizationId" varchar(40),
  "organizationId"       varchar(40),
  "userId"               varchar(40),
  "portalTermsId"        integer,
  "createdDate"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  PRIMARY KEY ("masterOrganizationId", "organizationId", "id"),
  FOREIGN KEY ("masterOrganizationId", "organizationId", "portalTermsId") REFERENCES "PortalTerms" ("masterOrganizationId", "organizationId", "id") ON DELETE CASCADE
);

-- PAGES
CREATE TABLE "Pages" (
  "masterOrganizationId" varchar(40),
  "organizationId" varchar(40),
  "id" serial UNIQUE,
  PRIMARY KEY ("masterOrganizationId", "organizationId", "id"),

  "portalId" integer NOT NULL,
  CONSTRAINT "Pages_portal_fkey" FOREIGN KEY ("masterOrganizationId", "organizationId", "portalId")
    REFERENCES "Portals" ("masterOrganizationId", "organizationId", "id") ON DELETE CASCADE,

  "order" smallint,                         -- Visual order of the page in its parent portal or page
  "name" varchar(50) NOT NULL,              -- Display name of the page
  "draftName" varchar(50),                  -- Draft version of the name, cleared when the page is published
  "data" text,                              -- Page data, e.g. the markdown for a page, its configuration, &c, in JSON form
  "draftData" text,                         -- Draft version of page data, e.g. the markdown for a page, its configuration, &c, in JSON form

  "type" varchar(12) NOT NULL CHECK ("type" IN ('notebook', 'markdown', 'console', 'link', 'header')),

  "visible" boolean NOT NULL DEFAULT FALSE,

  UNIQUE ("portalId", "name"),

  "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedDate" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX "Pages_portal_idx"
ON "Pages" ("masterOrganizationId", "organizationId", "portalId");

CREATE TRIGGER Pages_before_update BEFORE UPDATE
ON "Pages" FOR EACH ROW EXECUTE PROCEDURE set_updateddate_tonow();

------------------------------------ API REPOSITORY Tables & Triggers -------------------------------------

-- Apis
CREATE TABLE "Apis" (
  "masterOrganizationId" varchar(40)
    CONSTRAINT "Apis_masterOrganization_fkey" REFERENCES "Organizations" ("id") ON DELETE CASCADE,
  "organizationId" varchar(40)
    CONSTRAINT "Apis_organization_fkey" REFERENCES "Organizations" ("id") ON DELETE CASCADE,
  "id" serial UNIQUE,
  PRIMARY KEY ("masterOrganizationId", "organizationId", "id"),

  "name" text NOT NULL,                    -- Unique name of the API
  CONSTRAINT "Apis_masterOrganizationId_name_unique"
    UNIQUE ("masterOrganizationId", "name"),

  "groupId" text,
  "assetId" text,
  "exchangeAssetName" text NOT NULL,       -- On column creation this is set with the current name

  "nameSV" tsvector NOT NULL,                     -- full text search vector for API name

  "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedDate" TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER "Apis_before_update" BEFORE UPDATE
ON "Apis" FOR EACH ROW EXECUTE PROCEDURE set_updateddate_tonow();

-- Full text search for Apis table:
CREATE INDEX ON "Apis" USING gin("nameSV");
CREATE FUNCTION "Apis_set_searchVectors"() RETURNS trigger AS $$
BEGIN
  new."nameSV" := to_tsvector('pg_catalog.english', new.name);
  RETURN new;
END
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Apis_set_searchVectors_trigger" BEFORE INSERT OR UPDATE
ON "Apis" FOR EACH ROW EXECUTE PROCEDURE "Apis_set_searchVectors"();

-- ApiVersions
CREATE TABLE "ApiVersions" (
  "masterOrganizationId" varchar(40),
  "organizationId" varchar(40),
  "id" serial UNIQUE,
  PRIMARY KEY ("masterOrganizationId", "organizationId", "id"),

  "apiId" integer NOT NULL,
  CONSTRAINT "ApiVersions_api_fkey" FOREIGN KEY ("masterOrganizationId", "organizationId", "apiId")
    REFERENCES "Apis" ("masterOrganizationId", "organizationId", "id") ON DELETE CASCADE,

  "portalId" integer,
  CONSTRAINT "ApiVersions_portal_fkey" FOREIGN KEY ("masterOrganizationId", "organizationId", "portalId")
    REFERENCES "Portals" ("masterOrganizationId", "organizationId", "id") ON DELETE RESTRICT,

  "name" varchar(150) NOT NULL,                   -- Name of version, e.g. "1.12.abc-12"
  UNIQUE ("apiId", "name"),

  "description" text,                             -- Full description of the API
  "descriptionSV" tsvector,                       -- full text search vector for description

  "isPublic" boolean NOT NULL DEFAULT false,      -- Used mainly for integration with Exchange

  "instanceLabel" text,

  "groupId" text,
  "assetId" text,

  "productVersion" text,
  "assetVersion"   text,

  "tags" varchar(150)[],
  "tagsSV" tsvector,                              -- full text search vector for tags

  "order" integer NOT NULL,                       -- Sorts versions by their release order. Biggest number is latest
  "releaseNotes" text,
  "rootFileId" integer,
  "deprecated" boolean NOT NULL DEFAULT FALSE,    -- Cannot create new applications against deprecated API versions

  "terms" text,
  "termsDate" TIMESTAMP WITH TIME ZONE,

  "endpointUri" TEXT NULL,

  "lastActiveDate" TIMESTAMP WITH TIME ZONE,

  "environmentId" VARCHAR(40),

  "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedDate" TIMESTAMP WITH TIME ZONE
);

-- Full text search for ApiVersions table:
CREATE INDEX ON "ApiVersions" USING gin("tagsSV");
CREATE INDEX ON "ApiVersions" USING gin("descriptionSV");

-- API Version index with environemtns
CREATE INDEX CONCURRENTLY "ApiVersions_masterOrganizationId_organizationId_environmentId_idx"
  ON "ApiVersions"("masterOrganizationId", "organizationId", "environmentId");


ALTER TABLE "ApiVersions"
  ADD CONSTRAINT "ApiVersions_apiId_environmentId_name_key"
  UNIQUE("apiId", "environmentId", "name");

ALTER TABLE "ApiVersions"
  ADD CONSTRAINT "ApiVersions_apiId_productVersion_envId_instanceLabel_key"
    UNIQUE("apiId", "productVersion", "environmentId", "instanceLabel");

CREATE UNIQUE INDEX "ApiVersions_apiId_name_unclassifiedEnvironment_idx"
  ON "ApiVersions"("apiId", "name") WHERE "environmentId" IS NULL;

CREATE FUNCTION "ApiVersions_set_searchVectors"() RETURNS trigger AS $$
BEGIN
  IF new."tags" IS NULL OR array_length(new."tags", 1) = 0 THEN
    new."tagsSV" := null;
  ELSE
    new."tagsSV" := to_tsvector('pg_catalog.english', array_to_string(new."tags", ' ', ''));
  END IF;

  IF new."description" IS NULL THEN
    new."descriptionSV" := null;
  ELSE
    new."descriptionSV" := to_tsvector('pg_catalog.english', new.description);
  END IF;

  RETURN new;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ApiVersions_set_searchVectors_trigger" BEFORE INSERT OR UPDATE
ON "ApiVersions" FOR EACH ROW EXECUTE PROCEDURE "ApiVersions_set_searchVectors"();

CREATE TRIGGER ApiVersions_before_update BEFORE UPDATE
ON "ApiVersions" FOR EACH ROW EXECUTE PROCEDURE set_updateddate_tonow();

CREATE FUNCTION "set_api_version_terms_date"() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW."terms" IS NOT NULL) OR (TG_OP = 'UPDATE') THEN
    NEW."termsDate" := NOW();
  END IF;

  RETURN NEW;
END; $$
LANGUAGE 'plpgsql';

CREATE TRIGGER
  "ApiVersions_before_insert_or_update_of_terms"
BEFORE INSERT OR UPDATE OF "terms"
ON
  "ApiVersions"
FOR EACH ROW EXECUTE PROCEDURE
  "set_api_version_terms_date"()
;

CREATE OR REPLACE FUNCTION api_version_default_name() RETURNS trigger AS
$$ BEGIN
  IF (TG_OP = 'INSERT' AND NEW."name" IS NULL AND NEW."productVersion" IS NOT NULL) THEN
    NEW."name" := (NEW."productVersion" || ':' || NEW.id);
  END IF;

  RETURN NEW;
END; $$
LANGUAGE 'plpgsql';


CREATE TRIGGER "ApiVersions_insert_default_name"
  BEFORE INSERT
  ON "ApiVersions"
  FOR EACH ROW
  EXECUTE PROCEDURE api_version_default_name()
;

-- APIVERSIONPINS
CREATE TABLE "ApiVersionPins" (
  "userId" varchar(40) NOT NULL,
  "apiVersionId" INTEGER NOT NULL,
  PRIMARY KEY ("userId", "apiVersionId"),

  CONSTRAINT "ApiVersionPins_apiVersion_fkey" FOREIGN KEY ("apiVersionId")
  REFERENCES "ApiVersions" ("id") ON DELETE CASCADE,
);

-- ENDPOINTS
CREATE TABLE "Endpoints" (
  "masterOrganizationId" varchar(40),
  "organizationId" varchar(40),
  "id" serial UNIQUE,
  PRIMARY KEY ("masterOrganizationId", "organizationId", "id"),

  "apiVersionId" integer NOT NULL,
  CONSTRAINT "Endpoints_apiVersion_fkey" FOREIGN KEY ("masterOrganizationId", "organizationId", "apiVersionId")
    REFERENCES "ApiVersions" ("masterOrganizationId", "organizationId", "id") ON DELETE CASCADE,

  "type" varchar(20) NOT NULL,                  -- Type of the endpoint, e.g. WSDL, RAML, &c
  "uri" text,
  "proxyUri" text,
  "proxyRegistrationUri" text,
  "isCloudHub" BOOLEAN,
  "policiesVersion" VARCHAR(50),       -- policies version supported by the tracking gateway
  "referencesUserDomain" BOOLEAN,
  "muleVersion4OrAbove" BOOLEAN,

  CONSTRAINT "Endpoints_masterOrganizationId_proxyRegistrationUri_unique"
    UNIQUE ("masterOrganizationId", "proxyRegistrationUri"),

  "lastActiveDate" TIMESTAMP WITH TIME ZONE,

  "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedDate" TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER Endpoints_before_update BEFORE UPDATE
ON "Endpoints" FOR EACH ROW EXECUTE PROCEDURE set_updateddate_tonow();

-- APPLICATIONS
CREATE TABLE "Applications" (
  "masterOrganizationId" varchar(40)
    CONSTRAINT "Apis_masterOrganization_fkey" REFERENCES "Organizations" ("id") ON DELETE CASCADE,
  "id" serial UNIQUE,
  PRIMARY KEY ("masterOrganizationId", "id"),

  "name" varchar(150) NOT NULL,
  CONSTRAINT "Applications_masterOrganizationId_name_unique"
    UNIQUE ("masterOrganizationId", "name"),
  "nameSV" tsvector NOT NULL,                     -- full text search vector for name

  "description" text,
  "descriptionSV" tsvector,                       -- full text search vector for description

  "coreServicesId" varchar(128),                  -- core services id for the application

  "url" text,

  "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedDate" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX "Applications_materOrganizationId_coreServicesId_idx"
  ON "Applications" ("masterOrganizationId", "coreServicesId");
CREATE INDEX ON "Applications" ("coreServicesId");

CREATE TRIGGER Applications_before_update BEFORE UPDATE
ON "Applications" FOR EACH ROW EXECUTE PROCEDURE set_updateddate_tonow();

-- Full text search for Applications table:
CREATE INDEX ON "Applications" USING gin("nameSV");
CREATE INDEX ON "Applications" USING gin("descriptionSV");
CREATE FUNCTION "Applications_set_searchVectors"() RETURNS trigger AS $$
BEGIN
  new."nameSV" := to_tsvector('pg_catalog.english', new.name);
  new."descriptionSV" := to_tsvector('pg_catalog.english', new.description);
  RETURN new;
END
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Applications_set_searchVectors_trigger" BEFORE INSERT OR UPDATE
  ON "Applications" FOR EACH ROW EXECUTE PROCEDURE "Applications_set_searchVectors"();

-- TIERS
CREATE TABLE "Tiers" (
  "masterOrganizationId" varchar(40),
  "organizationId" varchar(40),
  "id" serial UNIQUE,
  PRIMARY KEY ("masterOrganizationId", "organizationId", "id"),

  "apiVersionId" integer NOT NULL,
  CONSTRAINT "Tiers_apiVersion_fkey" FOREIGN KEY ("masterOrganizationId", "organizationId", "apiVersionId")
    REFERENCES "ApiVersions" ("masterOrganizationId", "organizationId", "id") ON DELETE CASCADE,

  "name" varchar(150) NOT NULL,
  UNIQUE ("apiVersionId", "name"),

  "description" TEXT,
  "limits" TEXT NOT NULL, -- JSON = [{maximumRequests, timePeriodInMilliseconds, visible}, ...]
  "status" varchar(10) NOT NULL CHECK ("status" IN ('ACTIVE', 'DEPRECATED')),
  "autoApprove" boolean NOT NULL DEFAULT FALSE,

  "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedDate" TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER Tiers_before_update BEFORE UPDATE
ON "Tiers" FOR EACH ROW EXECUTE PROCEDURE set_updateddate_tonow();

-- CONTRACTS
CREATE TABLE "Contracts" (
  "masterOrganizationId" varchar(40),
  "organizationId" varchar(40),
  "id" serial UNIQUE,
  PRIMARY KEY ("masterOrganizationId", "organizationId", "id"),

  "applicationId" integer NOT NULL,
  "apiVersionId" integer NOT NULL,
  UNIQUE ("applicationId", "apiVersionId"),
  CONSTRAINT "Contracts_application_fkey" FOREIGN KEY ("masterOrganizationId", "applicationId")
    REFERENCES "Applications" ("masterOrganizationId", "id") ON DELETE CASCADE,
  -- Cannot delete a version if there are contracts referencing it:
  CONSTRAINT "Contracts_apiVersion_fkey" FOREIGN KEY ("masterOrganizationId", "organizationId", "apiVersionId")
    REFERENCES "ApiVersions" ("masterOrganizationId", "organizationId", "id") ON DELETE RESTRICT,

  "tierId" integer,             -- Current SLA Tier, e.g. "Gold level"
  "requestedTierId" integer,    -- Requested SLA Tier, e.g. "Platinum level"

  -- Cannot delete a tier if there are contracts referencing it:
  CONSTRAINT "Contracts_tier_fkey" FOREIGN KEY ("masterOrganizationId", "organizationId", "tierId")
    REFERENCES "Tiers" ("masterOrganizationId", "organizationId", "id") ON DELETE RESTRICT,

  -- Cannot delete a tier if there are contracts requesting it?
  CONSTRAINT "Contracts_requestedTier_fkey" FOREIGN KEY ("masterOrganizationId", "organizationId", "requestedTierId")
    REFERENCES "Tiers" ("masterOrganizationId", "organizationId", "id") ON DELETE RESTRICT,

  "status" varchar(12) NOT NULL CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED')),
  "approvedDate" TIMESTAMP WITH TIME ZONE,
  "rejectedDate" TIMESTAMP WITH TIME ZONE,
  "revokedDate" TIMESTAMP WITH TIME ZONE,

  "terms" text,

  "partyId" character varying(150) NULL,
  "partyName" character varying(150) NULL,

  "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedDate" TIMESTAMP WITH TIME ZONE
);

-- Update approval flow dates automatically.
CREATE FUNCTION Contracts_set_approval_flow_dates() RETURNS trigger AS $$
BEGIN
  -- Handle date updates for status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'APPROVED' THEN
        NEW."approvedDate" := now();
      WHEN 'REJECTED' THEN
        NEW."rejectedDate" := now();
      WHEN 'REVOKED' THEN
        NEW."revokedDate" := now();
    END CASE;
  -- Handle date updates for tier change ON an approved contract
  ELSIF OLD."tierId" IS DISTINCT FROM NEW."tierId" AND NEW.status = 'APPROVED' THEN
    NEW."approvedDate" := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- For changes to fields affecting or affected by approval status, update relevant timestamps
CREATE TRIGGER Contracts_status_before_update BEFORE UPDATE OF "status","tierId" ON "Contracts"
FOR EACH ROW EXECUTE PROCEDURE Contracts_set_approval_flow_dates();

CREATE TRIGGER Contracts_before_update BEFORE UPDATE
ON "Contracts" FOR EACH ROW EXECUTE PROCEDURE set_updateddate_tonow();

-- PortalFiles
CREATE TABLE "PortalFiles"
(
  "id"                   serial UNIQUE,
  "masterOrganizationId" varchar(40),
  "organizationId"       varchar(40),
  "portalId"             integer,
  "remoteSystemId"       TEXT UNIQUE NOT NULL,                             -- UUID
  "size"                 integer NOT NULL,                                 -- File size in bytes, e.g. 1200000
  "name"                 varchar NOT NULL,                                 -- File name obtained from original file, e.g. "SomeDiagram1"
  "createdDate"          timestamp with time zone NOT NULL DEFAULT now(),

  PRIMARY KEY ("masterOrganizationId", "organizationId", "id"),
  FOREIGN KEY ("masterOrganizationId", "organizationId", "portalId") REFERENCES "Portals" ("masterOrganizationId", "organizationId", "id") ON DELETE CASCADE
);

------------------------------------ RAML File System Tables & Triggers -------------------------------------

-- ApiVersionFiles
CREATE TABLE "ApiVersionFiles" (
  "masterOrganizationId" varchar(40),
  "organizationId" varchar(40),
  "id" serial UNIQUE,
  PRIMARY KEY ("masterOrganizationId", "organizationId", "id"),

  "apiVersionId" integer NOT NULL,
  CONSTRAINT "ApiVersionFiles_apiVersion_fkey" FOREIGN KEY ("masterOrganizationId", "organizationId", "apiVersionId")
    REFERENCES "ApiVersions" ("masterOrganizationId", "organizationId", "id") ON DELETE CASCADE,

  "parentId" integer,
  -- We restrict deletion of non-empty entities (directories) - users must delete children first!
  CONSTRAINT "ApiVersionFiles_parent_fkey" FOREIGN KEY ("masterOrganizationId", "organizationId", "parentId")
    REFERENCES "ApiVersionFiles" ("masterOrganizationId", "organizationId", "id") ON DELETE RESTRICT,

  "isDirectory" boolean NOT NULL,
  "name" varchar(150) NOT NULL,

  -- Reference ID in remote system to store data for files, not directories
  "remoteSystemId" TEXT UNIQUE, CHECK (
    -- "remoteSystemId" MUST BE NULL for directories
    ("isDirectory" IS TRUE  AND "remoteSystemId" IS NULL) OR
    -- "remoteSystemId" MUST HAVE value for files
    ("isDirectory" IS FALSE AND "remoteSystemId" IS NOT NULL)
  ),

  "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedDate" TIMESTAMP WITH TIME ZONE
);

-- We are forced to use separate unique indices because parentId can be null (root)
CREATE UNIQUE INDEX "ApiVersionFiles_parent_idx"
  ON "ApiVersionFiles" ("organizationId", "apiVersionId", "parentId", "name")
  WHERE "parentId" IS NOT NULL;
CREATE UNIQUE INDEX "ApiVersionFiles_name_idx"
  ON "ApiVersionFiles" ("organizationId", "apiVersionId", "name")
  WHERE "parentId" IS NULL;

CREATE TRIGGER ApiVersionFiles_before_update BEFORE UPDATE
ON "ApiVersionFiles" FOR EACH ROW EXECUTE PROCEDURE set_updateddate_tonow();

ALTER TABLE "ApiVersions"
  ADD CONSTRAINT "ApiVersions_rootFile_fkey"
  FOREIGN KEY ("masterOrganizationId", "organizationId", "rootFileId")
  REFERENCES "ApiVersionFiles" ON DELETE RESTRICT
;

-- Asset deletion audit
CREATE TABLE "AssetCleanupAudit" (
  "id"          SERIAL PRIMARY KEY,
  "type"        TEXT NOT NULL,
  "data"        TEXT NOT NULL,
  "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

------------------------------------ SUPPORTING STORED PROCEDURES -------------------------------------

-- Adds the given tags to the given api, ensuring no dupes
CREATE OR REPLACE FUNCTION "addApiVersionTags"("v_masterOrganizationId" varchar(40), "v_organizationId" varchar(40), "v_id" integer, "v_tags" varchar[])
 RETURNS VOID AS $$
  BEGIN
    UPDATE
      "ApiVersions"
    SET
      "tags" = "arrayAdd"("tags", "v_tags")
    WHERE
      "masterOrganizationId" = "v_masterOrganizationId" AND
      "organizationId" = "v_organizationId" AND
      "id" = "v_id"
    ;
  END;
$$ LANGUAGE plpgsql;

-- Removes the given tags from the given api
CREATE OR REPLACE FUNCTION "removeApiVersionTags"("v_masterOrganizationId" varchar(40), "v_organizationId" varchar(40), "v_id" integer, "v_tags" varchar[])
 RETURNS VOID AS $$
  BEGIN
    UPDATE
      "ApiVersions"
    SET
      "tags" = "arraySubtract"("tags", "v_tags")
    WHERE
      "masterOrganizationId" = "v_masterOrganizationId" AND
      "organizationId" = "v_organizationId" AND
      "id" = "v_id"
    ;
  END;
$$ LANGUAGE plpgsql;

-- Used for tagging: Will take two arrays and concatenate them, removing duplicates,
-- so addValuesUnique({1,2,3}, {2,3,4}) = {1,2,3,4}
CREATE OR REPLACE FUNCTION "arrayAdd"(with_array varchar[], concat_array varchar[])
  RETURNS varchar[] AS $$
  DECLARE
    -- The variable used to track iteration over "with_array".
    loop_offset integer;

    -- The array to be returned by this function.
    return_array with_array%TYPE;
  BEGIN
    IF with_array IS NULL THEN
      -- Still want to de-dupe the concat_array!
      with_array = ARRAY[]::varchar[];
    ELSEIF concat_array IS NULL THEN
      -- Existing array is assumed to contain no dupes.
      RETURN with_array;
    END IF;

    -- Add all items in "with_array" to "return_array".
    return_array = with_array;

    -- Iterate over each element in "concat_array".
    FOR loop_offset IN ARRAY_LOWER(concat_array, 1)..ARRAY_UPPER(concat_array, 1) LOOP
      IF NOT concat_array[loop_offset] = ANY(return_array) THEN
        return_array = return_array || concat_array[loop_offset];
      END IF;
    END LOOP;

    RETURN return_array;
  END;
$$ LANGUAGE plpgsql;

-- Used for tagging: Subtracts the elements in the second array from the first.
-- For example, arraySubtract({1,2,3}, {3,4}) = {1,2}
CREATE OR REPLACE FUNCTION "arraySubtract"(with_array varchar[], subtract_array varchar[])
  RETURNS varchar[] AS $$
  DECLARE
    -- The variable used to track iteration over "with_array".
    loop_offset integer;

    -- The array to be returned by this function.
    return_array varchar[];

  BEGIN
    IF with_array IS NULL THEN
      RETURN NULL;
    ELSEIF subtract_array IS NULL THEN
      RETURN with_array;
    END IF;

    -- Create an empty array and add elements not in subtract_array to it
    return_array = ARRAY[]::varchar[];

    -- Iterate over each element in "with_array" and add those not in "subtract_array":
    FOR loop_offset IN ARRAY_LOWER(with_array, 1)..ARRAY_UPPER(with_array, 1) LOOP
      IF NOT with_array[loop_offset] = ANY(subtract_array) THEN
        return_array = return_array || with_array[loop_offset];
      END IF;
    END LOOP;

    RETURN return_array;
  END;
$$ LANGUAGE plpgsql;

------------------------------------ POLICIES Tables & Triggers -------------------------------------

-- POLICIES
CREATE TABLE "Policies"
(
  "masterOrganizationId" varchar(40),
  "organizationId" varchar(40),
  "id" serial UNIQUE,
  PRIMARY KEY ("masterOrganizationId", "organizationId", "id"),

  "apiVersionId" integer NOT NULL,
  CONSTRAINT "Policies_apiVersion_fkey" FOREIGN KEY ("masterOrganizationId", "organizationId", "apiVersionId")
    REFERENCES "ApiVersions" ("masterOrganizationId", "organizationId", "id") ON DELETE CASCADE,

  "policyTemplateId" varchar(255) NOT NULL,
  UNIQUE ("apiVersionId", "policyTemplateId"),

  -- JSON
  "configurationData" text,
  "pointcutData" text,

  -- GAV for Mule 4
  "groupId" text,
  "assetId" text,
  "assetVersion" text,

  "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedDate" TIMESTAMP WITH TIME ZONE,
  "order" integer,
  "disabled" BOOLEAN NOT NULL DEFAULT false
);

CREATE TRIGGER Policies_before_update BEFORE UPDATE
ON "Policies" FOR EACH ROW EXECUTE PROCEDURE set_updateddate_tonow();

-- POLICY TEMPLATES
CREATE TABLE "PolicyTemplates"
(
  "masterOrganizationId" varchar(40)
    CONSTRAINT "Portals_masterOrganizationId_fkey" REFERENCES "Organizations" ("id") ON DELETE CASCADE,
  "organizationId" varchar(40)
    CONSTRAINT "Portals_organizationId_fkey" REFERENCES "Organizations" ("id") ON DELETE CASCADE,
  "id" SERIAL UNIQUE,
  PRIMARY KEY ("masterOrganizationId", "organizationId", "id"),

  "name" VARCHAR(150) NOT NULL,           -- Display name of the policy template
  CONSTRAINT "PolicyTemplates_organizationId_name_unique"
    UNIQUE ("organizationId", "name"),
  "nameSV" tsvector NOT NULL,             -- Full text search vector for name

  "gatewayVersion" VARCHAR(50) NOT NULL,  -- Gateway version supported by the policy template
  "definition" TEXT NOT NULL,             -- Policy template definition using YAML
  "configuration" TEXT NOT NULL,          -- Policy template configuration defined in XML

  "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedDate" TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER PolicyTemplates_before_update BEFORE UPDATE
ON "PolicyTemplates" FOR EACH ROW EXECUTE PROCEDURE set_updateddate_tonow();

-- Full text search for PolicyTemplates table:
CREATE INDEX ON "PolicyTemplates" USING gin("nameSV");
CREATE FUNCTION "PolicyTemplates_set_searchVectors"() RETURNS trigger AS $$
BEGIN
  new."nameSV" := to_tsvector('pg_catalog.english', new.name);
  RETURN new;
END
$$ LANGUAGE plpgsql;
CREATE TRIGGER "PolicyTemplates_set_searchVectors_trigger" BEFORE INSERT OR UPDATE
  ON "PolicyTemplates" FOR EACH ROW EXECUTE PROCEDURE "PolicyTemplates_set_searchVectors"();

CREATE TABLE "Cache"
(
  "key" VARCHAR(350) NOT NULL,       -- The key of the cache
  PRIMARY KEY ("key"),

  "payload" TEXT NOT NULL,  -- The payload of the cache
  "expirationDate" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for searching:
CREATE INDEX ON "Cache" ("key", "expirationDate");

CREATE FUNCTION "updateCache"("v_key" varchar, "v_payload" text, "v_expirationDate" TIMESTAMP WITH TIME ZONE) RETURNS VOID AS $$
BEGIN
  LOCK TABLE "Cache" IN SHARE ROW EXCLUSIVE MODE;
  WITH UPSERT AS (UPDATE "Cache" set "payload"="v_payload", "expirationDate"="v_expirationDate"  WHERE "key"="v_key"  RETURNING key)
  INSERT INTO "Cache" ("key", "payload", "expirationDate") SELECT "v_key", "v_payload", "v_expirationDate" WHERE NOT EXISTS (SELECT "key" FROM UPSERT);
END;
$$ LANGUAGE plpgsql;

-- EXCHANGE POLICY TEMPLATES
CREATE TABLE "ExchangePolicyTemplates" (
  "id"               SERIAL       UNIQUE,
  "groupId"          TEXT         NOT NULL,
  "assetId"          TEXT         NOT NULL,
  "version"          TEXT         NOT NULL,
  "name"             VARCHAR(150) NOT NULL,
  "description"      TEXT,
  "type"             VARCHAR(20)  NOT NULL,
  "definition"       TEXT         NOT NULL,
  "isOOTB"           BOOLEAN      NOT NULL,
  "orgId"            VARCHAR(40)  NOT NULL,
  "minMuleVersion"   VARCHAR(20)  NOT NULL,
  "yamlMd5"          VARCHAR(32),
  "jarMd5"           VARCHAR(32),
  "createdDate"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedDate"      TIMESTAMP WITH TIME ZONE,

  PRIMARY KEY ("groupId", "assetId", "version")
);

CREATE TABLE "ProxyDeployments"
(
  "masterOrganizationId" varchar(40) NOT NULL,
  "organizationId"       varchar(40) NOT NULL,
  "id"                   serial NOT NULL,
  "apiVersionId"         integer NOT NULL,
  "type"                 character varying(150) NOT NULL,

  "applicationName"      character varying(150) NULL,
  "gatewayVersion"       character varying(150) NULL,
  "environmentName"      character varying(150) NULL,
  "environmentId"        character varying(150) NULL,
  "remoteSystemId"       character varying(150) NULL,

  "createdDate"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedDate"          TIMESTAMP WITH TIME ZONE,

  PRIMARY KEY ("masterOrganizationId", "organizationId", "apiVersionId"),
  CONSTRAINT "ProxyDeployments_apiVersion_fkey" FOREIGN KEY ("masterOrganizationId", "organizationId", "apiVersionId")
    REFERENCES "ApiVersions" ("masterOrganizationId", "organizationId", "id") ON DELETE CASCADE
);

CREATE TRIGGER ProxyDeployments_before_update BEFORE UPDATE
ON "ProxyDeployments" FOR EACH ROW EXECUTE PROCEDURE set_updateddate_tonow();

------------------------ AUDIT LOGGING -----------------------------------
CREATE TABLE "audit_log_entries" (
  "id"         bigserial PRIMARY KEY,
  "org_id"     uuid NOT NULL,
  "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  "entry"      text NOT NULL -- JSON
);

------------------------ ALERTS -----------------------------------
CREATE TABLE "LostAlerts" (
  "id"           bigserial PRIMARY KEY,
  "alertId"      uuid NOT NULL,
  "alert"        text NOT NULL, -- JSON
  "error"        text NOT NULL,
  "createdDate"  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);
