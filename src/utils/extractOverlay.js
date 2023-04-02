const { dereference } = require("@jdw/jst");
const traverse = require("traverse");
const jp = require("jsonpointer");
const fs = require("fs");

const combinedSchema = require("../schemas/v2/combined.json");

const alwaysInclude = [
  // "properties",
  "yesNo",
  "details",
  "supplier",
  "dateToBeConnected",
  "line1",
  "line2",
  "town",
  "county",
  "postcode",
  "firstName",
  "lastName",
  "emailAddress",
  "nameOrOrganisation",
  "title",
  "description",
  "enum",
  "oneOf",
  "discriminator",
];

const extractFields = [
  "baspiRef",
  "ntsRef",
  "ta6Ref",
  "ta7Ref",
  "ta10Ref",
  "lawSocietyRef",
  "lpe1Ref",
  "con29RRef",
  "con29DWRef",
  "llc1Ref",
  "RDSRef",
];

const extractOverlay = (sourceSchema, refName, alsoInclude) => {
  const returnSchema = {};
  const includeProperties = [...alwaysInclude, ...alsoInclude];
  traverse(sourceSchema).forEach(function (element) {
    if (element[refName]) {
      const path = "/" + this.path.join("/");
      // console.log(`Found ${element[refName]} at ${path}`);
      // console.log(`element[refName] = ${element[refName]}`);
      jp.set(returnSchema, `${path}/${refName}`, element[refName]);
      includeProperties.forEach((property) => {
        if (element[property]) {
          // console.log(`Found ${property} at ${path}`);
          jp.set(returnSchema, `${path}/${property}`, element[property]);
        }
      });
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

const hoistOneOfs = (sourceSchema) => {
  traverse(sourceSchema).forEach(function (element) {
    // console.log(`element = ${element}`);
    newElement = JSON.parse(JSON.stringify(element));
    if (newElement.oneOf && newElement.discriminator) {
      const discriminatorPropertyName = newElement.discriminator.propertyName;
      let hoistedProperties = {};
      newElement.oneOf.forEach((item) => {
        oneOfProperties = item.properties;
        hoistedProperties = { ...hoistedProperties, ...oneOfProperties };
      });
      delete hoistedProperties[discriminatorPropertyName];
      newElement.properties = {
        ...element.properties,
        ...hoistedProperties,
      };
      delete newElement.oneOf;
      delete newElement.discriminator;
      this.update(newElement);
    }
  });
  return sourceSchema;
};

const hoistOneOfsAndPreserveRequired = (sourceSchema) => {
  traverse(sourceSchema).forEach(function (element) {
    newElement = JSON.parse(JSON.stringify(element));
    if (newElement.oneOf && newElement.discriminator) {
      const discriminatorPropertyName = newElement.discriminator.propertyName;
      console.log("hoisting", this.path.join("/"));
      let hoistedProperties = {};
      newElement.oneOf.forEach((item) => {
        oneOfProperties = item.properties;
        hoistedProperties = { ...hoistedProperties, ...oneOfProperties };
        itemPropertyKeys = Object.keys(item.properties);
        itemPropertyKeys.forEach((itemPropertyKey) => {
          if (itemPropertyKey !== discriminatorPropertyName) {
            delete oneOfProperties[itemPropertyKey];
          }
        });
      });
      delete hoistedProperties[discriminatorPropertyName];
      newElement.properties = {
        ...newElement.properties,
        ...hoistedProperties,
      };
      this.update(newElement);
    }
  });
  return sourceSchema;
};

let baspiOverlay = extractOverlay(combinedSchema, "baspiRef", [
  "title",
  "description",
  "enum",
  "required",
  "discriminator",
  "oneOf",
]);
// baspiOverlay = hoistOneOfsAndPreserveRequired(baspiOverlay);

fs.writeFileSync(
  "../schemas/v2/overlays/baspi.json",
  JSON.stringify(baspiOverlay, null, 2)
);
console.log(`BASPI written`);

// extractFields.forEach((key) => {
//   let overlay = extractOverlay(combinedSchema, key, [
//     "title",
//     "description",
//     "enum",
//   ]);
//   // overlay = hoistOneOfsAndPreserveRequired(overlay);
//   const fileName = `../schemas/v2/overlays/${key.slice(0, -3)}.json`; // remove Ref
//   fs.writeFileSync(fileName, JSON.stringify(overlay, null, 2));
//   console.log(`Overlay ${key} written to ${fileName}`);
// });

let coreSchema = hoistOneOfs(combinedSchema);

coreSchema = deleteProperties(coreSchema, [
  "title",
  "description",
  "enum",
  "required",
  "$schema",
  "$id",
  "baspiRef",
  ...extractFields,
]);

fs.writeFileSync(
  "../schemas/v2/core.json",
  JSON.stringify(coreSchema, null, 2)
);
console.log("Core schema written to ../schemas/v2/core.json");
