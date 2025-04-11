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
    baspiV4: require("./src/schemas/v3/overlays/baspi4.json"),
    baspiV5: require("./src/schemas/v3/overlays/baspi5.json"),
    ta6ed4: require("./src/schemas/v3/overlays/ta6.json"),
    ta7ed3: require("./src/schemas/v3/overlays/ta7.json"),
    ta10ed3: require("./src/schemas/v3/overlays/ta10.json"),
    lpe1ed4: require("./src/schemas/v3/overlays/lpe1.json"),
    fme1ed2: require("./src/schemas/v3/overlays/fme1.json"),
    llc1v2: require("./src/schemas/v3/overlays/llc1.json"),
    nts2023: require("./src/schemas/v3/overlays/nts.json"),
    sef24: require("./src/schemas/v3/overlays/nts-sef.json"),
    ntsl2023: require("./src/schemas/v3/overlays/ntsl.json"),
    con29R2019: require("./src/schemas/v3/overlays/con29R.json"),
    con29DW: require("./src/schemas/v3/overlays/con29DW.json"),
    rdsV333: require("./src/schemas/v3/overlays/rds.json"),
    oc1v21: require("./src/schemas/v3/overlays/oc1.json"),
    piqV3: require("./src/schemas/v3/overlays/piq.json"),
    sr24: require("./src/schemas/v3/overlays/sr24.json"),
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
  // Special handling for 'required' arrays - combine them uniquely
  if (target.some((item) => typeof item === "string")) {
    return [...new Set([...target, ...source])];
  }

  // For other arrays, concatenate while preserving uniqueness for primitive values
  if (!options.isMergeableObject(target[0])) {
    return [...new Set([...target, ...source])];
  }

  // Special handling for oneOf arrays - merge matching schemas based on discriminator
  if (target[0]?.properties && source[0]?.properties) {
    // Find a common discriminator property (a property with an enum)
    const findDiscriminator = (schema) => {
      const props = schema.properties;
      return Object.keys(props).find((key) => Array.isArray(props[key]?.enum));
    };

    const discriminator = findDiscriminator(target[0]);
    if (discriminator) {
      return target.map((targetSchema) => {
        const targetEnum = targetSchema.properties?.[discriminator]?.enum || [];
        const matchingSourceSchema = source.find((sourceSchema) => {
          const sourceEnum =
            sourceSchema.properties?.[discriminator]?.enum || [];
          // Check if there's any overlap between the enum values
          return sourceEnum.some((value) => targetEnum.includes(value));
        });
        if (matchingSourceSchema) {
          return merge(targetSchema, matchingSourceSchema, options);
        }
        return targetSchema;
      });
    }
  }

  // For arrays of objects, merge by index and append remaining items
  const destination = target.slice();
  source.forEach((item, index) => {
    if (typeof destination[index] === "undefined") {
      destination[index] = options.cloneUnlessOtherwiseSpecified(item, options);
    } else if (options.isMergeableObject(item)) {
      destination[index] = merge(target[index], item, options);
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
    // Handle both string keys and direct overlay objects
    const overlaySchema =
      typeof overlay === "string"
        ? overlaysMap[schemaId][overlay] || {}
        : overlay;

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

// Add helper function to generate cache key
const generateOverlayKey = (overlays) => {
  if (!overlays) return "";
  return overlays
    .map((overlay) => {
      if (typeof overlay === "string") return overlay;
      // Generate a simple hash of the object for caching
      return JSON.stringify(overlay)
        .split("")
        .reduce((hash, char) => {
          return ((hash << 5) - hash + char.charCodeAt(0)) | 0;
        }, 0)
        .toString(36);
    })
    .join(".");
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
  const overlayKey = generateOverlayKey(overlays);
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
