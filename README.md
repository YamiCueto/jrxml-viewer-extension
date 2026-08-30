# JRXML Viewer & Editor

* [🇪🇸 Leer en Español](./README.es.md)

A professional Visual Studio Code extension for viewing, inspecting, and editing JasperReports JRXML files with real-time visual layout, live dataset expressions, style resolution, and real SVG chart rendering.

**Created by Yamid Cueto for the Java and JasperReports community**

[![Version](https://img.shields.io/visual-studio-marketplace/v/YamidCuetoMazo.jrxml-viewer?style=flat-square&color=blue)](https://marketplace.visualstudio.com/items?itemName=YamidCuetoMazo.jrxml-viewer)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/YamidCuetoMazo.jrxml-viewer?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=YamidCuetoMazo.jrxml-viewer)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](./LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.85%2B-blue.svg?style=flat-square)](https://code.visualstudio.com/)

---

## 🎯 Features

### 📐 Multi-Layer Layout Engine & Visual Canvas
- **Exact Page Geometry**: Renders report pages with authentic dimensions (`595 × 842 px` standard A4 / Letter) and margin constraints.
- **Layered Architecture**: Independent 4-layer composition (`BACKGROUND`, `CONTENT`, `FOOTER`, `OVERLAY`). The background layer renders cleanly behind content without distorting vertical band flow.
- **Anchored Page Footers**: Automatically anchors `pageFooter` to the bottom margin ($y = 794\text{px}$) regardless of content height.
- **Isolated NoData States**: Dedicated `noData` alternate state rendering without layout collision.
- **Nested Frames**: Full recursive geometry calculation for elements inside frames at any nesting depth.

### 📊 Real SVG Charts & Graphics
- **Dynamic Dataset Evaluation**: Charts dynamically resolve categories, series, and values from the `PreviewDataset` using safe JasperReports expressions.
- **Bar Charts (`barChart`)**: Scalable SVG bar charts with categorical X-axis, numeric Y-scale, grid lines, compact value labels, and series legends.
- **Pie Charts (`pieChart`)**: Trigonometric SVG circular arcs with percentage labels, slice tooltips, and side legend.
- **Line Charts (`lineChart`)**: Time-series and category line charts with smooth connecting paths, gradient fills, point markers, and tooltips.

### 💡 Safe Expression Evaluation & Preview Data
- **Lexical Expression Engine**: Safe evaluation for `$P{Param}`, `$F{Field}`, `$V{Var}`, string concatenations, and ternary conditionals (`cond ? a : b`).
- **Pattern Formatting**: Format numbers (`$ #,##0.00`) and dates (`yyyy-MM-dd`) cleanly.
- **Synthetic Preview Dataset**: Built-in sample data with automatic report and group scope variable aggregations (`Sum`, `Count`, `Average`).
- **Zero Arbitrary Code Execution**: Pure lexical parser with 0 use of `eval()`, `new Function()`, or shell commands.

### 🎨 Style Inheritance & Visual Fidelity
- **Cascading Style System**: Full support for `<style>` hierarchies, `parentStyle` inheritance, and cyclic dependency protection.
- **Per-Side Box & Pen Rendering**: Renders `topPen`, `bottomPen`, `leftPen`, `rightPen` with custom line widths and styles (`Solid`, `Dashed`, `Dotted`, `Double`).
- **Biaxial Text Alignment**: Precision flexbox alignment matching JasperReports horizontal (`Left`, `Center`, `Right`, `Justified`) and vertical (`Top`, `Middle`, `Bottom`) alignment.
- **JasperReports Styled Markup**: Automatically parses and converts `<style isBold="true"...>`, `<b>`, `<i>`, `<u>`, `<font>` into safe HTML formatting.
- **Text Rotation**: Native support for rotated text (`rotation="Left"`, `Right`, `UpsideDown`).

### ✏️ Bidirectional Editing & Safe XML Persistence
- **AST-Based Serialization**: Safely edits elements via AST transformations instead of fragile regex replacements.
- **Deterministic Element IDs**: Unique structural `ElementId` addressing prevents coordinate collisions.
- **Preserved JRXML Integrity**: Comments, CDATA blocks, expressions, and formatting remain intact upon saving.
- **Properties Inspector**: Real-time property editing (coordinates, dimensions, text, expressions, colors, fonts, borders).

### 🗂️ JRXML Explorer Sidebar
- **JRXML Files Navigator**: Browse all `.jrxml` files in the workspace with folder structure.
- **Document Properties**: Real-time inspection of report metadata, dimensions, margins, and variable counts.
- **Element Hierarchy Tree**: Expand bands and frames to inspect and highlight every visual element.

### ⚡ Navigation & Controls
- **Interactive Zoom & Panning**: Mouse wheel zoom (`Ctrl/Cmd + Wheel`), button controls, and click-and-drag panning.
- **View Switching**: Instant one-click toggle between visual canvas and XML source code editor.
- **Standalone HTML Export**: Export reports to self-contained HTML files with embedded SVG graphics and resolved styles.

---

## 📦 Installation

### From VS Code Marketplace
1. Open Visual Studio Code.
2. Open the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Search for `JRXML Viewer & Editor` (or `YamidCuetoMazo.jrxml-viewer`).
4. Click **Install**.

### Command Palette Installation
Press `Ctrl+P` (or `Cmd+P`) and paste:
```bash
ext install YamidCuetoMazo.jrxml-viewer
```

---

## 🚀 Usage

### Opening JRXML Files
1. Open any `.jrxml` file in VS Code.
2. The visual viewer opens automatically by default.
3. **Switch Views**:
   - Click the **`</>`** button in the editor toolbar to switch to the XML source code.
   - Right-click any `.jrxml` file in the File Explorer → **"Open JRXML Source"**.
   - Use the **JRXML Explorer** sidebar to navigate reports.

### Keyboard Shortcuts
- `Ctrl/Cmd + +`: Zoom in
- `Ctrl/Cmd + -`: Zoom out
- `Ctrl/Cmd + 0`: Reset zoom (100%)
- `Ctrl/Cmd + Mouse Wheel`: Smooth zoom
- `Click + Drag`: Pan the canvas
- `Escape`: Deselect element / close properties panel

### Extension Settings
| Setting | Description | Default |
| :--- | :--- | :--- |
| `jrxml-viewer.defaultView` | Choose default view when opening `.jrxml` files (`preview` for visual editor or `source` for XML code). | `preview` |

---

## 📝 Supported JasperReports Elements

| Category | Elements / Bands |
| :--- | :--- |
| **Bands** | `title`, `pageHeader`, `columnHeader`, `groupHeader`, `detail`, `groupFooter`, `columnFooter`, `pageFooter`, `summary`, `background`, `noData` |
| **Elements** | `staticText`, `textField`, `image`, `line`, `rectangle`, `ellipse`, `frame`, `elementGroup`, `subreport`, `barChart`, `pieChart`, `lineChart` |
| **Layout & Styles** | `box` (all sides and individual pens), `style` inheritance, `parentStyle`, `fontName`, `fontSize`, `bold`, `italic`, `underline`, `strikeThrough`, `forecolor`, `backcolor`, `mode` (Opaque/Transparent) |
| **Expressions** | `$P{...}`, `$F{...}`, `$V{...}`, string concatenations, ternary conditionals, date/numeric pattern formatting |

---

## 🛣️ Roadmap

### Completed ✅
- [x] Strongly-typed JRXML Document Model (AST)
- [x] Multi-layer Layout Engine & layer separation (`BACKGROUND`, `CONTENT`, `FOOTER`)
- [x] Pure Layout Renderer with transparent band canvases
- [x] Deterministic structural `ElementId` addressing
- [x] AST-driven safe XML persistence & properties editing
- [x] Safe expression evaluation ($P{}, $F{}, $V{}) & variable aggregations
- [x] Style cascade, inheritance & cycle detection
- [x] Real vector SVG charts (`barChart`, `pieChart`, `lineChart`)
- [x] JasperReports styled markup conversion (`<style>`, `<b>`, `<i>`, `<u>`)
- [x] 114 automated tests across 8 verification suites (100% passing)

### In Progress 🚧
- [ ] Visual authoring palette (drag & drop new elements onto canvas)
- [ ] Interactive visual element resizing handles
- [ ] End-to-End Playwright visual regression suite

### Planned 📋
- [ ] PDF export directly from VS Code
- [ ] Real-time JasperReports schema validation
- [ ] Common JRXML snippet templates & autocompletion
- [ ] Live JasperReports Server connector

---

## 📄 License

This project is licensed under the **MIT License**. See the [`LICENSE`](./LICENSE) file for details.

---

## 👨‍💻 Author

**Yamid Cueto**
- GitHub: [@YamiCueto](https://github.com/YamiCueto)
- Marketplace: [YamidCuetoMazo](https://marketplace.visualstudio.com/publishers/YamidCuetoMazo)
