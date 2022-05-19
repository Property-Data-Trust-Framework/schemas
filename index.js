const { dereference } = require("@jdw/jst");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const pdtfTransaction = require("./src/schemas/pdtf-transaction.json");
const baspiMaterialFacts = require("./src/schemas/baspi-a-material-facts.json");
const baspiLegalInformation = require("./src/schemas/baspi-b-legal-information.json");
const energyPerformanceCertificate = require("./src/schemas/energy-performance-certificate.json");
const titleDeed = require("./src/schemas/title-deed.json");
const geoJson = require("./src/schemas/GeoJSON.json");
const verifiedClaimsSchema = require("./src/schemas/pdtf-verified-claims.json");

const subSchemas = {
  "https://raw.githubusercontent.com/Property-Data-Trust-Framework/schemas/master/src/schemas/baspi-a-material-facts.json":
    baspiMaterialFacts,
  "https://raw.githubusercontent.com/Property-Data-Trust-Framework/schemas/master/src/schemas/baspi-b-legal-information.json":
    baspiLegalInformation,
  "https://raw.githubusercontent.com/Property-Data-Trust-Framework/schemas/master/src/schemas/energy-performance-certificate.json":
    energyPerformanceCertificate,
  "https://geojson.org/schema/GeoJSON.json": geoJson,
  "https://raw.githubusercontent.com/Property-Data-Trust-Framework/schemas/master/src/schemas/title-deed.json":
    titleDeed,
};

const transactionSchema = dereference(pdtfTransaction, (id) => subSchemas[id]);

const ajv = new Ajv({
  allErrors: true,
  // schema contains additional baspiRef and RDSRef metadata which is not strictly valid
  strictSchema: false,
});
// Adds date formats among other types to the validator.
addFormats(ajv);

const validator = ajv.compile(transactionSchema);

const getSubschema = (path) => {
  const pathArray = path.split("/").slice(1);
  if (pathArray.length < 1) {
    return transactionSchema;
  }
  return pathArray.reduce((schema, pathElement) => {
    if (schema.type === "array") return schema.items;
    if (schema.properties[pathElement]) return schema.properties[pathElement];
    const dependencies = schema.dependencies;
    if (dependencies) {
      // only single dependency discriminator, oneOf keyword is supported
      const dependencyDiscriminator = Object.keys(dependencies)[0];
      const oneOfs = dependencies[dependencyDiscriminator].oneOf;
      const matchingOneOf = oneOfs.find(
        (oneOf) => oneOf["properties"][pathElement]
      );
      if (matchingOneOf) return matchingOneOf["properties"][pathElement];
    }
    return undefined;
  }, transactionSchema);
};

const isPathValid = (path) => {
  try {
    return getSubschema(path) !== undefined;
  } catch (err) {
    return false;
  }
};

const getSubschemaValidator = (path) => {
  const subSchema = getSubschema(path);
  let validator = ajv.getSchema(path);
  if (!validator && subSchema.$id) validator = ajv.getSchema(subSchema.$id);
  if (!validator) {
    ajv.addSchema(subSchema, path);
    validator = ajv.getSchema(path);
  }
  return validator;
};

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
  const dependencies = schema.dependencies;
  if (dependencies) {
    // only single dependency discriminator, oneOf keyword is supported
    const dependencyDiscriminator = Object.keys(dependencies)[0];
    const oneOfs = dependencies[dependencyDiscriminator].oneOf;
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

const validateVerifiedClaims = (verifiedClaimsArray) => {

const validatorVClaims = ajv.compile(verifiedClaimsSchema);

  const validationErrorsArr = [];
  const vClaimSchValidation = validatorVClaims({
    verified_claims: verifiedClaimsArray,
  });

  if (!vClaimSchValidation) {
    validationErrorsArr.push(validatorVClaims.errors);
  }

  verifiedClaimsArray.forEach((claim) => {
    const [path] = Object.keys(claim.claims);

    const validPath = isPathValid(path);
    if (validPath) {
      const subValidator = getSubschemaValidator(path);
      const isValid = subValidator(claim.claims[path]);
      if (!isValid) {
        validationErrorsArr.push(...subValidator.errors);
      }
    } else {
      validationErrorsArr.push(`Path ${path} is not a valid PDTF schema path`);
    }
  });

  return validationErrorsArr;
};


module.exports = {
  transactionSchema,
  validator,
  getSubschema,
  isPathValid,
  getSubschemaValidator,
  getTitleAtPath,
  verifiedClaimsSchema,
  validateVerifiedClaims
};
