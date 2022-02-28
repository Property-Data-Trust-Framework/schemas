import { dereference } from "@jdw/jst";
import Ajv from "ajv";
import addFormats from "ajv-formats";

import propertyPack from "./src/schemas/property-pack.json";
import baspiMaterialFacts from "./src/schemas/baspi-a-material-facts.json";
import baspiLegalInformation from "./src/schemas/baspi-b-legal-information.json";
import energyPerformanceCertificate from "./src/schemas/energy-performance-certificate.json";
import titleDeed from "./src/schemas/title-deed.json";
import geoJson from "./src/schemas/GeoJSON.json";
import pdtfClaim from "./src/schemas/pdtf-claim.json";
import verifiedClaim from "./src/schemas/verified_claims-12.json";

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

export const propertyPackSchema = dereference(
  propertyPack,
  (id) => subSchemas[id]
);

const ajv = new Ajv({
  allErrors: true,
  strictSchema: false
});
// Adds date formats among other types to the validator.
addFormats(ajv);

export const validator = ajv.compile(propertyPackSchema);

export const getSubschema = (path) => {
  const pathArray = path.split("/").slice(1);
  if (pathArray.length < 1) {
    return schema;
  }
  return pathArray.reduce((propertyPackSchema, pathElement) => {
    return propertyPackSchema["properties"][pathElement];
  }, propertyPackSchema);
};

export const getSubschemaValidator = (path) => {
  return ajv.getSchema(path) || ajv.compile(getSubschema(path));
};

export { verifiedClaim };
export { pdtfClaim };
