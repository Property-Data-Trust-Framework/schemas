const { dereference } = require("@jdw/jst");
const merge = require("deepmerge");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const ajv = new Ajv({
  allErrors: true,
  // schema contains additional baspiRef and RDSRef metadata which is not strictly valid
  strictSchema: false,
  discriminator: true,
});
// Adds date formats among other types to the validator.
addFormats(ajv);

// v1, deprecated direct access
const pdtfTransaction = require("./src/schemas/v1/pdtf-transaction.json");
const materialFacts = require("./src/schemas/v1/material-facts.json");
const legalInformation = require("./src/schemas/v1/legal-information.json");
const energyPerformanceCertificate = require("./src/schemas/v1/energy-performance-certificate.json");
const titleDeed = require("./src/schemas/v1/title-deed.json");
const searches = require("./src/schemas/v1/searches.json");
const localLandCharges = require("./src/schemas/v1/searches/local-land-charges.json");
const localSearchesRequired = require("./src/schemas/v1/searches/local-searches-required.json");
const drainageAndWater = require("./src/schemas/v1/searches/drainage-and-water.json");
const geoJson = require("./src/schemas/v1/GeoJSON.json");
const verifiedClaimsSchema = require("./src/schemas/v1/pdtf-verified-claims.json");

const subSchemas = {
  "https://trust.propdata.org.uk/schemas/v1/material-facts.json": materialFacts,
  "https://trust.propdata.org.uk/schemas/v1/legal-information.json":
    legalInformation,
  "https://trust.propdata.org.uk/schemas/v1/energy-performance-certificate.json":
    energyPerformanceCertificate,
  "https://geojson.org/schema/GeoJSON.json": geoJson,
  "https://trust.propdata.org.uk/schemas/v1/title-deed.json": titleDeed,
  "https://trust.propdata.org.uk/schemas/v1/searches.json": searches,
  "https://trust.propdata.org.uk/schemas/v1/searches/local-land-charges.json":
    localLandCharges,
  "https://trust.propdata.org.uk/schemas/v1/searches/local-searches-required.json":
    localSearchesRequired,
  "https://trust.propdata.org.uk/schemas/v1/searches/drainage-and-water.json":
    drainageAndWater,
};
const transactionSchema = dereference(pdtfTransaction, (id) => subSchemas[id]);
const validator = ajv.compile(transactionSchema);

// v2, via accessor functions and overlays
const combinedSchema = require("./src/schemas/v2/combined.json");
const coreSchema = require("./src/schemas/v2/core.json");

const baspiOverlay = require("./src/schemas/v2/overlays/baspi.json");
// const ta6Overlay = require("./src/schemas/v2/overlays/ta6.json");
// const ta7Overlay = require("./src/schemas/v2/overlays/ta7.json");
// const lpe1Overlay = require("./src/schemas/v2/overlays/lpe1.json");
// const fme1Overlay = require("./src/schemas/v2/overlays/fme1.json");
// const llc1Overlay = require("./src/schemas/v2/overlays/llc1.json");
// const con29ROverlay = require("./src/schemas/v2/overlays/con29R.json");
// const con29DWOverlay = require("./src/schemas/v2/overlays/con29DW.json");
// const rdsOverlay = require("./src/schemas/v2/overlays/rds.json");
// const oc1Overlay = require("./src/schemas/v2/overlays/oc1.json");

const overlays = { baspiV4: baspiOverlay };

const transactionSchemas = {
  "https://trust.propdata.org.uk/schemas/v1/pdtf-transaction.json":
    transactionSchema,
  "https://trust.propdata.org.uk/schemas/v2/pdtf-transaction.json": coreSchema,
};

const combineMerge = (target, source, options) => {
  const destination = target.slice();
  source.forEach((item, index) => {
    if (typeof destination[index] === "undefined") {
      destination[index] = options.cloneUnlessOtherwiseSpecified(item, options);
    } else if (options.isMergeableObject(item)) {
      destination[index] = merge(target[index], item, options);
    } else if (target.indexOf(item) === -1) {
      destination.push(item);
    }
  });
  return destination;
};

const getTransactionSchema = (
  schemaId = "https://trust.propdata.org.uk/schemas/v2/pdtf-transaction.json",
  overlay = "baspiV4"
) => {
  const sourceSchema = transactionSchemas[schemaId];
  const overlaySchema = overlays[overlay];
  if (!overlaySchema) return sourceSchema;
  const mergedSchema = merge(overlaySchema, sourceSchema, {
    arrayMerge: combineMerge,
  });
  // console.log("mergedSchema", mergedSchema);
  return mergedSchema;
};

const getValidator = (schemaId, overlay = "baspiV4") => {
  let validator = ajv.getSchema(schemaId);
  if (!validator) {
    const schema = getTransactionSchema(schemaId, overlay);
    ajv.addSchema(schema, schemaId);
    validator = ajv.getSchema(schemaId);
  }
  return validator;
};

// common functions for v1 and v2
const getSubschema = (path, schemaId, overlay) => {
  const sourceSchema = getTransactionSchema(schemaId, overlay);
  const pathArray = path.split("/").slice(1);
  if (pathArray.length < 1) return sourceSchema;
  return pathArray.reduce((schema, pathElement) => {
    const { type, items, properties, oneOf } = schema;
    if (type === "array") return items;
    if (properties?.[pathElement]) return properties[pathElement];
    if (oneOf) {
      let matchingProperty;
      oneOf.forEach((aOneOf) => {
        if (aOneOf.type === "array" && !Number.isNaN(pathElement)) {
          matchingProperty = aOneOf.items;
        } else if (aOneOf.properties?.[pathElement]) {
          matchingProperty = aOneOf.properties?.[pathElement];
        }
      });
      if (matchingProperty) return matchingProperty;
    }
    return undefined;
  }, sourceSchema);
};

const isPathValid = (path, schemaId, overlay) => {
  const schema = getTransactionSchema(schemaId, overlay);
  try {
    return getSubschema(path, schemaId, overlay) !== undefined;
  } catch (err) {
    return false;
  }
};

const getSubschemaValidator = (path, schemaId, overlay) => {
  const subSchema = getSubschema(path, schemaId, overlay);
  // see if we can retrieve the schema by path
  const cacheKey = `${path}-${schemaId}`;
  let validator = ajv.getSchema(cacheKey);
  // retrieve whole schema by $id if available
  if (!validator && subSchema.$id) validator = ajv.getSchema(cacheKey);
  if (!validator) {
    ajv.addSchema(subSchema, cacheKey);
    validator = ajv.getSchema(cacheKey);
  }
  return validator;
};

// v1, deprecated
const getTitleAtPath = (schema, path, rootPath = path) => {
  if (path === "") path = "/";
  let pathArray = path.split("/").slice(1);
  if (pathArray.length === 1 && pathArray[0] === "") {
    if (schema.title) return schema.title;
    if (schema.title === "") return ""; // deliberately blank
    // no 'title' property present, so we use the property name to create a readable descriptor
    const propertyName = rootPath
      .split("/")
      .pop()
      .replace(/([A-Z])/g, " $1")
      .toLowerCase()
      .trim();
    return propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
  }
  const propertyName = pathArray.shift();
  const subPath = "/" + pathArray.join("/");
  let subSchema = schema.properties
    ? schema.properties[propertyName]
    : undefined;
  if (subSchema) {
    return getTitleAtPath(subSchema, subPath, rootPath);
  }
  if (schema.type === "array") {
    subSchema = schema.items;
    return getTitleAtPath(subSchema, subPath, rootPath);
  }
  const discriminator = schema.discriminator?.propertyName;
  if (discriminator) {
    // only single dependency discriminator, oneOf keyword is supported
    const oneOfs = schema.oneOf;
    const matchingOneOf = oneOfs.find(
      (oneOf) => oneOf["properties"][propertyName]
    );
    if (matchingOneOf)
      return getTitleAtPath(
        matchingOneOf["properties"][propertyName],
        subPath,
        rootPath
      );
  }
};

const validateVerifiedClaims = (verifiedClaims) => {
  const validatorVClaims = ajv.compile(verifiedClaimsSchema);

  const validationErrorsArr = [];
  const vClaimSchValidation = validatorVClaims({
    verified_claims: verifiedClaims,
  });

  if (!vClaimSchValidation) {
    validationErrorsArr.push(validatorVClaims.errors);
  }

  const verifiedClaimsArray = Array.isArray(verifiedClaims)
    ? verifiedClaims
    : [verifiedClaims];

  verifiedClaimsArray.forEach((claim) => {
    const paths = Object.keys(claim.claims);

    for (const path of paths) {
      const validPath = isPathValid(path);
      if (validPath) {
        const subValidator = getSubschemaValidator(path);
        const isValid = subValidator(claim.claims[path]);
        if (!isValid) {
          validationErrorsArr.push(...subValidator.errors);
        }
      } else {
        validationErrorsArr.push(
          `Path ${path} is not a valid PDTF schema path`
        );
      }
    }
  });

  return validationErrorsArr;
};

module.exports = {
  ajv,
  transactionSchema, // v1 deprecated
  validator, // v1 deprecated
  getTransactionSchema,
  getValidator,
  getSubschema,
  isPathValid,
  getSubschemaValidator,
  getTitleAtPath,
  verifiedClaimsSchema,
  validateVerifiedClaims,
};
