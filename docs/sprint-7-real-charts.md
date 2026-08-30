# Sprint 7 — Real Charts & Graphics

Este documento describe la arquitectura de datos y renderizado, la resolución de expresiones sobre el dataset sintético y los resultados de auditoría y pruebas del **Sprint 7: Real Charts & Graphics** para la extensión Visual Studio Code *"JRXML Viewer & Editor"*.

---

## 1. Contexto y Objetivos del Sprint 7

Con los Sprints 1 a 6 se construyó el pipeline completo de AST, motor de layout, renderer en capas, mutación bidireccional, persistencia atómica, evaluación de expresiones, resolución de estilos y fidelidad visual. Sin embargo, los gráficos (`barChart`, `pieChart`, `lineChart`) se representaban únicamente mediante tarjetas placeholder estáticas.

El objetivo del **Sprint 7** fue:
- **Reemplazar los placeholders por gráficos reales y dinámicos**.
- **Consumir los datos del `PreviewDataset` y evaluar las expresiones de dataset** (`categoryDataset`, `pieDataset`) mediante el motor léxico seguro (`jrxmlExpressionEvaluator.ts`).
- **Renderizar gráficos vectoriales SVG puros, escalables y deterministas**, sin dependencias pesadas de terceros (sin Chart.js ni D3).
- **Respetar estrictamente la geometría del `LayoutResult`**, anidamiento en frames, clipping y estilos resueltos.
- **Preservar la interactividad**, `ElementId` estable, selección en el canvas, panel de propiedades y exportación limpia a HTML autónomo.
- **Mantener 100% verdes todas las suites de regresión previas** (96 tests anteriores + 18 tests nuevos de gráficos = 114 tests totales).

---

## 2. Arquitectura del Pipeline de Gráficos

El flujo de renderizado de gráficos se integra de forma limpia y desacoplada en la arquitectura general:

```text
JRXML (AST)
  │
  ├─> JrxmlDocumentParser (extrae categoryDataset / pieDataset)
  │
  ├─> PreviewDataset (filas de datos sintéticos + parámetros)
  │      │
  │      ▼
  ├─> jrxmlChartData.ts (resolveChartData)
  │      │  - Evalúa categoryExpression / valueExpression / keyExpression
  │      │  - Agrupa y acumula valores numéricos por categoría o serie
  │      │  - Calcula totales, porcentajes y ángulos trigonométricos
  │      ▼
  ├─> jrxmlLayoutEngine.ts (LayoutElement.resolvedChartData)
  │      │
  │      ▼
  ├─> jrxmlChartRenderer.ts (renderChartSvg)
  │      │  - Genera SVG determinista con viewBox="0 0 width height"
  │      │  - Traza ejes, líneas de cuadrícula, barras, arcos y polilíneas
  │      │  - Agrega leyendas, títulos y tooltips <title>
  │      ▼
  └─> Webview DOM / Export HTML (SVG embebido interactivo)
```

---

## 3. Estrategia de Resolución de Datos

Los gráficos no utilizan valores inventados ni fijos; derivan sus datos directamente de las expresiones de JasperReports evaluadas sobre el dataset:

### 1. Gráfico de Barras (`barChart`)
- **Dataset:** `<categoryDataset>` $\rightarrow$ `<categorySeries>`
- **Serie:** `seriesExpression` (e.g. `"Sales"`)
- **Categoría:** `categoryExpression` (e.g. `$F{region}`)
- **Valor:** `valueExpression` (e.g. `$F{totalAmount}`)
- **Resultado evaluado:**
  - `North America`: $\$ 7,685.00$ ($5935.0 + 1750.0$)
  - `EMEA`: $\$ 4,480.00$

### 2. Gráfico Circular (`pieChart`)
- **Dataset:** `<pieDataset>`
- **Clave/Categoría:** `keyExpression` (e.g. `$F{orderStatus}`)
- **Valor:** `valueExpression` (e.g. `$F{totalAmount}`)
- **Resultado evaluado:**
  - `COMPLETED`: $\$ 7,685.00$ ($63.2\%$, ángulo $227.4^\circ$)
  - `PENDING`: $\$ 4,480.00$ ($36.8\%$, ángulo $132.6^\circ$)

### 3. Gráfico de Líneas (`lineChart`)
- **Dataset:** `<categoryDataset>` $\rightarrow$ `<categorySeries>`
- **Serie:** `seriesExpression` (e.g. `"Daily Revenue"`)
- **Categoría temporal:** `categoryExpression` (e.g. `$F{orderDate}`)
- **Valor:** `valueExpression` (e.g. `$F{totalAmount}`)
- **Resultado evaluado:**
  - `2026-02-15`: $\$ 5,935.00$
  - `2026-03-10`: $\$ 1,750.00$
  - `2026-04-05`: $\$ 4,480.00$

---

## 4. Estrategia de Renderizado SVG

1. **Escalabilidad y Geometría:** Cada gráfico genera un elemento `<svg>` con `viewBox="0 0 ${width} ${height}"` y `width="100%" height="100%"`, adaptándose al contenedor del `LayoutResult`.
2. **Barras:** Elementos `<rect>` con esquinas redondeadas (`rx="2"`), etiquetas de valores compactos (e.g. `7.7k`, `4.5k`), líneas de cuadrícula horizontales y etiquetas de categoría.
3. **Sectores Circulares:** Elementos `<path>` calculados con coordenadas polares a cartesianas (`M cx cy L ... A r r 0 ... Z`), con porcentajes centrados en cada sector y leyenda lateral.
4. **Líneas y Puntos:** Elementos `<path>` con trazo suave (`stroke-width="2.2"`), relleno de gradiente tenue bajo la curva (`fill-opacity="0.10"`) y marcadores circulares `<circle>` con tooltips nativos `<title>`.
5. **Seguridad y Robustez:** Cero `eval()`, cero `Function()`, cero ejecución de comandos de sistema. Si una expresión no puede evaluarse o el dataset está vacío, produce un gráfico limpio con estado seguro sin romper el visor.

---

## 5. Resultados de las 8 Suites de Pruebas

```text
======================================================================
1. SPRINT 1 — Document Model (tests/run-tests.js)
   13/13 tests PASSED (100%)
======================================================================
2. SPRINT 2 — Layout Engine (tests/layout/run-layout-tests.js)
   13/13 tests PASSED (100%)
======================================================================
3. SPRINT 3 — Layout Renderer (tests/render/run-render-tests.js)
   15/15 tests PASSED (100%)
======================================================================
4. SPRINT 4 — Editing & Persistence (tests/editing/run-editing-tests.js)
   16/16 tests PASSED (100%)
======================================================================
5. SPRINT 5 — Expression Evaluation (tests/expression/run-expression-tests.js)
   21/21 tests PASSED (100%)
======================================================================
6. SPRINT 5 — Style Resolution (tests/style/run-style-tests.js)
   8/8 tests PASSED (100%)
======================================================================
7. SPRINT 6 — Visual Fidelity & Polish (tests/visual/run-visual-tests.js)
   10/10 tests PASSED (100%)
======================================================================
8. SPRINT 7 — Real Charts & Graphics (tests/charts/run-chart-tests.js)
✔ Test 1: Bar chart detected in Document Model.
✔ Test 2: Pie chart detected in Document Model.
✔ Test 3: Line chart detected in Document Model.
✔ Test 4: Bar chart receives dataset from PreviewDataset.
✔ Test 5: Pie chart receives dataset from PreviewDataset.
✔ Test 6: Line chart receives dataset from PreviewDataset.
✔ Test 7: Numeric values resolved correctly from dataset expressions.
✔ Test 8: Categories resolved correctly.
✔ Test 9: Real SVG output generated for Bar, Pie, Line charts.
✔ Test 10: Chart geometry matches LayoutResult.
✔ Test 11: Chart titles rendered inside SVG.
✔ Test 12: Multiple series work cleanly.
✔ Test 13: Missing/empty dataset handled safely without crash.
✔ Test 14: Unsupported Java/system expressions handled safely without dynamic execution.
✔ Test 15: Stable structural ElementId preserved on chart container.
✔ Test 16: Chart selection payload and interaction classes preserved.
✔ Test 17: Full document export contains self-contained SVG charts.
✔ Test 18: Deterministic chart rendering verified.
   18/18 tests PASSED (100%)
======================================================================
TOTAL SUITES: 114/114 TESTS PASSED (100%)
======================================================================
```

---

## 6. Archivos Creados y Modificados en Sprint 7

### Archivos Creados
- [`src/render/charts/jrxmlChartModel.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/render/charts/jrxmlChartModel.ts): Modelos e interfaces de series, categorías, sectores de tarta y datos de gráficos resueltos.
- [`src/render/charts/jrxmlChartData.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/render/charts/jrxmlChartData.ts): Extractor y agregador dinámico de datos de gráficos desde el `PreviewDataset`.
- [`src/render/charts/jrxmlChartRenderer.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/render/charts/jrxmlChartRenderer.ts): Generador vectorial SVG determinista para gráficos de barras, circulares y de líneas.
- [`tests/charts/run-chart-tests.js`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/tests/charts/run-chart-tests.js): Suite de pruebas automatizadas con 18 aserciones de gráficos reales.
- [`docs/sprint-7-real-charts.md`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/docs/sprint-7-real-charts.md): Documentación del sprint.

### Archivos Modificados
- [`src/model/jrxmlDocumentModel.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/model/jrxmlDocumentModel.ts): Soporte tipado de `categoryDataset` y `pieDataset`.
- [`src/model/jrxmlDocumentParser.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/model/jrxmlDocumentParser.ts): Parser de configuraciones de dataset de gráficos.
- [`src/editing/jrxmlSerializer.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/editing/jrxmlSerializer.ts): Serialización limpia de datasets de gráficos en XML.
- [`src/layout/jrxmlLayoutModel.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/layout/jrxmlLayoutModel.ts) y [`src/layout/jrxmlLayoutEngine.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/layout/jrxmlLayoutEngine.ts): Inyección y resolución de datos de gráficos en `LayoutElement`.
- [`src/render/jrxmlRenderer.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/render/jrxmlRenderer.ts): Renderizado de gráficos vectoriales reales en lugar de placeholders.
- [`src/jrxmlParser.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/jrxmlParser.ts): Ajuste de compatibilidad en interfaz `JrxmlVariable`.
- [`tests/visual/run-visual-tests.js`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/tests/visual/run-visual-tests.js): Sincronización de aserciones con títulos de gráficos reales.

---

## 7. Limitaciones Intencionalmente Postergadas

1. **Sprint 8 (Visual Authoring & Advanced Editing):** Edición interactiva sobre el canvas, drag & drop desde paleta de herramientas y redimensionamiento.
2. **Sprint 9 (E2E Playwright & Release Preparation):** Pruebas visuales automatizadas end-to-end con Playwright y generación de artefactos visuales de lanzamiento.
