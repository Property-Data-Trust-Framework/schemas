const fs = require('fs');

// Try to use tiktoken or a similar library
// For Claude/Anthropic models, we can estimate using the cl100k_base encoding
// which is similar to what Claude uses

// First, let's check what's available
try {
  // Option 1: Use gpt-tokenizer (common npm package)
  const { encode } = require('gpt-tokenizer');
  
  const content = fs.readFileSync('../schemas/v3/skeleton.json', 'utf8');
  const tokens = encode(content);
  
  console.log(`Using gpt-tokenizer:`);
  console.log(`Total tokens: ${tokens.length}`);
  console.log(`File size: ${content.length} characters`);
  console.log(`Ratio: ${(content.length / tokens.length).toFixed(2)} characters per token`);
  
} catch (e1) {
  console.log("gpt-tokenizer not found, trying gpt-3-encoder...");
  
  try {
    // Option 2: Use gpt-3-encoder
    const GPT3Encoder = require('gpt-3-encoder');
    
    const content = fs.readFileSync('../schemas/v3/skeleton.json', 'utf8');
    const encoded = GPT3Encoder.encode(content);
    
    console.log(`Using gpt-3-encoder:`);
    console.log(`Total tokens: ${encoded.length}`);
    console.log(`File size: ${content.length} characters`);
    console.log(`Ratio: ${(content.length / encoded.length).toFixed(2)} characters per token`);
    
  } catch (e2) {
    console.log("No tokenizer library found. Falling back to estimation...");
    
    // Option 3: Manual estimation
    const content = fs.readFileSync('../schemas/v3/skeleton.json', 'utf8');
    
    // Count different types of content for better estimation
    const lines = content.split('\n');
    const words = content.split(/\s+/);
    const punctuation = content.match(/[{}:,\[\]"]/g) || [];
    
    // Rough estimation:
    // - JSON structure tokens (brackets, colons, quotes): ~1 token each
    // - Words: ~1 token each
    // - Whitespace: usually absorbed into adjacent tokens
    
    const structureTokens = punctuation.length;
    const wordTokens = words.length;
    const estimatedTokens = Math.ceil((structureTokens + wordTokens) * 0.75); // 0.75 factor for overlap
    
    console.log("Manual estimation:");
    console.log(`File size: ${content.length} characters`);
    console.log(`Lines: ${lines.length}`);
    console.log(`Words: ${words.length}`);
    console.log(`JSON punctuation: ${punctuation.length}`);
    console.log(`Estimated tokens: ~${estimatedTokens}`);
    console.log(`Ratio: ${(content.length / estimatedTokens).toFixed(2)} characters per token`);
    
    // Also do a simple character-based estimation
    const simpleEstimate = Math.ceil(content.length / 4);
    console.log(`\nSimple estimation (chars/4): ~${simpleEstimate} tokens`);
  }
}