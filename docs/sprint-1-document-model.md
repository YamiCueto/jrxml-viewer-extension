# Sprint 1 — JRXML Document Model

Este documento detalla la arquitectura, el diseño de tipos, el flujo de análisis sintáctico y los resultados obtenidos durante el **Sprint 1: JRXML Document Model** para la extensión Visual Studio Code *"JRXML Viewer & Editor"*.

---

## 1. Contexto y Objetivos del Sprint 1

En el **Sprint 0** se identificó que la versión `0.1.9` presentaba una pérdida del **47% de los elementos visuales** (45/85 elementos detectados) debido a la ausencia de un modelo unificado y a la existencia de tres lógicas de parsing independientes e inconsistentes.

El objetivo de este sprint fue:
1. Crear un **JRXML Document Model (AST)** fuertemente tipado e independiente de la biblioteca subyacente (`fast-xml-parser`).
2. Aislar el análisis XML dentro de un parser centralizado (`jrxmlDocumentParser.ts`).
3. Soportar jerarquías y elementos anidados ilimitados (`<frame>`, `<elementGroup>`).
4. Normalizar todas las bandas estándar y de agrupación a una interfaz común.
5. Capturar el 100% de los elementos visuales (`85/85`) presentes en el fixture [`tests/fixtures/complex-report.jrxml`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/tests/fixtures/complex-report.jrxml).
6. Conectar los proveedores de vistas de árbol (`JrxmlPropertiesProvider`, `JrxmlElementsProvider`) al nuevo Document Model para resolver las inconsistencias históricas.

---

## 2. Comparativa de Arquitectura

### Arquitectura Anterior (Sprint 0)
```text
JRXML File
   │
   ├───────────────┬────────────────────────────┐
   ▼               ▼                            ▼
jrxmlParser   PropertiesProvider        ElementsProvider
   │               │                            │
fast-xml-parser  fast-xml-parser          fast-xml-parser
   │               │                            │
Pérdida 47%     Band Height = 0px        "No elements found"
(omite frames) (no desciende a .band)   (no desciende a .band)
```

### Arquitectura Nueva (Sprint 1)
```text
                     JRXML File
                         │
                         ▼
             parseJrxmlDocument(xmlContent)
                         │ (fast-xml-parser aislado)
                         ▼
                 JrxmlDocument (AST)
       ┌─────────────────┼──────────────────┐
       │                 │                  │
       ▼                 ▼                  ▼
jrxmlParser      PropertiesProvider   ElementsProvider
(Legacy Adapter)         │                  │
       │           11 Bandas Reales   85 Elementos con
       ▼           13 Estilos          Frames Anidados
Editor Webview     Estadísticas OK    Navegación Completa
(85/85 en Modelo)
```

---

## 3. Jerarquía y Tipos del Modelo

El modelo se implementó en [`src/model/jrxmlDocumentModel.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/model/jrxmlDocumentModel.ts) y define los siguientes tipos centrales:

### Entidades de Documento
- `JrxmlDocument`: Contenedor raíz que aloja el `report: JrxmlReport`.
- `JrxmlReport`: Metadatos de página (`pageWidth`, `pageHeight`, márgenes, orientación, UUID, lenguaje), colecciones de `styles`, `parameters`, `fields`, `variables`, `groups` y `bands`.

### Estilos y Propiedades Visuales
- `JrxmlStyle`: Nombre de estilo, `parentStyle` para herencia, flags booleanos (`isDefault`, `isBold`, `isItalic`, `isUnderline`, `isStrikeThrough`), `fontName`, `fontSize`, colores (`forecolor`, `backcolor`, `mode`), alineaciones y definición de bordes `<box>`.
- `JrxmlBox` y `JrxmlPen`: Soporte de márgenes internos (`topPadding`, `bottomPadding`, etc.) y plumas de trazado individuales (`pen`, `topPen`, `bottomPen`, `leftPen`, `rightPen`) con `lineWidth`, `lineColor` y `lineStyle`.

### Datos y Expresiones
- `JrxmlParameter`: Nombre, clase Java, flag `isForPrompting` y `defaultValueExpression`.
- `JrxmlField`: Nombre y tipo de dato Java.
- `JrxmlVariable`: Nombre, clase, función de agregación (`calculation`), tipo y grupo de reinicio (`resetType`, `resetGroup`) y expresión asociada.
- `JrxmlExpression`: Estructura unificada para expresiones JasperReports (`$F{}`, `$P{}`, `$V{}` o expresiones Java arbitrarias) con propiedades `raw`, `type` y `name`.

### Bandas y Elementos
- `JrxmlBand`: Representación normalizada de todas las bandas (`type`, `name`, `height`, `splitType`, `elements`). Oculta a los consumidores la diferencia sintáctica entre `<title><band>...</band></title>` y `<title>...<title>`.
- `JrxmlElement`: Representación polimórfica de cualquier elemento visual:
  - Geometría normalizada: `geometry: { x, y, width, height, positionType, stretchType }`.
  - Contenedores: `children: JrxmlElement[]` para soportar anidamiento en `frame` y `elementGroup`.
  - Tipos soportados: `staticText`, `textField`, `image`, `line`, `rectangle`, `ellipse`, `frame`, `elementGroup`, `subreport`, `chart`.
  - Gráficos tipados: Conserva el subtipo (`barChart`, `pieChart`, `lineChart`, etc.) sin degradar a un tipo genérico.
  - Visibilidad condicional: `printWhenExpression`.

---

## 4. Flujo de Parsing

El parser [`src/model/jrxmlDocumentParser.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/model/jrxmlDocumentParser.ts) opera de la siguiente manera:

1. **Aislamiento de XML:** Configura `fast-xml-parser` para manejar atributos con prefijo `@_`, valores de texto planos y forzado de arrays en elementos clave.
2. **Extracción de Metadatos y Configuración Global:** Mapea atributos raíz y propiedades de reporte.
3. **Mapeo de Colecciones de Definición:** Construye los arrays tipados de `styles`, `parameters`, `fields`, `variables` y `groups`.
4. **Normalización de Bandas:** Recorre secuencialmente las bandas estándar y de grupo, extrayendo las alturas reales declaradas.
5. **Recursión de Elementos:** La función `parseElementsFromContainer()` inspecciona cada banda o contenedor y, al encontrar un `<frame>` o `<elementGroup>`, se invoca recursivamente sobre los nodos hijos preservando las coordenadas locales `(x, y)` originales.
6. **Detección de Gráficos Especializados:** Mapea etiquetas como `<barChart>`, `<pieChart>` y `<lineChart>` extrayendo el `reportElement` interno ubicado en el nodo hijo `<chart>`.

---

## 5. Cobertura del Fixture (`complex-report.jrxml`)

Resultados validados mediante el suite de pruebas [`tests/run-tests.js`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/tests/run-tests.js):

| Feature / Elemento | En XML Fixture | Sprint 0 (Baseline) | Sprint 1 (Document Model) | Cobertura Sprint 1 |
| :--- | :---: | :---: | :---: | :---: |
| **Total `<reportElement>`** | **85** | **45 (53%)** | **85 (100%)** | **100% (0% pérdida)** |
| `staticText` | 27 | 16 | 27 | 100% |
| `textField` | 32 | 19 | 32 | 100% |
| `rectangle` | 8 | 4 | 8 | 100% |
| `ellipse` | 3 | 0 | 3 | 100% |
| `line` | 6 | 5 | 6 | 100% |
| `frame` | 4 | 0 | 4 | 100% |
| `image` | 1 | 0 | 1 | 100% |
| `subreport` | 1 | 1 | 1 | 100% |
| `chart` (bar/pie/line) | 3 | 0 | 3 | 100% |
| `parameters` | 10 | 10 | 10 | 100% |
| `fields` | 16 | 16 | 16 | 100% |
| `variables` | 9 | 9 | 9 | 100% |
| `groups` | 1 | 1 | 1 | 100% |
| `bands` | 11 | 11 | 11 | 100% |
| `styles` | 13 | 0 | 13 | 100% |
| `printWhenExpression` | 8 | 0 | 8 | 100% |
| `box` | 9 | 0 | 9 | 100% |

---

## 6. Problemas Resueltos en Sprint 1

1. **Recuperación del 100% de Elementos (85/85):** Se eliminó la pérdida de información en el modelo de datos.
2. **Soporte de Contenedores y Anidamiento (`<frame>`):** Los 4 frames conservan todos sus elementos hijos (Title Header: 6 ítems, Title KPI Grid: 12 ítems, GroupHeader: 6 ítems, Summary Grand Totals: 7 ítems).
3. **Diferenciación de Gráficos:** Identificación exacta de `barChart`, `pieChart` y `lineChart` con títulos de gráfico y leyendas.
4. **Captura de `<ellipse>`:** Se extraen las 3 elipses con sus propiedades geométricas y de pluma.
5. **Corrección de Alturas de Banda en `JrxmlPropertiesProvider`:** Se eliminó el error donde las bandas reportaban `0px`. Ahora reflejan sus alturas reales (`background: 802px`, `title: 120px`, `pageHeader: 24px`, `columnHeader: 22px`, `detail: 20px`, `summary: 440px`, etc.).
6. **Restauración de Elementos en `JrxmlElementsProvider`:** Se corrigió el fallo `No elements found`; ahora el navegador de elementos expone el árbol completo de 11 bandas y sus elementos hijos y nietos (frames expandibles).
7. **Eliminación de Parsing Duplicado:** `JrxmlPropertiesProvider` y `JrxmlElementsProvider` ahora delegan exclusivamente en `parseJrxmlDocument()`.

---

## 7. Problemas Deliberadamente Pendientes para Sprints Posteriores

Conforme al alcance estricto de este sprint, las siguientes áreas no fueron modificadas y se abordarán en sprints subsiguientes:

- **Layout Engine Multi-página y Renderizado de Capas:** El renderer actual aún dibuja las bandas en una pila vertical en el Webview.
- **Renderizado de Gráficos SVG:** Los gráficos se encuentran en el modelo pero aún se representan mediante marcadores básicos en el canvas.
- **Herencia de Estilos y Cascada CSS:** Las etiquetas `<style>` están capturadas en el modelo, pero su resolución de herencia y traducción a CSS se desarrollará en el sprint de estilos.
- **Evaluación Dinámica de Expresiones:** Las expresiones `$F{}`, `$P{}`, `$V{}` se conservan en su forma original (`raw`) sin evaluación de datos simulados (mocking).
- **Persistencia Segura (Editor):** El guardado en archivo continúa utilizando temporalmente el mecanismo existente, el cual será reemplazado por un serializador AST en el sprint de edición.
