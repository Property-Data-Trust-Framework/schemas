const fs = require("fs");

// Read the current skeleton
const skeleton = require("../schemas/v3/skeleton.json");

// Ultra-minimal format: use indentation only, no brackets
const toMinimal = (obj, prefix = "", isArrayItem = false) => {
  const lines = [];
  
  if (typeof obj === "string") {
    // Type indicators - single letter
    const typeMap = {
      "string": "s",
      "number": "n", 
      "integer": "i",
      "boolean": "b",
      "variant": "v"
    };
    return typeMap[obj] || obj;
  }
  
  if (Array.isArray(obj)) {
    lines.push(prefix + "[]");
    if (obj.length > 0) {
      const itemLines = toMinimal(obj[0], prefix + "  ", true);
      lines.push(...(Array.isArray(itemLines) ? itemLines : [itemLines]));
    }
    return lines;
  }
  
  if (obj && typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return prefix + "{}";
    }
    
    keys.forEach((key, index) => {
      const val = obj[key];
      const keyPrefix = prefix + key;
      
      if (typeof val === "string") {
        const type = toMinimal(val);
        lines.push(keyPrefix + ":" + type);
      } else if (Array.isArray(val)) {
        const arrLines = toMinimal(val, keyPrefix);
        lines.push(...arrLines);
      } else if (val && typeof val === "object" && Object.keys(val).length > 0) {
        lines.push(keyPrefix);
        const subLines = toMinimal(val, prefix + "  ");
        lines.push(...(Array.isArray(subLines) ? subLines : [subLines]));
      } else {
        lines.push(keyPrefix);
      }
    });
    
    return lines;
  }
  
  return prefix + String(obj);
};

// Generate minimal version
const minimalLines = toMinimal(skeleton);
const minimal = minimalLines.join("\n");

// Write minimal version
fs.writeFileSync("../schemas/v3/minimalSkeleton.txt", minimal);

console.log("Minimal skeleton written to ../schemas/v3/minimalSkeleton.txt");
console.log(`Size: ${minimal.length} bytes`);
console.log(`Lines: ${minimalLines.length}`);

// Count tokens
try {
  const GPT3Encoder = require('gpt-3-encoder');
  const encoded = GPT3Encoder.encode(minimal);
  console.log(`Tokens (GPT-3): ${encoded.length}`);
  console.log(`Reduction: ${((1 - encoded.length / 78734) * 100).toFixed(1)}% fewer tokens than JSON skeleton`);
  
  // Show sample
  console.log("\nFirst 20 lines:");
  console.log(minimalLines.slice(0, 20).join("\n"));
} catch (e) {
  console.log(`Estimated tokens: ~${Math.ceil(minimal.length / 4)}`);
}