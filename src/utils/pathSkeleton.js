const fs = require("fs");
const traverse = require("traverse");

const combinedSchema = require("../schemas/v3/combined.json");

// Extract fields that have overlay-specific properties
const extractFields = [
  "baspi4", "baspi5", "nts", "nts2", "ntsl", "ntsl2",
  "ta6", "ta7", "ta10", "lpe1", "fme1", "piq",
  "con29R", "con29DW", "llc1", "rds", "oc1", "sr24",
];

// Delete properties we don't want in the skeleton
const deleteProperties = (sourceSchema, propertyNames) => {
  traverse(sourceSchema).forEach(function (element) {
    if (propertyNames.includes(this.key)) {
      this.delete(true);
    }
  });
  return sourceSchema;
};

// Collect all paths in path notation
const collectPaths = (schema, currentPath = "") => {
  const paths = [];
  
  if (!schema || typeof schema !== 'object') {
    return paths;
  }
  
  // Handle arrays
  if (schema.type === "array" && schema.items) {
    const arrayPath = currentPath + "[]";
    paths.push(arrayPath);
    // Continue with items
    const itemPaths = collectPaths(schema.items, arrayPath);
    paths.push(...itemPaths);
    return paths;
  }
  
  // Handle primitives - add type suffix
  if (schema.type && !schema.properties && !schema.oneOf && !schema.items) {
    let typeChar = "";
    switch(schema.type) {
      case "string": typeChar = ":s"; break;
      case "number": typeChar = ":n"; break;
      case "integer": typeChar = ":i"; break;
      case "boolean": typeChar = ":b"; break;
      default: typeChar = "";
    }
    if (currentPath) {
      paths.push(currentPath + typeChar);
    }
    return paths;
  }
  
  // Handle objects with properties
  if (schema.properties) {
    // If this is an object without a path yet, don't add it
    if (currentPath && !schema.type?.includes("array")) {
      paths.push(currentPath);
    }
    
    Object.keys(schema.properties).forEach((propName) => {
      const newPath = currentPath ? `${currentPath}.${propName}` : propName;
      const propPaths = collectPaths(schema.properties[propName], newPath);
      paths.push(...propPaths);
    });
  }
  
  // Handle oneOf - collect all possible properties
  if (schema.oneOf) {
    const variantProps = new Set();
    schema.oneOf.forEach((oneOfSchema) => {
      if (oneOfSchema.properties) {
        Object.keys(oneOfSchema.properties).forEach((propName) => {
          variantProps.add(propName);
        });
      }
    });
    
    // Process each unique property
    variantProps.forEach((propName) => {
      const newPath = currentPath ? `${currentPath}.${propName}` : propName;
      // Check if all variants have the same type
      let commonType = null;
      let isVariant = false;
      
      schema.oneOf.forEach((oneOfSchema) => {
        if (oneOfSchema.properties && oneOfSchema.properties[propName]) {
          const propType = oneOfSchema.properties[propName].type;
          if (commonType === null) {
            commonType = propType;
          } else if (commonType !== propType) {
            isVariant = true;
          }
        }
      });
      
      if (isVariant || !commonType) {
        paths.push(newPath + ":v"); // variant
      } else {
        // Process the first variant's version of this property
        for (const oneOfSchema of schema.oneOf) {
          if (oneOfSchema.properties && oneOfSchema.properties[propName]) {
            const propPaths = collectPaths(oneOfSchema.properties[propName], newPath);
            paths.push(...propPaths);
            break;
          }
        }
      }
    });
  }
  
  // Empty objects
  if (currentPath && !schema.properties && !schema.oneOf && !schema.items && !schema.type) {
    paths.push(currentPath);
  }
  
  return paths;
};

// Remove duplicates
const deduplicatePaths = (paths) => {
  return [...new Set(paths)];
};

// Sort paths for readability
const sortPaths = (paths) => {
  return paths.sort((a, b) => {
    // Sort by depth first (fewer dots = higher up)
    const depthA = (a.match(/\./g) || []).length;
    const depthB = (b.match(/\./g) || []).length;
    if (depthA !== depthB) return depthA - depthB;
    
    // Then alphabetically
    return a.localeCompare(b);
  });
};

// Create clean schema
const coreSchema = deleteProperties(JSON.parse(JSON.stringify(combinedSchema)), [
  "discriminator",
  ...extractFields.map((item) => `${item}Ref`),
  ...extractFields.map((item) => `${item}Required`),
  ...extractFields.map((item) => `${item}Title`),
  ...extractFields.map((item) => `${item}Description`),
  ...extractFields.map((item) => `${item}Enum`),
]);

// Remove metadata
const skeletonSchema = deleteProperties(coreSchema, [
  "$schema", "$id", "title", "description", "required",
  "enum", "minItems", "minLength", "format", "minimum", "maximum",
]);

// Collect paths
const allPaths = collectPaths(skeletonSchema);
const uniquePaths = deduplicatePaths(allPaths);
const sortedPaths = sortPaths(uniquePaths);

// Write as text file
const pathContent = sortedPaths.join('\n');
fs.writeFileSync("../schemas/v3/pathSkeleton.txt", pathContent);

// Also create a JSON version for comparison
fs.writeFileSync("../schemas/v3/pathSkeleton.json", JSON.stringify(sortedPaths, null, 2));

console.log(`Path skeleton written to ../schemas/v3/pathSkeleton.txt`);
console.log(`Total paths: ${sortedPaths.length}`);
console.log(`Text size: ${pathContent.length} bytes`);

// Count tokens
try {
  const GPT3Encoder = require('gpt-3-encoder');
  const encoded = GPT3Encoder.encode(pathContent);
  console.log(`Tokens (GPT-3): ${encoded.length}`);
  console.log(`Reduction: ${((1 - encoded.length / 78734) * 100).toFixed(1)}% fewer tokens than JSON skeleton`);
} catch (e) {
  console.log(`Estimated tokens: ~${Math.ceil(pathContent.length / 4)}`);
}