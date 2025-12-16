# Changelog

All notable changes to the "jrxml-viewer" extension will be documented in this file.

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
