# Changelog

All notable changes to the "jrxml-viewer" extension will be documented in this file.

## [0.2.1] - 2026-08-30

### Added
- **Playwright E2E & Visual Evidence Suite**: Automated end-to-end testing pipeline with high-fidelity VS Code workbench harness, page canvas verification, SVG chart assertions, and automated screenshot generation.
- **Release Pipeline Version Gate**: CI/CD automated validation ensuring strict consistency between Git release tags (`v*.*.*`) and `package.json` version before packaging and publishing.

### Improved
- **VSIX Packaging Optimization**: Excluded internal development tools, testing scripts, screenshots, and linter configurations from the final distribution package for a cleaner, lightweight install footprint.
- **Release Workflow Automation**: Enhanced GitHub Actions release pipeline with explicit type checking, linting, test suite execution, and fail-fast Marketplace error reporting.

### Fixed
- Fixed release workflow packaging mismatch where manifest version did not match release tag.

## [0.2.0] - 2026-08-30

### Added
- **JRXML Document Model (AST)**: Strongly-typed intermediate representation covering all JasperReports entities (reports, bands, elements, styles, parameters, fields, variables, groups, boxes, and pens).
- **Geometric Layout Engine**: Multi-layer page layout pipeline (`BACKGROUND`, `CONTENT`, `FOOTER`, `OVERLAY`) supporting exact page dimensions (595x842), bottom-anchored page footers, recursive frame geometry, and isolated `noData` document states.
- **Layered Layout Renderer**: Pure rendering architecture completely decoupled from raw XML parsing.
- **Deterministic Structural Element IDs (`ElementId`)**: Unique, collision-free element addressing across arbitrary nesting depths and bands.
- **AST Mutation Engine & Atomic XML Persistence**: Safe round-trip XML persistence preserving expressions, comments, formatting, and element hierarchies without relying on regex.
- **Safe Expression Evaluation**: Pure lexical evaluator for JasperReports expressions (`$P{}`, `$F{}`, `$V{}`, concatenations, ternary expressions, date/number patterns) without arbitrary code execution.
- **Style Cascade & Resolution**: Multi-level style inheritance supporting `parentStyle`, cyclic dependency detection, box/pen merging, and element property overrides.
- **Preview Dataset & Aggregations**: Built-in synthetic dataset supporting group and report scope calculations (`Sum`, `Count`, `Average`).
- **Real SVG Chart Rendering**: Real-time vector SVG rendering for `barChart`, `pieChart`, and `lineChart` derived dynamically from dataset expressions, with axes, grid lines, trigonometric arcs, tooltips, and legends.
- **Styled Markup Processing**: Safe conversion of JasperReports styled text (`<style isBold="true"...>`, `<b>`, `<i>`, `<u>`, `<font>`) to secure HTML formatting.
- **Comprehensive Automated Test Suites**: 114 automated unit, layout, rendering, persistence, expression, style, visual, and chart tests with 100% pass rate.

### Changed
- Replaced legacy regex-based element update logic with AST-driven serialization.
- Replaced static chart placeholders with real, scalable SVG graphics.
- Replaced artificial band background color overlays with transparent containers for true report canvas fidelity.
- Updated marketplace metadata, documentation, and publishing workflows for the 0.2.0 milestone.

### Improved
- **Box & Pen Styling**: Full support for per-side borders (`topPen`, `bottomPen`, `leftPen`, `rightPen`) with line styles (`Solid`, `Dashed`, `Dotted`, `Double`) and `box-sizing: border-box`.
- **Typography & Biaxial Alignment**: Synchronized flexbox alignment matching JasperReports horizontal (`Left`, `Center`, `Right`, `Justified`) and vertical (`Top`, `Middle`, `Bottom`) alignment.
- **HTML Export**: Standalone HTML export embeds complete SVG vector graphics and formatted styles.
- **Properties & Explorer Synchronization**: Real-time element selection without canvas distortion.

### Fixed
- Fixed background band vertically displacing content bands on the canvas.
- Fixed raw XML entity and markup leaks in text elements and hover tooltips.
- Fixed hardcoded color and italic overrides affecting text fields.
- Fixed coordinate collision bugs when mutating elements sharing identical `(x, y)` positions.

## [0.1.9] - 2026-01-18

### Added
- **Interactive Editing (Preview)** - Initial support for editing report elements directly from the visual preview: drag & drop repositioning and properties panel edits (position, size, colors, font, expressions).

### Changed
- **Webview preview migrated to TypeScript** - `media/preview.ts` compiled to `media/preview.js` for better type-safety and maintainability.
- **Robust JRXML updates** - Improvements to host-side element persistence logic: parent-block replacement and safer write/verification flow.
- **Parser resilience** - `jrxmlParser` now handles namespace/prefixed jasperReport keys and nested band containers reliably.

### Fixed
- Fixed cases where updated elements were not persisted due to multi-line or reordered attributes in JRXML.
- Improved webview ↔ host messaging and refresh logic so the preview reflects saved changes immediately.

## [0.1.8] - 2026-01-12

### Added
- **Default View Setting** - New configuration option `jrxml-viewer.defaultView` to choose whether JRXML files open in visual preview or source code editor by default ([#1](https://github.com/YamiCueto/jrxml-viewer-extension/issues/1))
  - Options: `preview` (default) or `source`
  - Access via VS Code Settings → search "JRXML Viewer"

## [0.1.7] - 2026-01-05

### Changed
- **Activity Bar Icon** - Changed sidebar icon to VS Code's built-in preview icon

## [0.1.6] - 2026-01-05

### Changed
- **Activity Bar Icon** - Updated sidebar icon to use VS Code's built-in preview icon for better visual consistency with the editor theme

## [0.1.5] - 2026-01-05

### Added
- **Extension Icon** - Added custom icon for the extension in VS Code Marketplace and extension list

### Changed
- **Activity Bar Icon** - Updated to use VS Code's built-in preview icon for better consistency

## [0.1.4] - 2025-12-16

### Added
- **Open JRXML Source** command - View raw XML source code
- Source button in custom editor toolbar
- Context menu option in Explorer to open source
- Switch between visual editor and XML source view

### Fixed
- Critical infinite loop bug in Elements panel when no JRXML file open
- Custom editor now properly notifies sidebar panels when document opens
- Elements and Properties panels now update when opening files with custom editor
- Added proper handling for info/error tree items

### Enhanced
- Output channel logging for better debugging ("JRXML Viewer" channel)
- Improved document detection in sidebar providers
- Better initialization of active document on extension startup

## [0.1.3] - 2025-12-16

### Added
- **JRXML Explorer Sidebar** - New activity bar panel with three views:
  - **JRXML Files**: Browse all .jrxml files in workspace with folder structure
  - **Properties**: Real-time document properties (dimensions, margins, bands, parameters, variables, statistics)
  - **Elements**: Hierarchical navigation of report elements by band
- Quick access to JRXML files from sidebar
- Interactive element tree with position and size information
- Refresh button to reload file list
- Custom icon for JRXML extension in activity bar

### Enhanced
- Better workspace organization for projects with multiple reports
- At-a-glance view of document structure and statistics
- Improved navigation with dedicated sidebar panels

## [0.1.2] - 2025-12-16

### Added
- Mouse wheel zoom with Ctrl/Cmd modifier
- Pan/drag functionality - click and drag to move the view
- Double-click to reset zoom and position
- Improved cursor feedback (grab/grabbing cursors)
- Smoother navigation experience

### Enhanced
- Better user interaction with mouse controls
- Prevent text selection while dragging
- Visual feedback during pan operations

## [0.1.1] - 2025-12-16

### Fixed
- **Critical**: Include fast-xml-parser dependency in extension package
- Extension now works when installed from Marketplace
- Fixed "Cannot find module 'fast-xml-parser'" error

### Changed
- Updated .vscodeignore to include required dependencies (fast-xml-parser, strnum)
- Package size increased to 211 KB (includes necessary dependencies)

## [0.1.0] - 2025-12-16

### Added
- Initial release
- Visual preview for JRXML files
- Support for all major bands (title, header, detail, footer, summary, groups)
- Display of static texts, text fields, images, lines, and rectangles
- Sidebar with report information (parameters, fields, variables)
- Zoom controls (buttons, keyboard shortcuts, mouse wheel)
- Syntax highlighting for JRXML files
- Custom editor for .jrxml files

### Features
- Parse and display JRXML structure
- Visual representation of report layout
- Interactive element inspection
- Responsive design
- Dark theme integration with VS Code

### Known Issues
- Charts and subreports are not yet rendered
- No editing capabilities (read-only preview)
- Large reports may have performance issues
