const { dereference } = require("@jdw/jst");
const traverse = require("traverse");
const jp = require("jsonpointer");
const fs = require("fs");
const merge = require("deepmerge");

const combinedSchema = require("../schemas/v3/combined.json");

const extractFields = [
  "baspi4",
  "baspi5",
  "nts",
  "ntsl",
  "ta6",
  "ta7",
  "ta10",
  "lpe1",
  "fme1",
  "piq",
  "con29R",
  "con29DW",
  "llc1",
  "rds",
  "oc1",
];

const flattenSkeleton = (schema) => {
  if (!schema) return undefined;
  let returnStructure = {};
  if (schema.properties) {
    Object.keys(schema.properties).forEach((key) => {
      returnStructure[key] = flattenSkeleton(schema.properties[key]);
    });
  }
  if (schema.oneOf) {
    schema.oneOf.forEach((aOneOf) => {
      if (aOneOf.properties) {
        Object.entries(aOneOf.properties).forEach(([key, value]) => {
          returnStructure[key] = flattenSkeleton(value);
        });
      }
    });
  }
  if (schema.items) {
    returnStructure = flattenSkeleton(schema.items);
  }
  return returnStructure;
};

const extractOverlay = (sourceSchema, ref) => {
  const refName = `${ref}Ref`;
  const returnSchema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: `https://trust.propdata.org.uk/schemas/v3/overlays/${ref}.json`,
  };
  traverse(sourceSchema).forEach(function (element) {
    let path = "/" + this.path.join("/");
    if (path === "/") path = "";
    if (element[refName]) {
      jp.set(returnSchema, `${path}/${refName}`, element[refName]);

      if (element.discriminator) {
        jp.set(returnSchema, `${path}/discriminator`, element.discriminator);
        const { propertyName } = element.discriminator;
        element.oneOf.forEach((oneOf, index) => {
          const discriminatorProperty = oneOf.properties[propertyName];
          // must be an enum
          const discriminatorEnumPath = `${path}/oneOf/${index}/properties/${propertyName}/enum`;
          // if a refEnum use that
          const refEnum = `${ref}Enum`;
          if (discriminatorProperty[refEnum]) {
            jp.set(
              returnSchema,
              discriminatorEnumPath,
              discriminatorProperty[refEnum]
            );
          } else {
            // use the base enum
            jp.set(
              returnSchema,
              discriminatorEnumPath,
              discriminatorProperty.enum
            );
          }
        });
      }

      // also handle discriminator properties nested in items
      if (element.items?.discriminator) {
        jp.set(
          returnSchema,
          `${path}/items/discriminator`,
          element.items.discriminator
        );
        const { propertyName } = element.items.discriminator;
        element.items.oneOf.forEach((oneOf, index) => {
          const discriminatorProperty = oneOf.properties[propertyName];
          // must be an enum
          const discriminatorEnumPath = `${path}/items/oneOf/${index}/properties/${propertyName}/enum`;
          // if a refEnum use that
          const refEnum = `${ref}Enum`;
          if (discriminatorProperty[refEnum]) {
            jp.set(
              returnSchema,
              discriminatorEnumPath,
              discriminatorProperty[refEnum]
            );
          } else {
            // use the base enum
            jp.set(
              returnSchema,
              discriminatorEnumPath,
              discriminatorProperty.enum
            );
          }
        });
      }
    }

    const refRequired = `${ref}Required`;
    if (element[refRequired]) {
      jp.set(returnSchema, `${path}/required`, element[refRequired]);
    }

    const refTitle = `${ref}Title`;
    if (element[refTitle]) {
      jp.set(returnSchema, `${path}/title`, element[refTitle]);
    }

    const refDescription = `${ref}Description`;
    if (element[refDescription]) {
      jp.set(returnSchema, `${path}/description`, element[refDescription]);
    }

    const refEnum = `${ref}Enum`;
    if (element[refEnum]) {
      jp.set(returnSchema, `${path}/enum`, element[refEnum]);
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

const overlays = {};

extractFields.forEach((key) => {
  let overlay = extractOverlay(combinedSchema, key);
  overlays[key] = overlay;
  const fileName = `../schemas/v3/overlays/${key}.json`;
  fs.writeFileSync(fileName, JSON.stringify(overlay, null, 2));
  console.log(`Overlay ${key} written to ${fileName}`);
});

const coreSchema = deleteProperties(combinedSchema, [
  "discriminator",
  ...extractFields.map((item) => `${item}Ref`),
  ...extractFields.map((item) => `${item}Required`),
  ...extractFields.map((item) => `${item}Title`),
  ...extractFields.map((item) => `${item}Enum`),
]);

fs.writeFileSync(
  "../schemas/v3/pdtf-transaction.json",
  JSON.stringify(coreSchema, null, 2)
);
console.log("Core schema written to ../schemas/v3/pdtf-transaction.json");

const skeletonSchema = deleteProperties(coreSchema, [
  "$schema",
  "$id",
  "title",
  "description",
  "required",
  "enum",
  "minItems",
  "minLength",
  "format",
  "minimum",
  "maximum",
]);

const skeletonSchemaFlattened = flattenSkeleton(skeletonSchema);

fs.writeFileSync(
  "../schemas/v3/skeleton.json",
  JSON.stringify(skeletonSchemaFlattened, null, 2)
);
console.log("Flat Skeleton schema written to ../schemas/v3/skeleton.json");
