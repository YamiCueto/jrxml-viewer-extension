# Sprint 2 — JRXML Layout Engine

Este documento detalla la arquitectura, el modelo geométrico de páginas, la gestión de capas y los resultados obtenidos durante el **Sprint 2: JRXML Layout Engine** para la extensión Visual Studio Code *"JRXML Viewer & Editor"*.

---

## 1. Contexto y Objetivos del Sprint 2

En el **Sprint 0** se descubrió que el renderizador previo calculaba la altura total del reporte mediante una acumulación lineal:

$$\text{top} += \text{band.height}$$

Esto causaba que el canvas creciera artificialmente hasta **1646px**, acumulando bandas como `background` (802px) y `noData` (120px) en una sola columna vertical sin noción de página ni capas.

El objetivo del **Sprint 2** fue:
1. Crear un **Layout Engine independiente y determinista** (`jrxmlLayoutEngine.ts`) desacoplado del DOM, Webview y navegador.
2. Definir un **Layout Model fuertemente tipado** (`jrxmlLayoutModel.ts`) que organice el documento en páginas explícitas (`LayoutPage`) y capas (`BACKGROUND`, `CONTENT`, `FOOTER`, `OVERLAY`).
3. Modelar las dimensiones reales de página (`pageWidth: 595`, `pageHeight: 842`, márgenes `20px` $\rightarrow$ área de contenido `555 × 802`).
4. Asignar roles semánticos a cada banda:
   - `background`: Capa de fondo (`BACKGROUND`), ocupa el canvas sin consumir espacio vertical de contenido ($\Delta y = 0$).
   - `pageFooter`: Capa de pie (`FOOTER`), anclado al fondo de la página ($y = \text{pageHeight} - \text{bottomMargin} - \text{height}$).
   - `noData`: Estado de layout alternativo (`LayoutMode.NO_DATA`), aislado del flujo normal de datos.
   - `groupHeader` / `groupFooter`: Asociados estructuralmente a su grupo envolviendo la banda de detalle.
5. Soportar anidamiento recursivo de contenedores (`<frame>` y `<elementGroup>`), calculando coordenadas absolutas a partir de coordenadas relativas sin mutar el AST original.
6. Mantener el renderizador webview y la vista de edición intactos temporalmente para garantizar pruebas puras y aisladas.

---

## 2. Arquitectura de Separación de Responsabilidades

```text
                  JRXML File
                      │
                      ▼
          parseJrxmlDocument(xmlContent)
                      │
                      ▼
               JrxmlDocument (AST)
                      │
                      ▼
       layoutJrxmlDocument(doc, options)
                      │ (Layout Engine Aislado)
                      ▼
                 LayoutResult
             ┌────────┴────────┐
             ▼                 ▼
        LayoutPage 1      LayoutPage N ...
       ├── Dimensions    ├── Dimensions
       ├── Layers        ├── Layers
       │   ├── BACKGROUND│   ├── BACKGROUND
       │   ├── CONTENT   │   ├── CONTENT
       │   └── FOOTER    │   └── FOOTER
       ├── LayoutBands   ├── LayoutBands
       └── LayoutElements└── LayoutElements
             │
             ▼ (Sprint 3)
      Renderer Webview / SVG / Canvas
```

---

## 3. Modelo de Geometría y Coordenadas

### Dimensiones de Página
Para el reporte patrón [`complex-report.jrxml`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/tests/fixtures/complex-report.jrxml):
- **Ancho Total (`pageWidth`):** `595px`
- **Alto Total (`pageHeight`):** `842px`
- **Márgenes:** `top: 20px`, `bottom: 20px`, `left: 20px`, `right: 20px`
- **Área Útil (`contentWidth` $\times$ `contentHeight`):** `555px × 802px`

### Coordenadas Relativas vs Absolutas en Frames
Cada elemento de layout conserva:
- `localGeometry`: Coordenadas `(x, y, width, height)` relativas a su contenedor inmediato.
- `absoluteGeometry`: Coordenadas `(absoluteX, absoluteY, width, height)` resueltas acumulando el desplazamiento de todos los contenedores padres y la posición de la banda.

$$\text{absoluteX}_{\text{child}} = \text{absoluteX}_{\text{parent}} + \text{localX}_{\text{child}}$$
$$\text{absoluteY}_{\text{child}} = \text{absoluteY}_{\text{parent}} + \text{localY}_{\text{child}}$$

Esta resolución opera de forma puramente recursiva para cualquier profundidad de anidamiento (`frame` dentro de `frame`, etc.).

---

## 4. Roles Semánticos de Bandas y Manejo de Capas

| Banda | Rol (`BandRole`) | Capa (`LayerType`) | Comportamiento Geométrico |
| :--- | :--- | :--- | :--- |
| `background` | `BACKGROUND` | `BACKGROUND` | Se posiciona en $(x_{\text{margin}}, y_{\text{margin}})$. **No avanza `currentY`**, permitiendo que el contenido se dibuje encima. |
| `title` | `TITLE` | `CONTENT` | Se posiciona en la cabecera del flujo de la primera página. |
| `pageHeader` | `PAGE_HEADER` | `CONTENT` | Encabezado relativo a la página. |
| `groupHeader` | `GROUP_HEADER` | `CONTENT` | Asociado al grupo (`RegionGroup`), precede a `detail`. |
| `columnHeader` | `COLUMN_HEADER` | `CONTENT` | Cabecera de columnas de datos. |
| `detail` | `DETAIL` | `CONTENT` | Cuerpo de registros de datos. |
| `columnFooter` | `COLUMN_FOOTER` | `CONTENT` | Pie de columnas de datos. |
| `groupFooter` | `GROUP_FOOTER` | `CONTENT` | Asociado al grupo (`RegionGroup`), sucede a `detail`. |
| `summary` | `SUMMARY` | `CONTENT` | Resumen final del reporte. |
| `pageFooter` | `PAGE_FOOTER` | `FOOTER` | Anclado en $y = \text{pageHeight} - \text{bottomMargin} - \text{height}$ ($794\text{px}$). |
| `noData` | `NO_DATA` | `CONTENT` | Estado alternativo activado en modo `NO_DATA`. |

---

## 5. Aclaración sobre Conteo de Plumas (34 pens vs 22 del Baseline)

En el **Sprint 0**, el conteo manual del baseline contabilizó **22 pens**, considerando únicamente etiquetas `<pen>` declaradas explícitamente dentro de elementos `<graphicElement>`.

El **Document Model (Sprint 1)** y el **Layout Engine (Sprint 2)** realizan una inspección exhaustiva de todas las definiciones de trazado y bordes:
1. **9 Plumas en Estilos (`<style><box>`):** `BaseStyle`, `ReportTitleStyle` (`bottomPen`), `TableHeaderStyle`, `TableCellStyle`, `GroupHeaderStyle` (`bottomPen`), `GroupFooterStyle` (`topPen`), `CardBoxStyle`, `HighlightBadge`, `WarningBadge`.
2. **25 Plumas en Elementos:**
   - 1 rectángulo en `background`
   - 1 elipse en `background`
   - 1 caja en `title` (frame 1)
   - 4 rectángulos en `title` (KPI grid frame)
   - 2 líneas en `pageHeader`
   - 1 rectángulo en `columnHeader`
   - 1 línea en `detail`
   - 1 línea en `columnFooter`
   - 1 línea en `pageFooter`
   - 1 elipse en `groupHeader`
   - 1 línea en `groupHeader`
   - 1 rectángulo en `groupFooter`
   - 1 caja en `summary` (totals frame)
   - 1 trazado en `summary` (linePlot)
   - 1 rectángulo en `noData`
   - 1 elipse en `noData`

Total exacto: $9 + 25 = 34\text{ pens}$. El baseline histórico original de 22 se mantiene inalterado como referencia del Sprint 0.

---

## 6. Resultados de Verificación (`tests/layout/run-layout-tests.js`)

```text
Running Layout Engine Verification Suite...

✔ Test 1: pageWidth = 595 verified.
✔ Test 2: pageHeight = 842 verified.
✔ Test 3: contentWidth = 555 verified.
✔ Test 4: contentHeight = 802 verified.
✔ Test 5: Background is placed in BACKGROUND layer and consumes 0 vertical content space.
✔ Test 6: PageFooter is anchored to page bottom (794px).
✔ Test 7: NoData is an isolated alternate document state, not stacked under summary.
✔ Test 8: GroupHeader and GroupFooter are associated with the group and properly wrap detail.
✔ Test 9: Frames preserve parent-child hierarchy.
✔ Test 10: Elements inside frames receive correct absolute coordinates (parentAbs + local).
✔ Test 11: Nested frames calculate recursive coordinates across arbitrary depth.
✔ Test 12: Each layout page contains its own independent dimensions and placed elements.
✔ Test 13: LayoutResult is a pure data AST independent of DOM and browser APIs.

========================================
All 13 Layout Engine Tests PASSED (100%)
========================================
```

---

## 7. Limitaciones Actuales Deliberadamente Postergadas

Para preservar el alcance modular del proyecto, las siguientes funciones se abordarán en sus sprints correspondientes:
- **Renderizado Visual (Sprint 3):** Conexión de `LayoutResult` al Webview mediante SVG/Canvas/HTML estructurado por páginas.
- **Evaluación Dinámica de Expresiones (Sprint 5):** Reemplazo de expresiones `$F{}`, `$P{}`, `$V{}` por valores calculados con mock data.
- **Resolución de Cascada de Estilos (Sprint 5):** Cálculo de herencia de estilos padres (`parentStyle`) y estilos condicionales.
- **Edición y Persistencia AST (Sprint 4):** Serialización bidireccional entre `LayoutElement` / `JrxmlElement` y el archivo `.jrxml`.
