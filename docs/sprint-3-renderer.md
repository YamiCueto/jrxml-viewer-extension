# Sprint 3 — Layout Renderer

Este documento detalla la arquitectura, el diseño de componentes visuales, el flujo de renderizado y los resultados obtenidos durante el **Sprint 3: Layout Renderer** para la extensión Visual Studio Code *"JRXML Viewer & Editor"*.

---

## 1. Contexto y Objetivos del Sprint 3

En los **Sprints 1 y 2** se construyeron las dos capas fundamentales de la arquitectura:
1. **JRXML Document Model:** Representación de árbol tipada del documento (85/85 elementos sin pérdida).
2. **JRXML Layout Engine:** Generador de páginas, capas (`BACKGROUND`, `CONTENT`, `FOOTER`, `OVERLAY`) y geometría absoluta/relativa (`595 × 842px`).

El objetivo del **Sprint 3** fue:
- Crear un módulo de renderizado independiente (`jrxmlRenderer.ts`) desacoplado de XML y de bibliotecas de parsing.
- Conectar el `LayoutResult` al Webview de Visual Studio Code y a la función de exportación HTML (`exportToHtml`).
- Sustituir la antigua pila vertical de 1646px por contenedores de página independientes de **595px × 842px**.
- Renderizar todos los elementos visuales (`staticText`, `textField`, `rectangle`, `ellipse`, `line`, `image`, `frame`, `subreport`, `chart`).
- Preservar la interactividad existente: selección de elementos (incluyendo elementos anidados en frames), panel de propiedades editable, zoom y exportación HTML.

---

## 2. Arquitectura y Flujo de Datos

```text
                  complex-report.jrxml
                           │
                           ▼
                ┌─────────────────────┐
                │ JrxmlDocumentParser │  (fast-xml-parser aislado)
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ JrxmlDocument (AST) │  (Fuertemente tipado)
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │  JrxmlLayoutEngine  │  (Geometría, capas, páginas)
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │    LayoutResult     │  (Páginas, Capas, Elementos)
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │    JrxmlRenderer    │  (HTML, CSS, SVG, Placeholders)
                └──────────┬──────────┘
                           │
                           ▼
                  Webview / DOM / Export
```

### Regla Fundamental de Aislamiento
El renderer **NO** importa `fast-xml-parser`, **NO** lee cadenas XML, **NO** calcula el orden ni la altura acumulada de bandas, y **NO** calcula coordenadas de contenedores `<frame>`. Recibe únicamente el `LayoutResult` ya resuelto por el `JrxmlLayoutEngine` y lo proyecta a HTML/CSS.

---

## 3. Estructura de Páginas y Capas

Cada página se renderiza como un contenedor dimensional independiente:
- **Dimensiones:** `595px` de ancho $\times$ `842px` de alto.
- **Capas Explícitas (Z-Order):**
  - `BACKGROUND` ($z\text{-index} = 1$): Ocupa la totalidad de la página detrás del contenido sin alterar el flujo vertical.
  - `CONTENT` ($z\text{-index} = 10$): Contiene las bandas `title`, `pageHeader`, `groupHeader`, `columnHeader`, `detail`, `columnFooter`, `groupFooter`, `summary`.
  - `FOOTER` ($z\text{-index} = 20$): Contiene la banda `pageFooter` anclada a la base de la página ($y = 794\text{px}$).
  - `OVERLAY` ($z\text{-index} = 30$): Reservada para marcas de agua y anotaciones.

---

## 4. Elementos Soportados en el Renderer

| Elemento | Representación Visual | Propiedades Mapeadas |
| :--- | :--- | :--- |
| `staticText` | Bloque tipográfico interactivo | `text`, `fontName`, `fontSize`, `isBold`, `isItalic`, `isUnderline`, `isStrikeThrough`, `forecolor`, `backcolor`, `horizontalAlignment`, `verticalAlignment`, `box` |
| `textField` | Campo de texto con expresión | `expression` (`$F{}`, `$P{}`, `$V{}`), `pattern`, propiedades de tipografía, `forecolor`, `backcolor`, `box` |
| `rectangle` | Caja rectangular | `width`, `height`, `backcolor`, `radius` (`border-radius`), `pen` (`lineWidth`, `lineColor`, `lineStyle`) |
| `ellipse` | Óvalo/Círculo SVG/CSS | `width`, `height`, `border-radius: 50%`, `pen` |
| `line` | Línea horizontal o vertical | `border-top` (horizontal) o `border-left` (vertical), `pen` (`lineWidth`, `lineColor`, `lineStyle`) |
| `frame` | Contenedor anidado | Renderizado como contenedor con sus elementos hijos posicionados recursivamente en su interior |
| `image` | Placeholder / Contenedor | `imageExpression`, indicador visual e icono |
| `subreport` | Placeholder estructural | `subreportExpression`, indicador visual e icono |
| `chart` | Placeholder diferenciado | Subtipos `barChart` (📊 Bar Chart), `pieChart` (🥧 Pie Chart), `lineChart` (📈 Line Chart), título del gráfico |

---

## 5. Interactividad, Selección y Compatibilidad

1. **Selección de Elementos:** Todos los elementos renderizados incluyen las clases `.element .clickable` y atributos `data-element-id` y `data-element='...'` con el payload JSON completo. Al hacer clic en un elemento (incluyendo elementos anidados dentro de frames), se resalta visualmente y abre el panel lateral de propiedades.
2. **Control de Zoom:** El zoom opera aplicando `transform: scale(zoom)` sobre el contenedor `.report-canvas-wrapper`, permitiendo escalar todas las páginas uniformemente sin mutar las coordenadas lógicas del modelo.
3. **Exportación a HTML:** La función `exportToHtml()` invoca directamente `renderLayoutDocument(layoutResult)` generando un archivo HTML independiente fiel al diseño de páginas y capas.

---

## 6. Resultados de Verificación de Pruebas

```text
Running Layout Renderer Verification Suite...

✔ Test 1: Renderer consumes pure LayoutResult without raw JRXML.
✔ Test 2: Page 595x842 container generated.
✔ Test 3: No 1646px vertically stacked canvas.
✔ Test 4: Background layer renders behind content with explicit z-index.
✔ Test 5: PageFooter renders at the exact position provided by LayoutResult.
✔ Test 6: Ellipse elements rendered with oval geometry.
✔ Test 7: Frames rendered as containers.
✔ Test 8: Elements inside frames are rendered.
✔ Test 9: Nested frames render recursively.
✔ Test 10: Charts produce differentiated placeholders (Bar, Pie, Line).
✔ Test 11: Subreport placeholder rendered.
✔ Test 12: Elements preserve stable IDs.
✔ Test 13: Interactive selection payload and clickable classes preserved.
✔ Test 14: Multi-page layout rendered as independent page containers.
✔ Test 15: Renderer is completely decoupled from fast-xml-parser.

========================================
All 15 Layout Renderer Tests PASSED (100%)
========================================
```

---

## 7. Limitaciones Deliberadamente Postergadas

- **Motor de Evaluación de Expresiones (Sprint 5):** Las expresiones `$F{}`, `$P{}`, `$V{}` se muestran en texto plano; la sustitución dinámica con datasets de prueba se implementará en el sprint de expresiones.
- **Motor de Herencia de Estilos (Sprint 5):** La resolución de estilos heredados (`parentStyle`) y estilos condicionales (`styleName`) se completará en el sprint de estilos.
- **Renderizado Gráfico Real (SVG/Canvas):** Los gráficos se muestran con placeholders tipados y títulos; el trazado real con Chart.js o D3 se implementará en una fase posterior.
- **Edición Bidireccional y Serialización AST (Sprint 4):** La mutación y persistencia segura de elementos se abordará en el sprint de edición.
