const { dereference } = require("@jdw/jst");
const traverse = require("traverse");
const jp = require("jsonpointer");
const fs = require("fs");

const pdtfTransaction = require("../schemas/v1/pdtf-transaction.json");
const materialFacts = require("../schemas/v1/material-facts.json");
const legalInformation = require("../schemas/v1/legal-information.json");
const energyPerformanceCertificate = require("../schemas/v1/energy-performance-certificate.json");
const titleDeed = require("../schemas/v1/title-deed.json");
const searches = require("../schemas/v1/searches.json");
const localLandCharges = require("../schemas/v1/searches/local-land-charges.json");
const localSearchesRequired = require("../schemas/v1/searches/local-searches-required.json");
const drainageAndWater = require("../schemas/v1/searches/drainage-and-water.json");
const geoJson = require("../schemas/v1/GeoJSON.json");

const extractOverlay = (sourceSchema, propertyNames) => {
  const returnSchema = {};
  traverse(sourceSchema).forEach(function (element) {
    const path = "/" + this.path.join("/");
    if (propertyNames.includes(this.key)) {
      jp.set(returnSchema, path, element);
    }
  });
  return returnSchema;
};

const deleteProperties = (sourceSchema, propertyNames) => {
  traverse(sourceSchema).forEach(function (element) {
    if (propertyNames.includes(this.key)) {
      this.delete(true); // true = stop here
    }
  });
  return sourceSchema;
};

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

const originalSchema = dereference(pdtfTransaction, (id) => subSchemas[id]);

const extractions = {
  baspi: [
    "baspiRef",
    "title",
    "description",
    "enum",
    "required",
    "discriminator",
    "oneOf",
  ],
  nts: ["ntsRef", "title", "description", "enum"],
  ta6: ["TA6Ref", "title", "enum"],
  ta7: ["TA7Ref", "title", "enum"],
  rds: ["RDSRef"],
  lpe1: ["lpe1Ref"],
  con29R: ["con29RRef"],
  con29DW: ["con29DWRef"],
  llc1: ["llc1Ref"],
};

let fieldsExtracted = [];
Object.entries(extractions).forEach(([key, value]) => {
  const overlay = extractOverlay(originalSchema, value);
  fs.writeFileSync(
    `../schemas/v2/overlays/${key}.json`,
    JSON.stringify(overlay, null, 2)
  );
  fieldsExtracted = [...fieldsExtracted, ...value];
});

fieldsExtracted = [...new Set(fieldsExtracted)]; // remove duplicates
const coreSchema = deleteProperties(originalSchema, fieldsExtracted);
fs.writeFileSync(
  "../schemas/v2/core.json",
  JSON.stringify(coreSchema, null, 2)
);
