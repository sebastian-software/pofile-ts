# Changelog

## [2.2.1](///compare/v2.2.0...v2.2.1) (2025-12-09)

## [2.2.0](///compare/v2.1.0...v2.2.0) (2025-12-09)

### Features

- remove load() and save() methods for browser compatibility 5217fe7

## [2.1.0](///compare/v2.0.3...v2.1.0) (2025-12-09)

### Features

- add Node.js 20 support f480eeb

## [2.0.3](///compare/v2.0.2...v2.0.3) (2025-12-09)

### Bug Fixes

- use separate type declarations for ESM and CJS exports 34a76de

## [2.0.2](///compare/v2.0.1...v2.0.2) (2025-12-09)

### Bug Fixes

- switch to Vite build with dual ESM/CJS output 2417e09

## [2.0.1](///compare/v2.0.0...v2.0.1) (2025-12-09)

## 2.0.0 (2025-12-09)

### ⚠ BREAKING CHANGES

- - Minimum Node.js version is now 22

* PO.load() now returns Promise<PO> instead of using callbacks
* po.save() now returns Promise<void> instead of using callbacks

Benefits:

- Uses fs/promises for cleaner async code
- Simpler API with async/await
- Better error handling with try/catch

### Features

- added release helper 7bcda45
- require Node.js 22+, modernize to async/await API 14c6db2

### Bug Fixes

- correct PO.ts filename case and add missing type annotations 11cfa01
- version bump ad45041
