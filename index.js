const { dereference } = require("@jdw/jst");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const propertyPack = require("./src/schemas/property-pack.json");
const baspiMaterialFacts = require("./src/schemas/baspi-a-material-facts.json");
const baspiLegalInformation = require("./src/schemas/baspi-b-legal-information.json");
const energyPerformanceCertificate = require("./src/schemas/energy-performance-certificate.json");
const titleDeed = require("./src/schemas/title-deed.json");
const geoJson = require("./src/schemas/GeoJSON.json");
const pdtfClaim = require("./src/schemas/pdtf-claim.json");
const verifiedClaim = require("./src/schemas/verified_claims-12.json");

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
    return propertyPackSchema["properties"][pathElement];
  }, propertyPackSchema);
};

const getSubschemaValidator = (path) => {
  return ajv.getSchema(path) || ajv.compile(getSubschema(path));
};

module.exports = {
  propertyPackSchema,
  validator,
  getSubschema,
  getSubschemaValidator,
  pdtfClaim,
  verifiedClaim
};
