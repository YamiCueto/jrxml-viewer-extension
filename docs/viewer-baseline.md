# JRXML Viewer Baseline

Línea base técnica y visual reproducible del estado actual de la extensión **"JRXML Viewer & Editor"** antes de modificar parser, renderer, layout engine o arquitectura.

---

## 1. Environment

- **Extensión Versión:** `0.1.9`
- **VS Code Engine Compatible:** `^1.85.0`
- **Node.js:** `v24.19.0`
- **TypeScript:** `5.9.3` (`^5.3.0` declarado en `package.json`)
- **Dependencias de Parsing XML:** `fast-xml-parser: ^5.3.3`

---

## 2. Fixture

- **Ruta:** [`tests/fixtures/complex-report.jrxml`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/tests/fixtures/complex-report.jrxml)
- **Documentación del Fixture:** [`tests/fixtures/README.md`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/tests/fixtures/README.md)
- **Nombre del Reporte:** `ComplexEnterpriseSalesCustomerReport`
- **Dimensiones:** `595 x 842` (A4 Portrait), Margen: 20px (`leftMargin`, `rightMargin`, `topMargin`, `bottomMargin`), `columnWidth: 555px`.
- **Estructura XML:** 85 instancias de `<reportElement>` distribuidas en 11 bandas, 4 `<frame>`, 13 `<style>`, 10 `<parameter>`, 16 `<field>`, 9 `<variable>`, 1 `<group>`, 3 `<chart>`, 1 `<subreport>`, 8 `<printWhenExpression>`, 9 `<box>` y 22 `<pen>`.

---

## 3. Parser Coverage

Medición ejecutada sobre [`src/jrxmlParser.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/jrxmlParser.ts):

| Feature / Elemento XML | Cantidad Real en Fixture | Cantidad Detectada por Parser | Pérdida de Información | Estado | Causa / Detalle Técnico |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Configuración Global (`<jasperReport>`)** | 1 | 1 | 0% | **PASS** | Extrae `name`, `pageWidth`, `pageHeight`, `orientation`, `columnWidth`, `margins`. |
| **Parámetros (`<parameter>`)** | 10 | 10 | 0% | **PASS** | Extrae `name`, `class`, `defaultValueExpression`, `isForPrompting`. |
| **Campos (`<field>`)** | 16 | 16 | 0% | **PASS** | Extrae `name` y `class`. |
| **Variables (`<variable>`)** | 9 | 9 | 0% | **PASS** | Extrae `name`, `class`, `calculation`, `expression`. Ignora `resetType` y `resetGroup`. |
| **Grupos (`<group>`)** | 1 | 1 | 0% | **PASS** | Extrae `name` y `groupExpression`. |
| **Bandas Básicas** | 9 | 9 | 0% | **PASS** | Detecta `background`, `title`, `pageHeader`, `columnHeader`, `detail`, `columnFooter`, `pageFooter`, `summary`, `noData`. |
| **Bandas de Grupo** | 2 | 2 | 0% | **PASS** | Genera tipos sintetizados `groupHeader-RegionGroup` y `groupFooter-RegionGroup`. |
| **Elementos en `title`** | 7 | 0 | 100% | **FAIL** | Los elementos están contenidos dentro de `<frame>`; el parser no navega dentro de frames. |
| **Elementos en `pageHeader`** | 4 | 4 | 0% | **PASS** | Extrae 2 líneas, 1 staticText y 1 textField. |
| **Elementos en `columnHeader`** | 10 | 10 | 0% | **PASS** | Extrae 1 rectangle y 9 staticTexts. |
| **Elementos en `detail`** | 10 | 10 | 0% | **PASS** | Extrae 8 textFields, 1 staticText/blank y 1 line. |
| **Elementos en `columnFooter`** | 1 | 1 | 0% | **PASS** | Extrae 1 line. |
| **Elementos en `pageFooter`** | 5 | 5 | 0% | **PASS** | Extrae 1 line, 1 staticText y 3 textFields. |
| **Elementos en `summary`** | 7 | 3 | 57% | **PARTIAL** | Extrae 1 subreport, 1 staticText y 1 textField. Pierde 3 charts (`barChart`, `pieChart`, `lineChart`) y los elementos dentro del grand totals `<frame>`. |
| **Elementos en `background`** | 3 | 2 | 33% | **PARTIAL** | Extrae 1 rectangle y 1 staticText. Pierde 1 `<ellipse>`. |
| **Elementos en `noData`** | 5 | 4 | 20% | **PARTIAL** | Extrae 1 rectangle, 2 staticText y 1 textField. Pierde 1 `<ellipse>`. |
| **Elementos en `groupHeader`** | 6 | 0 | 100% | **FAIL** | Contenidos dentro de `<frame>`, resultando en 0 elementos detectados. |
| **Elementos en `groupFooter`** | 6 | 6 | 0% | **PASS** | Extrae 1 rectangle, 1 staticText y 4 textFields. |
| **Contenedores `<frame>`** | 4 | 0 | 100% | **NOT_SUPPORTED** | `parseBandElements()` no incluye `frame` en su lógica de extracción ni desempaqueta hijos. |
| **Textos Estáticos (`<staticText>`)** | 27 | 16 | 41% | **PARTIAL** | Extrae propiedades tipográficas básicas si están a nivel de banda; pierde los contenidos en frames. |
| **Campos de Texto (`<textField>`)** | 32 | 19 | 41% | **PARTIAL** | Extrae expresión, pattern, alineación básica; pierde los contenidos en frames. |
| **Imágenes (`<image>`)** | 1 | 0 | 100% | **FAIL** | Ubicada dentro del frame del título; no llega al parser. |
| **Líneas (`<line>`)** | 6 | 5 | 17% | **PARTIAL** | Extrae líneas de primer nivel; pierde la línea vertical dentro del groupHeader frame. |
| **Rectángulos (`<rectangle>`)** | 8 | 4 | 50% | **PARTIAL** | Extrae rectángulos directos; pierde los 4 rectángulos de tarjetas KPI dentro de frames. |
| **Elipses (`<ellipse>`)** | 3 | 0 | 100% | **NOT_SUPPORTED** | `parseBandElements()` no procesa la etiqueta `<ellipse>`. |
| **Gráficos (`<barChart>`, `<pieChart>`, `<lineChart>`)** | 3 | 0 | 100% | **FAIL** | El parser busca `band.chart`. En JRXML estándar la raíz es `<barChart>`, `<pieChart>`, etc. |
| **Subreportes (`<subreport>`)** | 1 | 1 | 0% | **PASS** | Extrae coordenadas y `subreportExpression`. Ignora `<subreportParameter>`. |
| **Condiciones (`<printWhenExpression>`)** | 8 | 0 | 100% | **NOT_SUPPORTED** | No se capturan en la interfaz `JrxmlElement`. |
| **Estilos Reutilizables (`<style>`)** | 13 | 0 | 100% | **NOT_SUPPORTED** | `parseJrxml()` no parsea etiquetas `<style>` ni resuelve `style="..."`. |
| **Bordes y Cajas (`<box>`, `<pen>`)** | 9 / 22 | 0 | 100% | **NOT_SUPPORTED** | Las propiedades de bordes son ignoradas por el parser. |

**Resumen de Elementos Visuales:** De 85 elementos `<reportElement>` presentes en el XML, el parser actual sólo detecta 45 (53% cobertura; 47% de pérdida por falta de soporte de frames, gráficos tipados y elipses).

---

## 4. Renderer Coverage

Medición ejecutada sobre [`src/jrxmlEditorProvider.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/jrxmlEditorProvider.ts) y [`media/preview.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/media/preview.ts):

| Componente de Renderizado | Comportamiento Esperado | Comportamiento Observado Actual | Estado |
| :--- | :--- | :--- | :---: |
| **Canvas Page Dimensions** | Hoja A4 fija de 595x842px con paginación | Canvas con `width: 595px` y `height: 1646px` (suma total de alturas de bandas acumuladas). No hay concepto de páginas. | **FAIL** |
| **Márgenes y Posición de Banda** | Márgenes de documento (20px) delimitando el área imprimible de las bandas | Se aplica `left: 20px; width: 555px;` en el contenedor `.band`, pero la posición vertical es una pila continua `top: currentY`. | **PARTIAL** |
| **Composición de Bandas** | Modelo de capas: `background` como fondo absoluto, `pageHeader`/`pageFooter` fijos por página, `noData` excluyente | **Pila vertical lineal:** `background` (802px) se dibuja en `top=662px` debajo de `summary`, `noData` en `top=1464px`, y las bandas de grupo en `top=1584px` y `1620px`. | **FAIL** |
| **Contenedores `<frame>`** | Renderizar contenedor con `position: relative` u offsets acumulados para hijos | No se genera ningún elemento DOM; los 4 frames y todos sus elementos hijos desaparecen. | **FAIL** |
| **Gráficos (`<chart>`)** | Contenedor visual / placeholder estilizado con tipo de gráfico | No se renderizan porque el parser no los detecta. | **FAIL** |
| **Formas `<ellipse>`** | Representación circular SVG o CSS `border-radius: 50%` | No existe código en `renderElements()` para manejar el tipo `ellipse`. | **FAIL** |
| **Formas `<rectangle>`** | Rectángulo con borde y color de fondo respetando `radius` | Se renderiza `<div class="element element-rectangle">`, pero `radius` es ignorado (esquinas cuadradas). | **PARTIAL** |
| **Formas `<line>`** | Línea horizontal o vertical con grosor y estilo | Se dibuja `<div class="element element-line">` con CSS genérico; no distingue vertical de horizontal ni `lineStyle="Dashed"`. | **PARTIAL** |
| **Estilos y Herencia (`<style>`)** | Aplicación en cascada de tipografía, colores y bordes referenciados por `style="..."` | Se ignoran; sólo se aplican estilos inline si están declarados explícitamente en el elemento individual. | **NOT_SUPPORTED** |
| **Cajas y Bordes (`<box>`)** | Bordes CSS específicos (`border-top`, etc.) y relleno (`padding`) | No se inyectan propiedades `border` ni `padding` en los elementos. | **NOT_SUPPORTED** |
| **Expresiones (`$F{}`, `$P{}`, `$V{}`)** | Formateo legible o evaluación con datos mock | Se imprime la expresión literal como texto (ej. `$F{customerName}`). Expresiones Java complejas se muestran crudas. | **PARTIAL** |
| **Imágenes (`<image>`)** | Carga de imagen o placeholder | Renderiza `<div class="element element-image">🖼️ Image</div>`; no utiliza el `imageExpression` real. | **PARTIAL** |
| **Subreportes (`<subreport>`)** | Placeholder descriptivo con nombre del subreporte | Renderiza `<div class="element element-subreport">📊 Subreport</div>`. | **PASS** |

---

## 5. Tree View Coverage

Medición ejecutada sobre [`src/jrxmlPropertiesProvider.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/jrxmlPropertiesProvider.ts), [`src/jrxmlElementsProvider.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/jrxmlElementsProvider.ts) y [`src/jrxmlFilesProvider.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/jrxmlFilesProvider.ts):

| Vista de Árbol (Tree View) | Elementos Esperados | Elementos Mostrados | Estado | Causa Técnica |
| :--- | :--- | :--- | :---: | :--- |
| **JRXML Files (`jrxmlFiles`)** | Árbol de carpetas del workspace y archivos `.jrxml` | Muestra `tests/fixtures/complex-report.jrxml` correctamente. | **PASS** | Escaneo de sistema de archivos funciona como esperado. |
| **Document Properties (`jrxmlProperties`)** | Info de documento, márgenes, bandas con sus alturas reales, parámetros, variables y estadísticas | Muestra Document Info, Margins, 10 Parámetros, 9 Variables. **Pero:** Las 7 bandas listadas muestran `height: 0px` y no aparecen estadísticas de elementos (`Element Statistics`). | **PARTIAL** | `extractBands()` y `countElements()` leen `report[bandType]` en lugar de inspeccionar el nodo hijo `report[bandType].band`. No lista `background`, `noData`, ni grupos. |
| **Elements Navigator (`jrxmlElements`)** | Árbol jerárquico de Bandas -> Elementos (`staticText`, `textField`, etc.) con coordenadas | Muestra un único nodo: `[No elements found]`. | **FAIL** | `extractElementsFromBand()` busca `band[elemType]` sobre `report[band.key]`, que es un contenedor `{ band: { ... } }`, fallando en encontrar los elementos. |

---

## 6. Editing Coverage

Medición ejecutada sobre la interacción en [`media/preview.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/media/preview.ts) y `updateElementInFile()` en [`src/jrxmlEditorProvider.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/jrxmlEditorProvider.ts):

| Operación de Edición | Comportamiento Esperado | Comportamiento Observado Actual | Estado |
| :--- | :--- | :--- | :---: |
| **Selección de Elemento** | Clic selecciona el elemento, resalta contorno y abre panel de propiedades | Funciona para los elementos visibles directos. Aplica clase `.selected` y abre panel lateral. | **PASS** |
| **Inspección de Propiedades** | Muestra tipo, posición `(x,y)`, dimensiones `(w,h)`, texto, fuentes y colores | Muestra campos editables con valores actuales parseados del elemento. | **PASS** |
| **Live Preview (Edición en panel)** | Cambios en inputs de posición/tamaño actualizan el DOM en tiempo real | `handlePropertyPreview()` modifica inmediatamente `style.left`, `style.top`, `style.width`, `style.height`. | **PASS** |
| **Guardado de Cambios (`updateElementInFile`)** | Mutación AST/DOM precisa del archivo `.jrxml` preservando estructura y formato | **Mutación basada en RegExp sobre coordenadas `(x,y)`:** Busca `<reportElement x="X" y="Y">`. Si dos elementos comparten coordenadas o tienen `x="0" y="0"`, corrompe o modifica el elemento equivocado. | **FAIL** |
| **Zoom y Navegación** | Controles de zoom (botones `+`, `-`, atajos `Ctrl + / - / 0`) escalando el canvas | `updateZoom()` aplica `transform: scale(...)` de 25% a 300% correctamente. | **PASS** |
| **Exportación a HTML** | Generar archivo HTML standalone con la visualización del reporte | `exportToHtml()` genera `complex-report_export.html` con CSS básico y elementos presentes. | **PASS** |
| **Abrir Código Fuente / Alternar** | Comandos `jrxml-viewer.openSource` y custom editor | Cambia fluidamente entre editor de texto y vista personalizada. | **PASS** |

---

## 7. Known Failures

Lista concreta y reproducible de fallos detectados:

1. **KF-01 (Frames Drop):** Todos los elementos dentro de `<frame>` (en `title`, `groupHeader`, `summary`) son ignorados por el parser y no se renderizan en pantalla.
2. **KF-02 (Band Height Zero en Properties View):** `JrxmlPropertiesProvider` reporta `height: 0px` para todas las bandas cuando el JRXML usa la sintaxis estándar `<title><band height="..."></band></title>`.
3. **KF-03 (Tree View Elements Empty):** `JrxmlElementsProvider` reporta `No elements found` para reportes válidos modernos debido a que no desciende a la propiedad `.band`.
4. **KF-04 (Chart Types Unrecognized):** Gráficos declarados como `<barChart>`, `<pieChart>` o `<lineChart>` no son extraídos por el parser porque busca exclusivamente la clave literal `chart`.
5. **KF-05 (Ellipse Unsupported):** Las etiquetas `<ellipse>` son omitidas en `jrxmlParser.ts` y no tienen representación visual en el renderer.
6. **KF-06 (Vertical Band Stacking Distortion):** `calculateTotalHeight()` y `renderBands()` tratan `background` (802px) y `noData` (120px) como bloques secuenciales hacia abajo, generando un canvas sobredimensionado de 1646px donde el fondo aparece como un bloque intermedio en lugar de una capa base.
7. **KF-07 (Group Bands Ordering):** Las bandas `groupHeader` y `groupFooter` se parsean en un array separado y se concatenan al final de todas las bandas estándar (después de `summary`, `background` y `noData`), en vez de posicionarse alrededor del `detail`.
8. **KF-08 (Fragile Regex Mutation):** La persistencia de cambios en archivo mediante expresiones regulares basadas en `x` e `y` falla ante coordenadas duplicadas o elementos anidados.

---

## 8. Visual Problems

Problemas observables directamente en la interfaz del preview:

- **Espacio en Blanco Excesivo y Altura Desproporcionada:** El lienzo tiene 1646px de alto en lugar de 842px. El usuario debe hacer scroll vertical extenso para encontrar bandas que deberían coexistir en una única página A4.
- **Desaparición del Encabezado Corporativo y Tarjetas KPI:** Como los elementos de `title` están dentro de dos `<frame>`, la banda de título aparece como un bloque vacío de 120px de altura.
- **Desaparición de Gráficos Estadísticos:** El área de resumen (`summary`) muestra solo el subreporte y los textos legales finales, dejando vacíos los 300px destinados a los gráficos de barras, pastel y líneas.
- **Watermark y Fondos Fuera de Lugar:** El texto rotado `CONFIDENTIAL` y el marco de página de `background` aparecen a la mitad del reporte (en `top: 662px`), superpuestos secuencialmente en lugar de servir como marca de agua de fondo.
- **Bandas de Agrupación al Final del Lienzo:** El encabezado y pie de `RegionGroup` se muestran al final del documento (después de `noData`), en lugar de envolver la tabla de detalles.
- **Carencia de Estilizado en Tablas:** Celdas de encabezado y datos no tienen los bordes `<box>` declarados, viéndose como bloques de texto flotantes sin cuadrícula.

---

## 9. Architectural Problems

Problemas estructurales identificados en el diseño actual del código:

1. **Ausencia de un Document Object Model / AST Formal:**
   - La extensión traduce directamente de `fast-xml-parser` (objeto JS plano no normalizado) a cadenas HTML mediante interpolación de strings en `jrxmlEditorProvider.ts`.
   - No existe una representación intermedia de tipos fuertemente tipada que resuelva herencia de estilos, jerarquía de páginas, flujos de bandas ni coordenadas relativas.

2. **Modelo de Renderizado Unidimensional (Pila Vertical):**
   - El renderer asume que un reporte JasperReports es un único `<div>` con bandas apiladas (`top += band.height`).
   - JasperReports opera bajo un modelo de **Páginas Impresas Multicapa** (Layered Multi-Page Layout Engine), donde `background` vive en una capa Z inferior, las bandas de grupo envuelven al `detail`, y `noData` reemplaza condicionalmente a las demás bandas.

3. **Duplicación y Desincronización de Lógicas de Parsing:**
   - Existen 3 parsers independientes en el proyecto: `jrxmlParser.ts`, `jrxmlPropertiesProvider.ts` y `jrxmlElementsProvider.ts`. Cada uno implementa su propia lógica sobre `fast-xml-parser`, provocando inconsistencias críticas (por ejemplo, `jrxmlParser.ts` sí tiene tolerancia a `.band`, mientras que los dos proveedores de vista de árbol fallan al no tenerla).

4. **Motor de Persistencia Basado en Expresiones Regulares:**
   - Modificar el archivo XML buscando patrones de texto `<reportElement x="..." y="...">` es vulnerable a colisiones y no soporta elementos anidados ni preservación confiable del documento.

---

## 10. Recommended Sprint 1

Prioridades recomendadas para la siguiente fase de desarrollo (sin implementación en este sprint):

1. **Unificación del Parser y Document Model (AST):**
   - Centralizar el análisis sintáctico en un único módulo (`jrxmlDocumentModel`) consumido por el editor, el visor de propiedades y el navegador de elementos.
   - Implementar soporte recursivo para `<frame>`, `<elementGroup>` y normalización de contenedores `<band>`.
2. **Normalización de Tipos de Elementos:**
   - Mapear adecuadamente `<ellipse>`, formas geométricas, imágenes con fallback, y familias de gráficos (`<barChart>`, `<pieChart>`, `<lineChart>`).
3. **Corrección de TreeDataProviders:**
   - Hacer que `JrxmlPropertiesProvider` y `JrxmlElementsProvider` utilicen el Document Model unificado, restaurando inmediatamente la visualización de elementos y alturas de banda.
4. **Diseño Preliminar del Layout Engine:**
   - Separar el cálculo de capas (`background` vs `content`), orden de bandas (`groupHeader` -> `detail` -> `groupFooter`) y soporte de dimensiones por página.
