const { dereference } = require("@jdw/jst");
const traverse = require("traverse");
const jp = require("jsonpointer");
const fs = require("fs");
const path = require("path");
const merge = require("deepmerge");

const combinedPath =
  process.env.COMBINED_PATH ||
  path.resolve(__dirname, "../schemas/v3/combined.json");
const outputDir =
  process.env.OUTPUT_DIR ||
  path.resolve(__dirname, "../schemas/v3");

if (!fs.existsSync(combinedPath)) {
  throw new Error(`Combined schema not found: ${combinedPath}`);
}
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const combinedSchema = JSON.parse(fs.readFileSync(combinedPath, "utf8"));

const extractFields = [
  "baspi4",
  "baspi5",
  "nts",
  "nts2",
  "ntsl",
  "ntsl2",
  "ta6",
  "ta6ed6",
  "ta7",
  "ta7ed5",
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
  "sef25",
];

const metadataFields = [...extractFields, "ta6ed6Compat"];

const flattenSkeleton = (schema) => {
  if (!schema) return undefined;

  // Handle arrays - mark with special notation
  if (schema.type === "array" && schema.items) {
    const itemSchema = flattenSkeleton(schema.items);
    // Use array notation to indicate this is an array
    return [itemSchema];
  }

  // Handle patternProperties (dynamic keys like in offers and enquiries)
  if (schema.type === "object" && schema.patternProperties) {
    // Get the schema from the first pattern (usually ".*")
    const patternKeys = Object.keys(schema.patternProperties);
    if (patternKeys.length > 0) {
      const patternSchema = schema.patternProperties[patternKeys[0]];
      const itemSchema = flattenSkeleton(patternSchema);
      // Use {*: schema} notation to indicate this is a keyed object
      return { "*": itemSchema };
    }
  }

  // Handle primitives - return type indicator
  if (schema.type && !schema.properties && !schema.oneOf && !schema.items && !schema.patternProperties) {
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

  // Handle oneOf - merge all possible properties (recursively handles nested oneOf)
  if (schema.oneOf) {
    schema.oneOf.forEach((aOneOf) => {
      const variantResult = flattenSkeleton(aOneOf);
      if (variantResult && typeof variantResult === "object" && !Array.isArray(variantResult)) {
        Object.entries(variantResult).forEach(([key, value]) => {
          if (key === "_variants") return;
          if (returnStructure[key] && JSON.stringify(returnStructure[key]) !== JSON.stringify(value)) {
            if (typeof returnStructure[key] === "string" || typeof value === "string") {
              returnStructure[key] = "variant";
            } else {
              returnStructure[key] = { ...returnStructure[key], ...value, _variants: true };
            }
          } else {
            returnStructure[key] = value;
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
  const extendedTagMap = {
    Type: "type",
    MinLength: "minLength",
    MaxLength: "maxLength",
    Pattern: "pattern",
    Minimum: "minimum",
    Maximum: "maximum",
    MinItems: "minItems",
    MaxItems: "maxItems",
    UniqueItems: "uniqueItems",
    AdditionalProperties: "additionalProperties",
    Format: "format",
    MinProperties: "minProperties",
    MaxProperties: "maxProperties",
    MultipleOf: "multipleOf",
    Const: "const",
  };
  const returnSchema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: `https://trust.propdata.org.uk/schemas/v3/overlays/${ref}.json`,
  };
  traverse(sourceSchema).forEach(function (element) {
    let path = "/" + this.path.join("/");
    if (path === "/") path = "";
    if (element[refName]) {
      jp.set(returnSchema, `${path}/${refName}`, element[refName]);

      if (element.discriminator && Array.isArray(element.oneOf)) {
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
      if (element.items?.discriminator && Array.isArray(element.items.oneOf)) {
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

    const refConst = `${ref}Const`;
    if (Object.prototype.hasOwnProperty.call(element, refConst)) {
      jp.set(returnSchema, `${path}/const`, element[refConst]);
    }

    Object.entries(extendedTagMap).forEach(([suffix, schemaKey]) => {
      const tagKey = `${ref}${suffix}`;
      if (Object.prototype.hasOwnProperty.call(element, tagKey)) {
        jp.set(returnSchema, `${path}/${schemaKey}`, element[tagKey]);
      }
    });
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
const overlaysDir = path.join(outputDir, "overlays");
if (!fs.existsSync(overlaysDir)) {
  fs.mkdirSync(overlaysDir, { recursive: true });
}

extractFields.forEach((key) => {
  let overlay = extractOverlay(combinedSchema, key);
  overlays[key] = overlay;
  const fileName = path.join(overlaysDir, `${key}.json`);
  fs.writeFileSync(fileName, JSON.stringify(overlay, null, 2));
  console.log(`Overlay ${key} written to ${fileName}`);
});

const coreSchema = deleteProperties(combinedSchema, [
  "discriminator",
  ...metadataFields.map((item) => `${item}Ref`),
  ...metadataFields.map((item) => `${item}Required`),
  ...metadataFields.map((item) => `${item}Title`),
  ...metadataFields.map((item) => `${item}Description`),
  ...metadataFields.map((item) => `${item}Enum`),
  ...metadataFields.map((item) => `${item}Type`),
  ...metadataFields.map((item) => `${item}MinLength`),
  ...metadataFields.map((item) => `${item}MaxLength`),
  ...metadataFields.map((item) => `${item}Pattern`),
  ...metadataFields.map((item) => `${item}Minimum`),
  ...metadataFields.map((item) => `${item}Maximum`),
  ...metadataFields.map((item) => `${item}MinItems`),
  ...metadataFields.map((item) => `${item}MaxItems`),
  ...metadataFields.map((item) => `${item}UniqueItems`),
  ...metadataFields.map((item) => `${item}AdditionalProperties`),
  ...metadataFields.map((item) => `${item}Format`),
  ...metadataFields.map((item) => `${item}MinProperties`),
  ...metadataFields.map((item) => `${item}MaxProperties`),
  ...metadataFields.map((item) => `${item}MultipleOf`),
  ...metadataFields.map((item) => `${item}Const`),
]);

fs.writeFileSync(
  path.join(outputDir, "pdtf-transaction.json"),
  JSON.stringify(coreSchema, null, 2)
);
console.log(`Core schema written to ${path.join(outputDir, "pdtf-transaction.json")}`);

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
  path.join(outputDir, "skeleton.json"),
  JSON.stringify(skeletonSchemaFlattened, null, 2)
);
console.log(`Flat Skeleton schema written to ${path.join(outputDir, "skeleton.json")}`);

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

    // Check if this is a keyed object (has "*" key)
    if (keys.length === 1 && keys[0] === "*") {
      const inner = toCompact(obj["*"], indent);
      if (inner === "" || inner === "{*}") {
        return "{*}"; // Keyed object of primitives (or nested keyed objects with no structure)
      }
      return `{*}\n${inner}`;
    }

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
      } else if (val.startsWith("{*}")) {
        // Keyed object property - simple concatenation
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
  path.join(outputDir, "compactSkeleton.txt"),
  compactSkeleton
);
console.log(`Compact Skeleton written to ${path.join(outputDir, "compactSkeleton.txt")}`);
