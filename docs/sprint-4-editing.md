# Sprint 4 — Bidirectional Editing & Safe JRXML Persistence

Este documento detalla la arquitectura, el sistema de identificación estructural de elementos, la API de mutación del AST, el serializador XML y la validación de integridad obtenidos durante el **Sprint 4: Bidirectional Editing & Safe JRXML Persistence** para la extensión Visual Studio Code *"JRXML Viewer & Editor"*.

---

## 1. Contexto y Objetivos del Sprint 4

En el **Sprint 0** se identificó el fallo crítico **KF-08 (Fragile Regex Mutation)**:
La función `updateElementInFile` localizaba elementos en el XML buscando coincidencias de coordenadas `(x, y)` mediante expresiones regulares. Cuando dos o más elementos compartían coordenadas (por ejemplo, `x=0, y=0`), el sistema mutaba el elemento equivocado o dañaba el XML.

El objetivo del **Sprint 4** fue:
1. **Eliminar por completo las expresiones regulares y las búsquedas por coordenadas** para edición y guardado.
2. Crear un sistema de **Identificación Estructural** (`ElementId`) determinista y único, **sin insertar atributos artificiales en el archivo JRXML**.
3. Implementar un **Document Mutator** tipado (`jrxmlDocumentMutator.ts`) con función de búsqueda inequívoca (`findElement`) y aplicación de parches (`JrxmlElementPatch`).
4. Implementar un **Serializador JRXML completo** (`jrxmlSerializer.ts`) capaz de transformar un `JrxmlDocument` en XML válido preservando el 100% de la semántica.
5. Implementar **Guardado Atómico y Validación Previa**: `Document Model` $\rightarrow$ `Serializer` $\rightarrow$ `Validación (Parse)` $\rightarrow$ `Escritura en disco`.
6. Garantizar **Round-Trip Semántico**: `JRXML` $\rightarrow$ `Parse` $\rightarrow$ `Serialize` $\rightarrow$ `Parse` sin pérdida de elementos, expresiones, estilos, frames ni subtipos de gráficos.

---

## 2. Arquitectura de Edición y Persistencia

```text
       UI / Webview (Propiedades)
                 │
                 ▼ (elementId + patch)
      ┌──────────────────────┐
      │  jrxmlDocumentMutator│
      └──────────┬───────────┘
                 │ (Mutación in-place del AST)
                 ▼
      ┌──────────────────────┐
      │ JrxmlDocument (AST)  │ ◄── [Fuente Única de Verdad]
      └──────────┬───────────┘
                 │
        ┌────────┴──────────────────────────┐
        ▼ (Live Preview)                    ▼ (Guardado Seguro)
┌──────────────────────┐           ┌──────────────────────┐
│  JrxmlLayoutEngine   │           │   JrxmlSerializer    │
└──────────┬───────────┘           └──────────┬───────────┘
        │                                  │ (Genera XML)
        ▼                                  ▼
┌──────────────────────┐           ┌──────────────────────┐
│    JrxmlRenderer     │           │  Validación (Parse)  │
└──────────┬───────────┘           └──────────┬───────────┘
        │                                  │ (Si es válido)
        ▼                                  ▼
   DOM / Canvas                     workspace.fs.writeFile
```

---

## 3. Identificación Estructural de Elementos (`ElementId`)

Para evitar contaminar los archivos JRXML con atributos inventados (como `id="internal-123"`), la identidad de cada elemento se deriva de su **posición estructural determinista en el árbol**:

$$\text{ElementId} = \text{band:}\langle \text{tipoBanda} \rangle /\text{el:}\langle i_0 \rangle /\text{el:}\langle i_1 \rangle \dots /\text{el:}\langle i_k \rangle$$

### Ejemplos
- Elemento de primer nivel en banda: `band:title/el:0`
- Elemento hijo dentro de un `<frame>`: `band:title/el:0/el:3`
- Elemento profundamente anidado en frames recursivos: `band:detail/el:0/el:0/el:1`

### Propiedades de la Identidad
- **Unicidad:** Exactamente 85 IDs únicos generados para los 85 elementos del fixture.
- **Inmunidad a Colisiones:** Dos elementos en `(x=0, y=0)` (por ejemplo, el rectángulo de encabezado y el primer título de columna) tienen IDs estructurales distintos (`band:columnHeader/el:9` y `band:columnHeader/el:0`) y se mutan de forma 100% independiente.

---

## 4. API de Mutación (`jrxmlDocumentMutator.ts`)

La mutación opera sobre el `JrxmlDocument` en memoria mediante un parche fuertemente tipado (`JrxmlElementPatch`):

```typescript
export interface JrxmlElementPatch {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    text?: string;
    expression?: string;
    pattern?: string;
    fontName?: string;
    fontSize?: number;
    isBold?: boolean;
    isItalic?: boolean;
    isUnderline?: boolean;
    isStrikeThrough?: boolean;
    forecolor?: string;
    backcolor?: string;
    mode?: string;
    horizontalAlignment?: string;
    verticalAlignment?: string;
    rotation?: string;
    radius?: number;
}
```

La función `findElement(doc, elementId)` localiza exactamente el nodo solicitado y `mutateElement(doc, elementId, patch)` valida que las propiedades correspondan al tipo de elemento (por ejemplo, `text` en `staticText`, `expression` en `textField`, `radius` en `rectangle`).

---

## 5. Serializador JRXML y Guardado Atómico

El serializador [`src/editing/jrxmlSerializer.ts`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/src/editing/jrxmlSerializer.ts) reconstruye el documento XML completo:
- Metadatos y propiedades de reporte.
- Estilos con sus definiciones de bordes `<box>` y `<pen>`.
- Parámetros, campos, variables y grupos con sus expresiones `<![CDATA[...]]>`.
- Bandas normalizadas y elementos visuales (`staticText`, `textField`, `rectangle`, `ellipse`, `line`, `image`, `frame`, `elementGroup`, `subreport`, `chart`).
- Preservación explícita de subtipos de gráficos (`<barChart>`, `<pieChart>`, `<lineChart>`).

### Protocolo de Guardado Atómico
1. Se serializa el `JrxmlDocument` a string XML.
2. Se ejecuta `parseJrxmlDocument(newXml)` para validar que el XML generado sea sintácticamente y conceptualmente válido.
3. Solo si la validación es exitosa, se invoca `vscode.workspace.fs.writeFile`. Si falla, se bloquea la escritura protegiendo el archivo original contra cualquier corrupción.

---

## 6. Resultados de Verificación de Pruebas

```text
Running Bidirectional Editing & Persistence Verification Suite...

✔ Test 1 & 2: 85 unique structural ElementIds generated.
✔ Test 3 & 4: Elements and nested frames receive unique structural IDs.
✔ Test 5: Structural lookup findElement() resolves exact element, parent, and band.
✔ Test 6: Mutating staticText.text affects ONLY the target element.
✔ Test 7: Mutating textField.expression affects ONLY the target element.
✔ Test 8: Mutating rectangle.width affects ONLY the target element.
✔ Test 9: Mutating ellipse.height affects ONLY the target element.
✔ Test 10: Mutating frame container affects the frame without altering other bands.
✔ Test 11: Collision Test PASS (Two elements sharing x=0, y=0 mutate independently).
✔ Test 12: Nested frame child mutation does not alter parents or siblings.
✔ Test 13: Round-Trip PASS (85 elements, 11 bands, 13 styles, 10 params, 16 fields, 9 vars, 1 group).
✔ Test 14: Expression Preservation PASS ($F{}, $P{}, $V{} expressions intact).
✔ Test 15: Chart Subtype Preservation PASS (barChart, pieChart, lineChart intact).
✔ Test 16: Frame Hierarchy Preservation PASS (Nested frames & children intact).

========================================
All 16 Editing & Persistence Tests PASSED (100%)
========================================
```

---

## 7. Limitaciones Deliberadamente Postergadas

- **Historial Undo / Redo:** La gestión de historial temporal se incorporará en etapas posteriores.
- **Inserción y Eliminación de Elementos:** El sistema actual soporta mutación completa de propiedades existentes; la creación interactiva de nuevos elementos (drag & drop desde paleta) se integrará con las herramientas de autoría visual.
- **Edición Gráfica de Charts:** Los parámetros avanzados de datasets y plots se conservan intactos en el AST pero no se editan desde el formulario básico de propiedades.
