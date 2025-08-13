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
  "nts2",
  "ntsl",
  "ntsl2",
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
  "sr24",
];

const flattenSkeleton = (schema) => {
  if (!schema) return undefined;
  
  // Handle arrays - mark with special notation
  if (schema.type === "array" && schema.items) {
    const itemSchema = flattenSkeleton(schema.items);
    // Use array notation to indicate this is an array
    return [itemSchema];
  }
  
  // Handle primitives - return type indicator
  if (schema.type && !schema.properties && !schema.oneOf && !schema.items) {
    // Return a type indicator for primitive types
    if (schema.type === "string") return "string";
    if (schema.type === "number") return "number";
    if (schema.type === "integer") return "integer";
    if (schema.type === "boolean") return "boolean";
    if (schema.type === "null") return "null";
  }
  
  let returnStructure = {};
  
  // Handle object properties
  if (schema.properties) {
    Object.keys(schema.properties).forEach((key) => {
      returnStructure[key] = flattenSkeleton(schema.properties[key]);
    });
  }
  
  // Handle oneOf - merge all possible properties
  if (schema.oneOf) {
    schema.oneOf.forEach((aOneOf) => {
      if (aOneOf.properties) {
        Object.entries(aOneOf.properties).forEach(([key, value]) => {
          // If property already exists and differs, mark as variant
          const newValue = flattenSkeleton(value);
          if (returnStructure[key] && JSON.stringify(returnStructure[key]) !== JSON.stringify(newValue)) {
            // For primitive types, just mark as variant type
            if (typeof returnStructure[key] === "string" || typeof newValue === "string") {
              returnStructure[key] = "variant";
            } else {
              // For complex types, merge properties
              returnStructure[key] = { ...returnStructure[key], ...newValue, _variants: true };
            }
          } else {
            returnStructure[key] = newValue;
          }
        });
      }
    });
  }
  
  // Return empty object for objects without properties
  return Object.keys(returnStructure).length > 0 ? returnStructure : {};
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

// Generate compact skeleton format for better token efficiency
const toCompact = (obj, indent = "") => {
  if (typeof obj === "string") {
    // Skip type indicators entirely
    return "";
  }
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    // Array with content
    const inner = toCompact(obj[0], indent);
    if (inner === "") {
      return "[]"; // Array of primitives
    }
    return `[\n${inner}\n${indent}]`;
  }
  
  if (obj && typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 0) return "";
    
    // Process each key
    const lines = [];
    keys.forEach(k => {
      const val = toCompact(obj[k], indent + "  ");
      
      if (val === "") {
        // Leaf node - just show the property name
        lines.push(`${indent}  ${k}`);
      } else if (val === "[]") {
        // Array property
        lines.push(`${indent}  ${k}[]`);
      } else if (val.startsWith("[")) {
        // Array with nested content - simple concatenation
        lines.push(`${indent}  ${k}${val}`);
      } else {
        // Object property - show name on its own line, content below
        lines.push(`${indent}  ${k}`);
        lines.push(val);
      }
    });
    
    return lines.length > 0 ? lines.join("\n") : "";
  }
  
  return "";
};

// Since toCompact returns lines without wrapping braces, add them for the root
const innerContent = toCompact(skeletonSchemaFlattened, "");
const compactSkeleton = innerContent ? innerContent : "";

fs.writeFileSync(
  "../schemas/v3/compactSkeleton.txt",
  compactSkeleton
);
console.log("Compact Skeleton written to ../schemas/v3/compactSkeleton.txt");
