# Changelog

All notable changes to the "jrxml-viewer" extension will be documented in this file.

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
