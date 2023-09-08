const { dereference } = require("@jdw/jst");
const traverse = require("traverse");
const jp = require("jsonpointer");
const fs = require("fs");
const merge = require("deepmerge");

const combinedSchema = require("../schemas/v2/combined.json");

const extractFields = [
  "baspi",
  "nts",
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

const overlayIncludeProperties = [
  "title",
  "description",
  "enum",
  "discriminator",
  "minItems",
];

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

const flattenSkeleton = (schema) => {
  if (!schema) return undefined;
  // console.log(schema.properties);
  let returnStructure = {};
  if (schema.properties) {
    Object.keys(schema.properties).forEach((key) => {
      returnStructure[key] = flattenSkeleton(schema.properties[key]);
    });
  }
  if (schema.oneOf) {
    schema.oneOf.forEach((aOneOf) => {
      // console.log(aOneOf);
      if (aOneOf.properties) {
        Object.entries(aOneOf.properties).forEach(([key, value]) => {
          // console.log(aProperty);
          returnStructure[key] = flattenSkeleton(value);
        });
      }
    });
  }
  if (schema.anyOf) {
    schema.anyOf.forEach((aAnyOf) => {
      if (aAnyOf.properties) {
        Object.entries(aAnyOf.properties).forEach(([key, value]) => {
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
    $id: `https://trust.propdata.org.uk/schemas/v2/overlays/${ref}.json`,
  };
  traverse(sourceSchema).forEach(function (element) {
    let path = "/" + this.path.join("/");
    if (path === "/") path = "";
    if (element[refName]) {
      jp.set(returnSchema, `${path}/${refName}`, element[refName]);
      overlayIncludeProperties.forEach((property) => {
        if (element[property]) {
          jp.set(returnSchema, `${path}/${property}`, element[property]);
        }
      });

      const { discriminator } = element;
      if (discriminator) {
        const { propertyName } = discriminator;
        element.oneOf.forEach((item, index) => {
          const discriminatorProperty = item.properties[propertyName];
          // copy const discriminator as-is
          if (discriminatorProperty.const) {
            jp.set(
              returnSchema,
              `${path}/oneOf/${index}/properties/${propertyName}/const`,
              discriminatorProperty.const
            );
          } else {
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
  let overlay = extractOverlay(combinedSchema, key, [
    "title",
    "description",
    "enum",
    "discriminator",
  ]);
  overlays[key] = overlay;
  const fileName = `../schemas/v2/overlays/${key}.json`;
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
  "../schemas/v2/pdtf-transaction.json",
  JSON.stringify(coreSchema, null, 2)
);
console.log("Core schema written to ../schemas/v2/pdtf-transaction.json");

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
  "../schemas/v2/skeleton.json",
  JSON.stringify(skeletonSchemaFlattened, null, 2)
);
console.log("Flat Skeleton schema written to ../schemas/v2/skeleton.json");
