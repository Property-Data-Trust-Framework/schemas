const fs = require("fs");

// Read the current skeleton
const skeleton = require("../schemas/v3/skeleton.json");

// Convert to ultra-compact format
const toCompact = (obj, indent = "") => {
  if (typeof obj === "string") {
    // Type indicators
    if (["string", "number", "integer", "boolean", "variant"].includes(obj)) {
      return obj[0]; // Just first letter: s, n, i, b, v
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    // Array with content
    const inner = toCompact(obj[0], indent + "  ");
    if (typeof inner === "string" && inner.length === 1) {
      return `[${inner}]`; // Simple array like [s]
    }
    return `[\n${indent}  ${inner}\n${indent}]`;
  }
  
  if (obj && typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 0) return "{}";
    
    // Check if it's a simple object with only type indicators
    const allSimple = keys.every(k => 
      typeof obj[k] === "string" && 
      ["s", "n", "i", "b", "v"].includes(toCompact(obj[k]))
    );
    
    if (allSimple && keys.length < 5) {
      // Inline format: {a:s b:n c:s}
      return `{${keys.map(k => `${k}:${toCompact(obj[k])}`).join(" ")}}`;
    }
    
    // Multi-line format
    const lines = keys.map(k => {
      const val = toCompact(obj[k], indent + "  ");
      if (typeof val === "string" && val.length === 1) {
        return `${indent}  ${k}:${val}`;
      } else if (typeof val === "string" && (val === "{}" || val === "[]")) {
        return `${indent}  ${k}${val}`;
      } else if (typeof val === "string" && val.startsWith("{") && val.endsWith("}")) {
        return `${indent}  ${k}${val}`;
      } else if (typeof val === "string" && val.startsWith("[") && !val.includes("\n")) {
        return `${indent}  ${k}${val}`;
      } else {
        return `${indent}  ${k}:\n${indent}  ${val}`;
      }
    });
    
    return `{\n${lines.join("\n")}\n${indent}}`;
  }
  
  return String(obj);
};

// Generate ultra-compact version
const compact = toCompact(skeleton);

// Write compact version
fs.writeFileSync("../schemas/v3/compactSkeleton.txt", compact);

console.log("Compact skeleton written to ../schemas/v3/compactSkeleton.txt");
console.log(`Size: ${compact.length} bytes`);

// Count tokens
try {
  const GPT3Encoder = require('gpt-3-encoder');
  const encoded = GPT3Encoder.encode(compact);
  console.log(`Tokens (GPT-3): ${encoded.length}`);
  console.log(`Reduction: ${((1 - encoded.length / 78734) * 100).toFixed(1)}% fewer tokens than JSON skeleton`);
  
  // Show sample
  console.log("\nFirst 500 chars:");
  console.log(compact.substring(0, 500));
} catch (e) {
  console.log(`Estimated tokens: ~${Math.ceil(compact.length / 4)}`);
}