# Changelog

All notable changes to the "jrxml-viewer" extension will be documented in this file.

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
