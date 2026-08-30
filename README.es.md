# JRXML Viewer & Editor

* [🇺🇸 Read in English](./README.md)

Una extensión profesional de Visual Studio Code para visualizar, inspeccionar y editar archivos JasperReports JRXML con motor de layout en tiempo real, evaluación de expresiones, resolución de estilos y renderizado de gráficos vectoriales SVG reales.

**Creado por Yamid Cueto para la comunidad Java y JasperReports**

[![Version](https://img.shields.io/visual-studio-marketplace/v/YamidCuetoMazo.jrxml-viewer?style=flat-square&color=blue)](https://marketplace.visualstudio.com/items?itemName=YamidCuetoMazo.jrxml-viewer)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/YamidCuetoMazo.jrxml-viewer?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=YamidCuetoMazo.jrxml-viewer)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](./LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.85%2B-blue.svg?style=flat-square)](https://code.visualstudio.com/)

---

## 🎯 Características

### 📐 Motor de Layout Geométrico y Lienzo en Capas
- **Geometría de Página Real**: Renderizado con dimensiones auténticas de página (`595 × 842 px` A4 / Carta) y respeto estricto de márgenes.
- **Arquitectura en 4 Capas**: Composición desacoplada (`BACKGROUND`, `CONTENT`, `FOOTER`, `OVERLAY`). La capa de fondo se dibuja limpiamente detrás del contenido sin desplazar verticalmente las bandas.
- **Anclaje de Page Footer**: Anclaje automático de `pageFooter` en la base del margen inferior ($y = 794\text{px}$) independientemente de la altura de las bandas de datos.
- **Estado NoData Aislado**: Soporte para el estado alternativo `noData` como documento independiente.
- **Frames Recursivos**: Cálculo geométrico relativo completo para elementos anidados dentro de marcos a cualquier nivel de profundidad.

### 📊 Gráficos Vectoriales SVG Reales
- **Evaluación Dinámica de Expresiones de Dataset**: Los gráficos derivan sus series, categorías y valores directamente del `PreviewDataset`.
- **Gráficos de Barras (`barChart`)**: Gráficos SVG escalables con eje X categórico, escala Y numérica, líneas de cuadrícula, etiquetas compactas y leyenda de series.
- **Gráficos Circulares (`pieChart`)**: Arcos trigonométricos vectoriales con porcentajes calculados, tooltips interactivos y leyenda lateral.
- **Gráficos de Líneas (`lineChart`)**: Gráficos de series cronológicas con polilíneas suaves, relleno de gradiente tenue, puntos marcadores y tooltips.

### 💡 Evaluación Segura de Expresiones y Datos de Prueba
- **Motor Léxico Seguro**: Evaluación de `$P{Param}`, `$F{Field}`, `$V{Var}`, concatenaciones de texto y operadores ternarios (`cond ? a : b`).
- **Formateo de Patrones**: Formateo de números (`$ #,##0.00`) y fechas (`yyyy-MM-dd`).
- **Dataset Sintético**: Datos de prueba integrados con cálculo automático de agregaciones en variables (`Sum`, `Count`, `Average`) a nivel de reporte y grupo.
- **Cero Ejecución de Código Arbitrario**: Parser léxico puro sin uso de `eval()`, `new Function()` ni comandos de shell.

### 🎨 Herencia de Estilos y Fidelidad Visual
- **Sistema de Estilos en Cascada**: Soporte para jerarquías `<style>`, herencia mediante `parentStyle` y protección contra dependencias cíclicas.
- **Bordes y Plumas por Lado**: Renderizado de `topPen`, `bottomPen`, `leftPen`, `rightPen` con grosores personalizados y estilos de trazo (`Solid`, `Dashed`, `Dotted`, `Double`).
- **Alineación Biaxial**: Flexbox sincronizado con la alineación horizontal (`Left`, `Center`, `Right`, `Justified`) y vertical (`Top`, `Middle`, `Bottom`) de JasperReports.
- **Markup Estilizado**: Conversión automática de `<style isBold="true"...>`, `<b>`, `<i>`, `<u>`, `<font>` a spans HTML seguros.
- **Rotación de Texto**: Soporte nativo para textos rotados (`rotation="Left"`, `Right`, `UpsideDown`).

### ✏️ Edición Bidireccional y Persistencia XML Segura
- **Serialización Basada en AST**: Edición segura mediante mutación de AST en lugar de expresiones regulares frágiles.
- **IDs Estructurales Deterministas**: Identificadores únicos `ElementId` que evitan colisiones de coordenadas.
- **Preservación Total del JRXML**: Comentarios, CDATA, expresiones y estructura se mantienen intactos al guardar.
- **Panel de Propiedades**: Edición en tiempo real de coordenadas, dimensiones, textos, expresiones, colores, tipografías y bordes.

### 🗂️ Panel Lateral JRXML Explorer
- **Explorador de Archivos JRXML**: Navega todos los reportes `.jrxml` del workspace con su estructura de carpetas.
- **Propiedades del Documento**: Inspección en vivo de dimensiones, márgenes, bandas y recuentos de variables.
- **Árbol Jerárquico de Elementos**: Expande bandas y marcos para inspeccionar y resaltar cualquier elemento del reporte.

### ⚡ Navegación y Controles
- **Zoom y Paneo Interactivos**: Zoom con rueda del mouse (`Ctrl/Cmd + Rueda`), botones de zoom y paneo por arrastre.
- **Alternancia de Vistas**: Cambio instantáneo entre editor visual y código fuente XML con un solo clic.
- **Exportación a HTML Autónomo**: Exporta el reporte a un archivo HTML standalone con los gráficos SVG vectoriales y estilos embebidos.

---

## 📦 Instalación

### Desde el VS Code Marketplace
1. Abre Visual Studio Code.
2. Abre la vista de Extensiones (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Busca `JRXML Viewer & Editor` (o `YamidCuetoMazo.jrxml-viewer`).
4. Haz clic en **Instalar**.

### Desde la Paleta de Comandos
Presiona `Ctrl+P` (o `Cmd+P`) y pega:
```bash
ext install YamidCuetoMazo.jrxml-viewer
```

---

## 🚀 Uso

### Abrir Archivos JRXML
1. Abre cualquier archivo `.jrxml` en VS Code.
2. El visor visual se abrirá automáticamente por defecto.
3. **Alternar Vistas**:
   - Haz clic en el botón **`</>`** en la barra superior para ver el código fuente XML.
   - Clic derecho en cualquier `.jrxml` en el Explorador → **"Open JRXML Source"**.
   - Usa el panel lateral **JRXML Explorer** para navegar entre reportes.

### Atajos de Teclado
- `Ctrl/Cmd + +`: Aumentar zoom
- `Ctrl/Cmd + -`: Disminuir zoom
- `Ctrl/Cmd + 0`: Resetear zoom (100%)
- `Ctrl/Cmd + Rueda`: Zoom suave
- `Clic + Arrastrar`: Paneo del canvas
- `Escape`: Deseleccionar elemento / cerrar panel de propiedades

### Configuración
| Configuración | Descripción | Por Defecto |
| :--- | :--- | :--- |
| `jrxml-viewer.defaultView` | Vista predeterminada al abrir archivos `.jrxml` (`preview` para editor visual o `source` para código XML). | `preview` |

---

## 📝 Elementos y Bandas Soportados

| Categoría | Elementos / Bandas |
| :--- | :--- |
| **Bandas** | `title`, `pageHeader`, `columnHeader`, `groupHeader`, `detail`, `groupFooter`, `columnFooter`, `pageFooter`, `summary`, `background`, `noData` |
| **Elementos** | `staticText`, `textField`, `image`, `line`, `rectangle`, `ellipse`, `frame`, `elementGroup`, `subreport`, `barChart`, `pieChart`, `lineChart` |
| **Estilos y Cajas** | `box` (todos los lados y plumas individuales), herencia `style`, `parentStyle`, `fontName`, `fontSize`, `bold`, `italic`, `underline`, `strikeThrough`, `forecolor`, `backcolor`, `mode` (Opaque/Transparent) |
| **Expresiones** | `$P{...}`, `$F{...}`, `$V{...}`, concatenaciones, ternarios, formato de patrones numéricos y de fecha |

---

## 🛣️ Roadmap

### Completado ✅
- [x] Modelo de Documento AST fuertemente tipado
- [x] Motor de Layout Geométrico y separación en 4 capas
- [x] Renderer en capas con lienzos de bandas transparentes
- [x] Identificadores estructurales deterministas `ElementId`
- [x] Persistencia atómica segura de XML y edición de propiedades
- [x] Evaluador léxico seguro de expresiones ($P{}, $F{}, $V{}) y agregaciones
- [x] Resolución de estilos en cascada con detección de ciclos
- [x] Gráficos vectoriales SVG reales (`barChart`, `pieChart`, `lineChart`)
- [x] Conversión de markup estilizado de JasperReports
- [x] 114 pruebas automatizadas en 8 suites de verificación (100% pasando)

### En Progreso 🚧
- [ ] Paleta de authoring visual (arrastrar y soltar nuevos elementos al canvas)
- [ ] Tiradores interactivos para redimensionar elementos en canvas
- [ ] Suite de pruebas visuales end-to-end con Playwright

### Planeado 📋
- [ ] Exportación a PDF directamente desde VS Code
- [ ] Validación de esquemas JasperReports en tiempo real
- [ ] Plantillas de snippets comunes y autocompletado inteligente
- [ ] Conector en vivo con JasperReports Server

---

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT**. Consulta el archivo [`LICENSE`](./LICENSE) para más detalles.

---

## 👨‍💻 Autor

**Yamid Cueto**
- GitHub: [@YamiCueto](https://github.com/YamiCueto)
- Marketplace: [YamidCuetoMazo](https://marketplace.visualstudio.com/publishers/YamidCuetoMazo)
