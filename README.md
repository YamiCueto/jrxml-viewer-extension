# JRXML Viewer & Editor

*[🇪🇸 Leer en Español](./README.es.md)*

A professional Visual Studio Code extension for viewing and editing JasperReports JRXML files with interactive real-time visual preview.

**Created by Yamid Cueto for the Java and JasperReports community**

![JRXML Viewer](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-1.85%2B-blue.svg)

## 🎯 Features

- **Interactive visual preview**: Visualize the complete structure of your JRXML reports directly in VS Code
- **Clickable elements**: Click on any element to see its detailed properties
- **Properties panel**: Inspect and analyze each element with complete information
- **Informative tooltips**: Detailed information when hovering over elements
- **Export to HTML**: Export your reports to standalone HTML files
- **Structure analysis**: Sidebar with detailed information about parameters, fields, variables, and groups
- **Interactive zoom**: Control zoom level with buttons, keyboard, or mouse wheel
- **Syntax highlighting**: Enhanced syntax highlighting for JRXML files
- **Band visualization**: Easily identify header, detail, footer, and other report bands
- **Visual elements**: Display textFields, staticTexts, images, lines, rectangles, subreports, and charts
- **Full support**: Compatible with all major JasperReports elements

## 📦 Installation

### From VS Code Marketplace (coming soon)
1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X)
3. Search for "JRXML Viewer"
4. Click "Install"

### Manual installation for development
1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile the project:
   ```bash
   npm run compile
   ```
4. Press F5 to open a new VS Code window with the extension loaded

## 🚀 Usage

1. Open any `.jrxml` file in VS Code
2. The extension will automatically open the visual viewer
3. You can toggle between the XML text editor and the visual viewer

### Keyboard shortcuts

- `Ctrl/Cmd + +`: Zoom in
- `Ctrl/Cmd + -`: Zoom out
- `Ctrl/Cmd + 0`: Reset zoom to 100%
- `Ctrl/Cmd + Wheel`: Zoom with mouse wheel
- `Escape`: Close properties panel/deselect element

### Commands

- `JRXML: Open Preview`: Opens the preview of the current JRXML file

### Interface buttons

- **📄 Export HTML**: Export the report to an HTML file
- **🔧 Properties**: Open/close the properties panel
- **+/-**: Zoom controls

## 🔧 Development

### Prerequisites
- Node.js 20.x or higher
- npm 9.x or higher
- Visual Studio Code 1.85.0 or higher

### Project structure

```
jrxml-viewer-extension/
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── jrxmlEditorProvider.ts # Custom editor provider
│   └── jrxmlParser.ts         # JRXML file parser
├── media/
│   ├── preview.css            # Viewer styles
│   └── preview.js             # Viewer logic
├── .vscode/
│   ├── launch.json            # Debug configuration
│   └── tasks.json             # Build tasks
├── package.json               # Extension manifest
└── tsconfig.json              # TypeScript configuration
```

### Available scripts

```bash
npm run compile      # Compile TypeScript
npm run watch        # Compile in watch mode
npm run lint         # Run linter
npm run package      # Package extension for publishing
```

### Debugging

1. Open the project in VS Code
2. Press F5 or select "Run Extension" in the Debug panel
3. A new VS Code window will open with the extension loaded
4. Open a `.jrxml` file to test

## 📝 Supported elements

### Bands
- ✅ Title
- ✅ Page Header
- ✅ Column Header
- ✅ Group Header
- ✅ Detail
- ✅ Group Footer
- ✅ Column Footer
- ✅ Page Footer
- ✅ Summary
- ✅ Background
- ✅ Last Page Footer
- ✅ No Data

### Elements
- ✅ Static Text
- ✅ Text Field
- ✅ Image
- ✅ Line
- ✅ Rectangle
- ✅ Subreport
- ✅ Chart (basic visualization)
- ⏳ Barcode (coming soon)

### Properties
- ✅ Position (x, y, width, height)
- ✅ Text alignment
- ✅ Font properties
- ✅ Colors (foreground, background)
- ✅ Borders
- ✅ Patterns
- ✅ Expressions

## 🛣️ Roadmap

- [ ] Interactive visual editor (drag & drop)
- [ ] Full support for complex charts and graphs
- [ ] Export to PDF from VS Code
- [ ] Real-time syntax validation
- [ ] Snippets for common elements
- [ ] Intelligent autocompletion
- [ ] Integration with JasperReports Server
- [ ] Preview with sample data

## 🤝 Contributing

Contributions are welcome! If you want to contribute:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## 👨‍💻 Author

**Yamid Cueto**
- GitHub: [@YamiCueto](https://github.com/YamiCueto)
- Extension created for the Java and JasperReports community
- Contributions and suggestions are welcome

## 🙏 Acknowledgments

- To the JasperReports community for creating such a powerful tool
- To all Java developers who work with reports every day
- To the VS Code community for providing an extensible platform

## 📧 Contact & Support

If you have questions, suggestions, or find any bugs:
- Open an issue on the [GitHub repository](https://github.com/YamiCueto/jrxml-viewer-extension/issues)
- Leave a review on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=yamid.jrxml-viewer)

## 📊 Statistics

- **Current version**: 0.1.0
- **Compatible with**: VS Code 1.85.0+
- **License**: MIT
- **Language**: TypeScript

---

**Made with ❤️ by Yamid Cueto for the Java community!**

*If you find this extension useful, consider leaving a ⭐ on GitHub and a review on the Marketplace*

*Si esta extensión te resulta útil, considera dejar una ⭐ en GitHub y una reseña en el Marketplace*
