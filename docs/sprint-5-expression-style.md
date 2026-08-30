# Sprint 5 — Expression Evaluation & Style Resolution

Este documento detalla la arquitectura, el modelo de seguridad, el motor de evaluación de expresiones y el resolutor de cascada de estilos obtenidos durante el **Sprint 5: Expression Evaluation & Style Resolution** para la extensión Visual Studio Code *"JRXML Viewer & Editor"*.

---

## 1. Contexto y Objetivos del Sprint 5

En los Sprints anteriores se logró parsear el 100% del documento (85/85 elementos), estructurar el layout en páginas independientes (`595 × 842px`), renderizar en capas y mutar/guardar atómicamente el AST. Sin embargo:
- Los `textField` mostraban texto crudo como `$F{customerName}` o `$P{ReportTitle}` en lugar de datos legibles.
- Los **13 estilos de JasperReports** detectados no resolvían su herencia (`parentStyle`), de modo que elementos con `style="ReportTitleStyle"` no heredaban la tipografía ni bordes de `BaseStyle`.

El objetivo del **Sprint 5** fue:
1. Crear un **Motor de Evaluación de Expresiones** seguro, determinista y sin ejecución de código dinámico (`eval`, `Function`, o procesos externos).
2. Soportar resolución de `$P{...}`, `$F{...}`, `$V{...}`, literales, concatenación de cadenas, operadores ternarios, formateadores de fecha y patrones numéricos/moneda.
3. Crear un **Dataset de Laboratorio** (`PreviewDataset`) con agregaciones de variables (`Sum`, `Count`, `Average`) a nivel de reporte y grupo.
4. Implementar un **Resolutor de Estilos** (`JrxmlStyleResolver`) con herencia profunda, precedencia de propiedades, combinación de cajas/bordes y detección de referencias cíclicas.
5. Integrar los valores evaluados (`displayValue`) y estilos resueltos (`ResolvedStyle`) en el pipeline de Layout y Renderizado.

---

## 2. Arquitectura de Evaluación y Resolución de Estilos

```text
                  JrxmlDocument (AST)
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌──────────────────────┐              ┌──────────────────────┐
│  JrxmlStyleResolver  │              │EvaluationContext / DS│
│  (Cascada, Box, Pen) │              │ ($P, $F, $V, Rows)   │
└──────────┬───────────┘              └──────────┬───────────┘
           │                                     │
           │ (ResolvedStyle Map)                 │ (Evaluator)
           └───────────────────┬─────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │  JrxmlLayoutEngine  │  (Asigna displayValue y resolvedStyle)
                    └──────────┬──────────┘
                               ▼
                    ┌─────────────────────┐
                    │    LayoutResult     │
                    └──────────┬──────────┘
                               ▼
                    ┌─────────────────────┐
                    │    JrxmlRenderer    │  (Aplica estilos y renderiza displayValue)
                    └──────────┬──────────┘
                               ▼
                         Webview / DOM
```

---

## 3. Modelo de Seguridad (Zero-Eval Engine)

> [!IMPORTANT]
> El motor de evaluación **NO** invoca `eval()`, `new Function()`, Java JVM ni procesos de terminal (`child_process`). Opera como un parser/intérprete puramente sintáctico sobre un subconjunto cerrado y seguro de expresiones JasperReports.

### Subconjunto Soportado:
- **Referencias:** `$P{ParameterName}`, `$F{FieldName}`, `$V{VariableName}`.
- **Literales:** Cadenas de texto (`"..."`), enteros, flotantes, booleanos (`true`, `false`, `Boolean.TRUE`), `null`.
- **Constructores:** `Integer.valueOf(...)`, `new java.util.Date(...)`.
- **Concatenación:** Operador `+` de nivel superior (ej. `"Customer: " + $F{customerName}`).
- **Operador Ternario:** `cond ? val1 : val2` y método `.equals(...)`.
- **Formateo de Fechas:** Adaptador sintáctico para `(new SimpleDateFormat("yyyy-MM-dd")).format(...)`.
- **Patrones de Formato:** `pattern="$ #,##0.00"`, `pattern="yyyy-MM-dd"`, `pattern="#,##0"`.
- **Agregaciones:** Variables con `calculation="Sum"`, `Count`, `Average` para ámbito global y por grupo.

### Expresiones No Soportadas:
Cualquier expresión que exceda este subconjunto seguro recibe el estado `UNSUPPORTED`, preservando la expresión original para inspección sin provocar excepciones.

---

## 4. Resolutor de Cascada de Estilos (`JrxmlStyleResolver`)

### Jerarquía y Precedencia:
1. **Propiedades Explícitas del Elemento** (ej. `fontSize="24"` directo en el elemento).
2. **Estilo Asignado (`styleName`)** (ej. `style="ReportTitleStyle"`).
3. **Estilo Padre (`parentStyle`)** (ej. `ReportTitleStyle` hereda `fontName="SansSerif"` de `BaseStyle`).
4. **Estilo por Defecto (`isDefault="true"`)** (`BaseStyle`).

### Detección de Ciclos:
Si dos estilos se referencian mutuamente (`StyleA -> StyleB -> StyleA`), el resolutor detecta el ciclo mediante un conjunto de nodos visitados y corta la recursión garantizando estabilidad total.

---

## 5. Resultados de Verificación de Todas las Suites de Pruebas

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
✔ Test 1: $P{ReportTitle} resolves correctly.
✔ Test 2: $F{customerName} resolves correctly.
✔ Test 3: $V{totalTransactionsCount} resolves correctly.
✔ Test 4: Missing field produces MISSING status.
✔ Test 5: Missing parameter produces MISSING status.
✔ Test 6: Literal string expression resolves.
✔ Test 7: Numeric literal expression resolves.
✔ Test 8: Boolean literal expression resolves.
✔ Test 9: String concatenation expression resolves.
✔ Test 10: Ternary conditional expression resolves.
✔ Test 11: Date formatting adapter resolves.
✔ Test 12: Numeric formatting with pattern resolves.
✔ Test 13: Unsupported expression generates UNSUPPORTED status without executing code.
✔ Test 14: Original raw expression is preserved.
✔ Test 15: Security audit verified (0 dynamic code execution, 0 shell calls).
✔ Test 16: Variable aggregation Sum calculation verified.
✔ Test 17: Variable aggregation Count calculation verified.
✔ Test 18: Variable aggregation Average calculation verified.
✔ Test 19: Report scope aggregation verified.
✔ Test 20: Group scope aggregation for North America verified.
✔ Test 21: PrintWhenExpression evaluation on supported subset verified.
   21/21 tests PASSED (100%)
======================================================================
6. SPRINT 5 — Style Resolution (tests/style/run-style-tests.js)
✔ Test 1: 13 styles loaded from complex-report.jrxml.
✔ Test 2: styleName BaseStyle resolves directly.
✔ Test 3: parentStyle inheritance works (inherits fontName SansSerif from BaseStyle).
✔ Test 4: Multi-level inheritance & box property merging works.
✔ Test 5: Element override takes precedence over style definition.
✔ Test 6: Style override takes precedence over parentStyle.
✔ Test 7: Cyclic styles are detected safely without infinite recursion.
✔ Test 8: ResolvedStyle contains effective box paddings and pens.
   8/8 tests PASSED (100%)
======================================================================
TOTAL SUITES: 86/86 TESTS PASSED (100%)
======================================================================
```

---

## 6. Limitaciones Deliberadamente Postergadas

- **Conexión a Bases de Datos / SQL:** La preview utiliza exclusivamente el `PreviewDataset` sintético en memoria.
- **Compilador Java Completo:** Expresiones con métodos arbitrarios no registrados se mantienen en modo seguro como `UNSUPPORTED`.
- **Renderizado Gráfico con Chart.js / D3:** Se abordará en una fase dedicada a trazado dinámico de gráficos.
