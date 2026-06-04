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

// Enhanced caching structure for subschemas and validators
const schemaCache = new Map();

// Cache performance tracking
const cacheStats = {
  hits: 0,
  misses: 0,
  totalQueries: 0,
  cacheStartTime: Date.now(),
};

const verifiedClaimsSchema = require("./src/schemas/verifiedClaims/pdtf-verified-claims.json");
const v2CoreSchema = require("./src/schemas/v2/pdtf-transaction.json");
const v3CoreSchema = require("./src/schemas/v3/pdtf-transaction.json");

// Extension overlays for v3
const extensionOverlays = {
  // Specialist Issues Extensions
  as: require("./src/schemas/v3/overlays/extensions/as.json"),
  dr: require("./src/schemas/v3/overlays/extensions/dr.json"),
  jk: require("./src/schemas/v3/overlays/extensions/jk.json"),
  sb: require("./src/schemas/v3/overlays/extensions/sb.json"),
  hs: require("./src/schemas/v3/overlays/extensions/hs.json"),

  // Property Features Extensions
  oa: require("./src/schemas/v3/overlays/extensions/oa.json"),
  la: require("./src/schemas/v3/overlays/extensions/la.json"),
  sf: require("./src/schemas/v3/overlays/extensions/sf.json"),
  mc: require("./src/schemas/v3/overlays/extensions/mc.json"),

  // Ownership & Financial Extensions
  er: require("./src/schemas/v3/overlays/extensions/er.json"),
  ma: require("./src/schemas/v3/overlays/extensions/ma.json"),
  tf: require("./src/schemas/v3/overlays/extensions/tf.json"),

  // Utilities & Services Extensions
  sl: require("./src/schemas/v3/overlays/extensions/sl.json"),
  hi: require("./src/schemas/v3/overlays/extensions/hi.json"),
  fd: require("./src/schemas/v3/overlays/extensions/fd.json"),

  // Transaction Extensions
  oc: require("./src/schemas/v3/overlays/extensions/oc.json"),

  // SEF25 Extensions
  sc: require("./src/schemas/v3/overlays/extensions/sc.json"),
  pc: require("./src/schemas/v3/overlays/extensions/pc.json"),
  ph: require("./src/schemas/v3/overlays/extensions/ph.json"),
  dk: require("./src/schemas/v3/overlays/extensions/dk.json"),
  rw: require("./src/schemas/v3/overlays/extensions/rw.json"),
  sd: require("./src/schemas/v3/overlays/extensions/sd.json"),
  lc: require("./src/schemas/v3/overlays/extensions/lc.json"),
  wg: require("./src/schemas/v3/overlays/extensions/wg.json"),
  ic: require("./src/schemas/v3/overlays/extensions/ic.json"),
  nd: require("./src/schemas/v3/overlays/extensions/nd.json"),
  mi: require("./src/schemas/v3/overlays/extensions/mi.json"),
  tr: require("./src/schemas/v3/overlays/extensions/tr.json"),
  ac: require("./src/schemas/v3/overlays/extensions/ac.json"),

  // Compatibility Extensions
  ta: require("./src/schemas/v3/overlays/extensions/ta.json"),
};

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
    ta6ed6: require("./src/schemas/v3/overlays/ta6ed6.json"),
    ta7ed3: require("./src/schemas/v3/overlays/ta7.json"),
    ta7ed5: require("./src/schemas/v3/overlays/ta7ed5.json"),
    ta10ed3: require("./src/schemas/v3/overlays/ta10.json"),
    lpe1ed4: require("./src/schemas/v3/overlays/lpe1.json"),
    fme1ed2: require("./src/schemas/v3/overlays/fme1.json"),
    llc1v2: require("./src/schemas/v3/overlays/llc1.json"),
    nts2023: require("./src/schemas/v3/overlays/nts.json"),
    ntsl2023: require("./src/schemas/v3/overlays/ntsl.json"),
    nts2025: require("./src/schemas/v3/overlays/nts2.json"),
    ntsl2025: require("./src/schemas/v3/overlays/ntsl2.json"),
    con29R2019: require("./src/schemas/v3/overlays/con29R.json"),
    con29DW: require("./src/schemas/v3/overlays/con29DW.json"),
    rdsV333: require("./src/schemas/v3/overlays/rds.json"),
    oc1v21: require("./src/schemas/v3/overlays/oc1.json"),
    piqV3: require("./src/schemas/v3/overlays/piq.json"),
    sr24: require("./src/schemas/v3/overlays/sr24.json"),
    // Include extension overlays for v3
    ...extensionOverlays,
    null: {},
  },
};

const transactionSchemas = {
  "https://trust.propdata.org.uk/schemas/v2/pdtf-transaction.json":
    v2CoreSchema,
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json":
    v3CoreSchema,
};

// Custom array merge function for oneOf arrays
const arrayMerge = (target, source, options) => {
  // For string arrays (enum, required, etc.)
  if (
    target.length > 0 &&
    source.length > 0 &&
    target[0] &&
    typeof target[0] === "string" &&
    source[0] &&
    typeof source[0] === "string"
  ) {
    // Detect if this is a required array by checking the parent key
    // Required arrays are property names (camelCase, no spaces)
    // Enum arrays are values (can contain spaces, capitals, etc.)
    const isRequiredArray =
      target.every(
        (item) =>
          typeof item === "string" &&
          item.length > 0 &&
          // Required field names are typically camelCase without spaces
          !item.includes(" ") &&
          // First character is usually lowercase for field names
          (item[0] === item[0].toLowerCase() ||
            item.startsWith("is") ||
            item.startsWith("has")),
      ) &&
      source.every(
        (item) =>
          typeof item === "string" &&
          item.length > 0 &&
          !item.includes(" ") &&
          (item[0] === item[0].toLowerCase() ||
            item.startsWith("is") ||
            item.startsWith("has")),
      );

    if (isRequiredArray) {
      // Combine required arrays
      const combined = [...target];
      source.forEach((item) => {
        if (!combined.includes(item)) {
          combined.push(item);
        }
      });
      return combined;
    }

    // For other string arrays (like enum), replace with source
    return source.length > 0 ? source : target;
  }

  // If target is empty but source has values, use source
  if (target.length === 0 && source.length > 0) {
    return source;
  }

  // Ensure we only process arrays of the same length
  // If source is shorter, pad with nulls
  // If source is longer, truncate to target length
  const paddedSource = [...source];
  while (paddedSource.length < target.length) {
    paddedSource.push(null);
  }
  paddedSource.splice(target.length);

  return target.map((item, index) => {
    if (paddedSource[index] === null || paddedSource[index] === undefined) {
      return item;
    }
    if (item === null || item === undefined) {
      return paddedSource[index];
    }
    // Recursively merge nested objects and arrays
    return merge(item, paddedSource[index], { arrayMerge });
  });
};

const getTransactionSchema = (
  schemaId = "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json",
  overlays,
) => {
  const sourceSchema = transactionSchemas[schemaId];
  if (!overlays || overlays.length < 1) return sourceSchema;

  let mergedSchema = JSON.parse(JSON.stringify(sourceSchema)); // Deep copy
  overlays.forEach((overlay) => {
    const overlaySchema = JSON.parse(
      JSON.stringify(overlaysMap[schemaId][overlay] || {}),
    ); // Deep copy
    mergedSchema = merge(mergedSchema, overlaySchema, { arrayMerge });
  });

  return mergedSchema;
};

// Add helper function to generate cache key
const generateOverlayKey = (overlays) => {
  if (!overlays) return "";
  return overlays.join(".");
};

// Enhanced caching function that stores both subschemas and validators
const getCachedSchemaData = (path, schemaId, overlays) => {
  const overlayKey = generateOverlayKey(overlays);
  const cacheKey = `${path}-${schemaId}-${overlayKey}`;

  cacheStats.totalQueries++;
  let cached = schemaCache.get(cacheKey);
  if (!cached) {
    cacheStats.misses++;
    // Compute subschema using the original logic
    const sourceSchema = getTransactionSchema(schemaId, overlays);
    const pathArray = path.split("/").slice(1);
    let subSchema = sourceSchema;

    if (pathArray.length >= 1) {
      subSchema = pathArray.reduce((schema, pathElement) => {
        if (!schema) return undefined;
        const { type, items, properties, patternProperties, oneOf } = schema;

        // Check array type
        if (type === "array") return items;

        // Check explicit properties first
        if (properties?.[pathElement]) return properties[pathElement];

        // Check patternProperties
        if (patternProperties) {
          for (const pattern in patternProperties) {
            try {
              const regex = new RegExp(pattern);
              if (regex.test(pathElement)) {
                return patternProperties[pattern];
              }
            } catch (e) {
              // Invalid regex pattern in schema - skip it
              console.warn(
                `Invalid regex pattern in patternProperties: ${pattern}`,
                e,
              );
            }
          }
        }

        // Check oneOf discriminators (recursively for nested oneOf)
        if (oneOf) {
          const findInOneOf = (branches) => {
            let arrayFallback;
            for (const branch of branches) {
              if (!branch) continue;
              // Track array matches as fallback (prefer property matches)
              if (
                branch.type === "array" &&
                !Number.isNaN(pathElement) &&
                !arrayFallback
              ) {
                arrayFallback = branch.items;
              }
              if (branch.properties?.[pathElement]) {
                return branch.properties[pathElement];
              }
              if (branch.patternProperties) {
                for (const pattern in branch.patternProperties) {
                  try {
                    const regex = new RegExp(pattern);
                    if (regex.test(pathElement)) {
                      return branch.patternProperties[pattern];
                    }
                  } catch (e) {
                    // Invalid regex pattern - skip
                  }
                }
              }
              // Recurse into nested oneOf branches
              if (branch.oneOf) {
                const nested = findInOneOf(branch.oneOf);
                if (nested) return nested;
              }
            }
            return arrayFallback;
          };
          const matchingProperty = findInOneOf(oneOf);
          if (matchingProperty) return matchingProperty;
        }

        return undefined;
      }, sourceSchema);
    }

    // Add schema to AJV and get validator
    // Only add valid schemas to AJV
    let validator;
    if (subSchema && typeof subSchema === "object") {
      // Check if schema already exists in AJV to avoid duplicates
      validator = ajv.getSchema(cacheKey);
      if (!validator) {
        ajv.addSchema(subSchema, cacheKey);
        validator = ajv.getSchema(cacheKey);
      }
    } else {
      // For invalid paths, create a validator that always fails
      validator = () => false;
      validator.errors = [`Invalid path: schema is ${subSchema}`];
    }

    cached = {
      subSchema,
      validator,
      cacheKey,
      createdAt: Date.now(),
    };
    schemaCache.set(cacheKey, cached);
  } else {
    cacheStats.hits++;
  }

  return cached;
};

const getValidator = (schemaId, overlays) => {
  return getSubschemaValidator("", schemaId, overlays);
};

// common functions for v1 and v2 - now with caching
const getSubschema = (path, schemaId, overlays) => {
  const cached = getCachedSchemaData(path, schemaId, overlays);
  return cached.subSchema;
};

const isPathValid = (path, schemaId, overlays) => {
  try {
    return getSubschema(path, schemaId, overlays) !== undefined;
  } catch (err) {
    return false;
  }
};

const getSubschemaValidator = (path, schemaId, overlays) => {
  const cached = getCachedSchemaData(path, schemaId, overlays);
  return cached.validator;
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
      (oneOf) => oneOf["properties"][propertyName],
    );
    if (matchingOneOf)
      return getTitleAtPath(
        matchingOneOf["properties"][propertyName],
        subPath,
        rootPath,
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
          `Path ${path} is not a valid PDTF schema path`,
        );
      }
    }
  });

  return validationErrorsArr;
};

// Cache management functions
const getCacheStats = () => {
  const runtime = Date.now() - cacheStats.cacheStartTime;
  const hitRate =
    cacheStats.totalQueries > 0
      ? (cacheStats.hits / cacheStats.totalQueries) * 100
      : 0;

  return {
    totalEntries: schemaCache.size,
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    totalQueries: cacheStats.totalQueries,
    hitRate: parseFloat(hitRate.toFixed(2)),
    runtimeMs: runtime,
    cacheKeys: Array.from(schemaCache.keys()),
    memoryUsage: {
      entriesCount: schemaCache.size,
      // Rough estimate of memory usage per entry
      estimatedSizeKB: Math.round(((schemaCache.size * 2) / 1024) * 100) / 100, // Rough estimate
    },
  };
};

const getDetailedCacheStats = () => {
  const baseStats = getCacheStats();
  const entries = Array.from(schemaCache.entries()).map(([key, value]) => ({
    key,
    createdAt: value.createdAt,
    age: Date.now() - value.createdAt,
    hasValidator: typeof value.validator === "function",
    hasSubSchema: value.subSchema !== undefined,
  }));

  return {
    ...baseStats,
    entries: entries.sort((a, b) => b.createdAt - a.createdAt), // Most recent first
    oldestEntry:
      entries.length > 0 ? Math.max(...entries.map((e) => e.age)) : 0,
    newestEntry:
      entries.length > 0 ? Math.min(...entries.map((e) => e.age)) : 0,
  };
};

const clearSchemaCache = (pattern) => {
  if (pattern) {
    // Clear entries matching pattern
    const keysToDelete = [];
    schemaCache.forEach((value, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => schemaCache.delete(key));

    // Also remove matching schemas from AJV
    keysToDelete.forEach((key) => {
      try {
        ajv.removeSchema(key);
      } catch (e) {
        // Schema might not exist in AJV, ignore
      }
    });

    return keysToDelete.length;
  } else {
    // Clear all cache
    const entriesCleared = schemaCache.size;
    schemaCache.clear();
    // Reset stats
    cacheStats.hits = 0;
    cacheStats.misses = 0;
    cacheStats.totalQueries = 0;
    cacheStats.cacheStartTime = Date.now();

    // Also clear AJV's internal cache to prevent duplicates
    ajv.removeSchema();

    return entriesCleared;
  }
};

const warmupCache = (
  paths,
  schemaId = "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json",
  overlaysList = [],
) => {
  const warmupStats = {
    totalAttempted: 0,
    successful: 0,
    failed: 0,
    errors: [],
  };

  // Default common paths if none provided
  const defaultPaths = [
    "/propertyPack",
    "/participants",
    "/status",
    "/propertyPack/surveys",
    "/propertyPack/valuations",
    "/propertyPack/waterAndDrainage",
    "/propertyPack/ownership",
    "/propertyPack/notices",
  ];

  // Default common overlays if none provided
  const defaultOverlays = [
    [],
    ["baspiV5"],
    ["ta6ed4"],
    ["nts2023"],
    ["baspiV5", "ta6ed4"],
  ];

  const pathsToWarm = paths || defaultPaths;
  const overlaysToWarm =
    overlaysList.length > 0 ? overlaysList : defaultOverlays;

  pathsToWarm.forEach((path) => {
    overlaysToWarm.forEach((overlays) => {
      warmupStats.totalAttempted++;
      try {
        // This will populate the cache
        getSubschema(path, schemaId, overlays);
        getSubschemaValidator(path, schemaId, overlays);
        warmupStats.successful++;
      } catch (error) {
        warmupStats.failed++;
        warmupStats.errors.push({
          path,
          overlays,
          error: error.message,
        });
      }
    });
  });

  return warmupStats;
};

const pruneCacheByAge = (maxAgeMs) => {
  const now = Date.now();
  const keysToDelete = [];

  schemaCache.forEach((value, key) => {
    if (now - value.createdAt > maxAgeMs) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => {
    schemaCache.delete(key);
    try {
      ajv.removeSchema(key);
    } catch (e) {
      // Schema might not exist in AJV, ignore
    }
  });

  return keysToDelete.length;
};

const setCacheMaxSize = (maxSize) => {
  if (schemaCache.size <= maxSize) return 0;

  // Get entries sorted by creation time (oldest first)
  const entries = Array.from(schemaCache.entries()).sort(
    (a, b) => a[1].createdAt - b[1].createdAt,
  );

  const toRemove = schemaCache.size - maxSize;
  const keysToDelete = entries.slice(0, toRemove).map(([key]) => key);

  keysToDelete.forEach((key) => {
    schemaCache.delete(key);
    try {
      ajv.removeSchema(key);
    } catch (e) {
      // Schema might not exist in AJV, ignore
    }
  });

  return keysToDelete.length;
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
  extensionOverlays,
  // Enhanced cache management functions
  getCacheStats,
  getDetailedCacheStats,
  clearSchemaCache,
  warmupCache,
  pruneCacheByAge,
  setCacheMaxSize,
};
