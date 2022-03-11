const { dereference } = require("@jdw/jst");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const propertyPack = require("./src/schemas/property-pack.json");
const baspiMaterialFacts = require("./src/schemas/baspi-a-material-facts.json");
const baspiLegalInformation = require("./src/schemas/baspi-b-legal-information.json");
const energyPerformanceCertificate = require("./src/schemas/energy-performance-certificate.json");
const titleDeed = require("./src/schemas/title-deed.json");
const geoJson = require("./src/schemas/GeoJSON.json");
const verifiedClaimsSchema = require("./src/schemas/pdtf-verified-claims.json");

const subSchemas = {
  "https://homebuyingandsellinggroup.co.uk/schemas/baspi-a-material-facts.json":
    baspiMaterialFacts,
  "https://homebuyingandsellinggroup.co.uk/schemas/baspi-b-legal-information.json":
    baspiLegalInformation,
  "https://homebuyingandsellinggroup.co.uk/schemas/energy-performance-certificate.json":
    energyPerformanceCertificate,
  "https://geojson.org/schema/GeoJSON.json": geoJson,
  "https://homebuyingandsellinggroup.co.uk/schemas/title-deed.json": titleDeed
};

const propertyPackSchema = dereference(propertyPack, (id) => subSchemas[id]);

const ajv = new Ajv({
  allErrors: true,
  // schema contains additional baspiRef and RDSRef metadata which is not strictly valid
  strictSchema: false
});
// Adds date formats among other types to the validator.
addFormats(ajv);

const validator = ajv.compile(propertyPackSchema);

const getSubschema = (path) => {
  const pathArray = path.split("/").slice(1);
  if (pathArray.length < 1) {
    return schema;
  }
  return pathArray.reduce((propertyPackSchema, pathElement) => {
    return propertyPackSchema.properties[pathElement];
  }, propertyPackSchema);
};

const getSubschemaValidator = (path) => {
  return ajv.getSchema(path) || ajv.compile(getSubschema(path));
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

module.exports = {
  propertyPackSchema,
  validator,
  getSubschema,
  getSubschemaValidator,
  getTitleAtPath,
  verifiedClaimsSchema
};
