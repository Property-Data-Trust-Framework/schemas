# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This repository contains the Property Data Trust Framework (PDTF) schemas - JSON Schema-based definitions for digital residential property data exchange in England and Wales. The framework enables frictionless exchange of property data between software products and services.

## Commands

### Testing
```bash
npm test          # Run all tests
npm test:watch    # Run tests in watch mode
```

### Development
```bash
npm install       # Install dependencies
```

## Architecture

### Schema System
The PDTF uses a flexible overlay system where a base transaction schema can be extended with form-specific overlays:

- **Base Schema**: Core transaction schema at `/src/schemas/v3/pdtf-transaction.json`
- **Overlays**: Form-specific extensions in `/src/schemas/v3/overlays/` (e.g., baspi5.json, ta6.json)
- **Merging**: Overlays are merged with the base schema using deepmerge with custom merge strategies

### Key Components

1. **index.js**: Main module exposing schema utilities
   - `getTransactionSchema(schemaId, overlays)`: Merges base schema with overlays
   - `getValidator(schemaId, overlays)`: Returns AJV validator for schema
   - `validateVerifiedClaims()`: Validates verified claims structure

2. **Schema Versions**: Currently on v3, with v2 still supported
   - Use `https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json` for v3

3. **Overlay System**: Supports multiple UK property forms
   - BASPI (v4 and v5)
   - Law Society TA forms (TA6, TA7, TA10)
   - NTS forms (2023 and 2025 versions)
   - CON29R, PIQ, RDS, and others

### Testing Approach
Tests in `/src/tests/` validate:
- Schema structure with different overlay combinations
- Path validation for nested properties
- Custom overlay merging
- Verified claims validation

Use existing test patterns when adding new tests.

## Important Notes

- Schema version is currently 3.4.0
- All schemas use JSON Schema Draft 07
- The repository publishes to npm as `@pdtf/schemas`
- Overlays may contain fields from licensed forms (BASPI, PIQ, Law Society) - ensure compliance when rendering data