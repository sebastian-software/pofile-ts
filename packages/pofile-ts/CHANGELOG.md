# Changelog

## [3.6.0](///compare/v3.5.1...v3.6.0) (2025-12-15)

### Features

- **plurals:** CLDR 48 compliant plural rules 1e7d7cc

### Bug Fixes

- css fix 78104e7
- eslint issues c6dbf67
- resolve TypeScript errors in CLDR test file 2b36c80

### Documentation

- add bundle size badges and tree-shaking documentation 9e0fc8b
- expand README with better marketing copy 2676012
- move performance metrics to Parse/Serialize features 963146e
- update content 1c3aa22

## [3.5.1](///compare/v3.5.0...v3.5.1) (2025-12-15)

## [3.5.0](///compare/v3.4.2...v3.5.0) (2025-12-15)

### Features

- **pofile-ts:** add getPluralSamples and parsePluralFormsHeader 30c4dfc
- **pofile-ts:** add splitMultilineComments helper 3f56274
- **pofile-ts:** export new utilities from index f07c2b2

### Bug Fixes

- **pofile-ts:** remove non-null assertions from tests b2111e8

### Documentation

- add benchmark system profile to performance tables dcbf1ee
- document new plural utilities and comment helper d599b50

## [3.4.2](///compare/v3.4.1...v3.4.2) (2025-12-13)

## [3.4.1](///compare/v3.4.0...v3.4.1) (2025-12-13)

## [3.4.0](///compare/v3.3.1...v3.4.0) (2025-12-13)

### Features

- improve robustness for partial/incomplete input 328af72

## [3.3.1](///compare/v3.3.0...v3.3.1) (2025-12-12)

### Bug Fixes

- add non-null assertions in icu tests 93bb0f3
- avoid non-null assertions in icu tests c829be9

## [3.3.0](///compare/v3.2.0...v3.3.0) (2025-12-12)

### Features

- add catalog conversion helpers bfd30c7
- add CLDR plural categories and Gettext to ICU conversion aade2bd
- add createDefaultHeaders and formatPoDate helpers f1e6bc6
- add expandOctothorpe option for better TMS readability 1c030ba
- add message ID generation utilities 1cc9b6c
- add reference parsing and formatting utilities 3fffae8
- **docs:** add fumadocs-typescript for auto-generated type tables 8330699
- use 8-char Base64URL for message IDs d4e8c1e

### Bug Fixes

- add explicit slug for Codecov 428e5bc
- add logo to repo and add Codecov token support d7e0b89
- copy assets to pofile-ts subfolder for GitHub Pages 9085195
- correct GitHub Pages upload path ffbb090
- move static assets to correct path for GitHub Pages efc40ca
- remove basePath for correct GitHub Pages deployment 5b1d29b
- restore base path for correct asset URLs b3eebdb
- **tests:** normalize line endings for Windows compatibility 639b5a1

### Performance

- optimize hot paths in new helper functions 968e852
- optimize plural serialization e98fcb8

### Refactoring

- code cleanup and eliminate magic numbers 38b6a45
- migrate to monorepo structure with Fumadocs 49d5b37
- replace eval with native plural functions 2598919

### Documentation

- add i18n workflow helpers to README and homepage 4c89519
- add logo and fix documentation link e6ed5fc
- add PO format documentation and update benchmarks 320ace9
- clarify no normalization between plural formats 97dcec0
- clarify Unicode MessageFormat v1 vs 2.0 db73b07
- fix bold claim and update MF2 link to ICU docs b296649
- redesign logo with gradients and document icon 78263fe
- simplify README and fix broken links d4d4e75
- split into multiple pages with sidebar navigation f9852a8
- update benchmarks and document new ICU features 32b70c5

## [3.2.0](///compare/v3.1.0...v3.2.0) (2025-12-11)

### Features

- add benchmark comparing pofile-ts with pofile and gettext-parser e5f7d9d
- add Lucide SVG icons for README feature lists fb2ce5e, closes #22d3ee
- use Lucide SVG icons on homepage, add credits 0da991a

### Bug Fixes

- added note on po file format cee734e
- change browser badge to green for positive connotation cabea12
- corrected repo url 9c25228
- improve homepage card hover and table layout 527367d
- resolve eslint errors from performance optimizations ed53975
- simplify performance table, remove visual bars 31ac8be
- use unicode blocks instead of emojis in perf table 033c585

### Performance Improvements

- add fast-path for simple strings and optimize line folding 63c0fe4
- first-char dispatch and inline plural-index extraction 0f8da57
- optimize extractString with indexOf and fast-path unescape 775d540
- optimize parser with pre-compiled regex and native methods 5137298
- optimize serialization with fast-path escape and loop improvements c771394
- replace regex with startsWith and inline obsolete check 203fe43

## [3.1.0](///compare/v3.0.0...v3.1.0) (2025-12-10)

### Features

- add SerializeOptions for Crowdin-compatible output format dfd63ca

### Bug Fixes

- updated logos 2a50307

## [3.0.0](///compare/v2.2.1...v3.0.0) (2025-12-09)

### ⚠ BREAKING CHANGES

- The API has been completely redesigned to use pure functions instead of classes.

* Remove PO and Item classes
* Add parsePo(), stringifyPo(), createPoFile() functions
* Add createItem(), stringifyItem() functions
* Export PoFile and PoItem as interfaces instead of classes
* Remove default export (named exports only)
* Update all tests to use new functional API
* Update README with new API and migration guide
* Update docs/index.html with new examples

Migration:
import PO from 'pofile-ts' → import { parsePo, stringifyPo } from 'pofile-ts'
PO.parse(content) → parsePo(content)
po.toString() → stringifyPo(po)
new PO() → createPoFile()
new Item() → createItem()

### Code Refactoring

- replace class-based API with functional exports af268d7

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
