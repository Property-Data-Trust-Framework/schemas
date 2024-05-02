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

const verifiedClaimsSchema = require("./src/schemas/verifiedClaims/pdtf-verified-claims.json");
const v2CoreSchema = require("./src/schemas/v2/pdtf-transaction.json");
const v3CoreSchema = require("./src/schemas/v3/pdtf-transaction.json");

const overlaysMap = {
  "https://trust.propdata.org.uk/schemas/v2/pdtf-transaction.json": {
    baspiV4: require("./src/schemas/v2/overlays/baspi.json"),
    ta6ed4: require("./src/schemas/v2/overlays/ta6.json"),
    ta7ed3: require("./src/schemas/v2/overlays/ta7.json"),
    ta10ed3: require("./src/schemas/v2/overlays/ta10.json"),
    lpe1ed4: require("./src/schemas/v2/overlays/lpe1.json"),
    fme1ed2: require("./src/schemas/v2/overlays/fme1.json"),
    llc1v2: require("./src/schemas/v2/overlays/llc1.json"),
    nts2023: require("./src/schemas/v2/overlays/nts.json"),
    con29R2019: require("./src/schemas/v2/overlays/con29R.json"),
    con29DW: require("./src/schemas/v2/overlays/con29DW.json"),
    rdsV333: require("./src/schemas/v2/overlays/rds.json"),
    oc1v21: require("./src/schemas/v2/overlays/oc1.json"),
    piqV3: require("./src/schemas/v2/overlays/piq.json"),
    null: {},
  },
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json": {
    baspiV4: require("./src/schemas/v3/overlays/baspi.json"),
    ta6ed4: require("./src/schemas/v3/overlays/ta6.json"),
    ta7ed3: require("./src/schemas/v3/overlays/ta7.json"),
    ta10ed3: require("./src/schemas/v3/overlays/ta10.json"),
    lpe1ed4: require("./src/schemas/v3/overlays/lpe1.json"),
    fme1ed2: require("./src/schemas/v3/overlays/fme1.json"),
    llc1v2: require("./src/schemas/v3/overlays/llc1.json"),
    nts2023: require("./src/schemas/v3/overlays/nts.json"),
    ntsl2023: require("./src/schemas/v3/overlays/ntsl.json"),
    con29R2019: require("./src/schemas/v3/overlays/con29R.json"),
    con29DW: require("./src/schemas/v3/overlays/con29DW.json"),
    rdsV333: require("./src/schemas/v3/overlays/rds.json"),
    oc1v21: require("./src/schemas/v3/overlays/oc1.json"),
    piqV3: require("./src/schemas/v3/overlays/piq.json"),
    null: {},
  },
};

const transactionSchemas = {
  "https://trust.propdata.org.uk/schemas/v2/pdtf-transaction.json":
    v2CoreSchema,
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json":
    v3CoreSchema,
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

const mergeEnums = (target, source) => source;

const getTransactionSchema = (
  schemaId = "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json",
  overlays // = ["baspiV4"]
) => {
  const sourceSchema = transactionSchemas[schemaId];
  if (!overlays || overlays.length < 1) return sourceSchema;
  let mergedSchema = sourceSchema;
  overlays.forEach((overlay) => {
    const overlaySchema = overlaysMap[schemaId][overlay] || {};
    mergedSchema = merge(mergedSchema, overlaySchema, {
      customMerge: (key) => {
        if (key === "enum") {
          return mergeEnums;
        }
      },
      arrayMerge: combineMerge,
    });
  });
  return mergedSchema;
};

const getValidator = (schemaId, overlays) => {
  return getSubschemaValidator("", schemaId, overlays);
};

// common functions for v1 and v2
const getSubschema = (path, schemaId, overlays) => {
  const sourceSchema = getTransactionSchema(schemaId, overlays);
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

const isPathValid = (path, schemaId, overlays) => {
  try {
    return getSubschema(path, schemaId, overlays) !== undefined;
  } catch (err) {
    return false;
  }
};

const getSubschemaValidator = (path, schemaId, overlays) => {
  const subSchema = getSubschema(path, schemaId, overlays);
  const overlayKey = (overlays || []).join(".");
  // see if we can retrieve the schema by path, schemaId and overlays
  const cacheKey = `${path}-${schemaId}-${overlayKey}`;
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
  const oneOfs = schema.oneOf;
  if (oneOfs) {
    // only single dependency discriminator, oneOf keyword is supported
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

const validateVerifiedClaims = (verifiedClaims, schemaId, overlays) => {
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
      const validPath = isPathValid(path, schemaId, overlays);
      if (validPath) {
        const subValidator = getSubschemaValidator(path, schemaId, overlays);
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
  getTransactionSchema,
  getValidator,
  getSubschema,
  isPathValid,
  getSubschemaValidator,
  getTitleAtPath,
  verifiedClaimsSchema,
  validateVerifiedClaims,
  overlaysMap,
};
