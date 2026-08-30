# Fixture de Pruebas JRXML: Complex Enterprise Sales & Customer Report

Este directorio contiene los fixtures de prueba para validar y realizar pruebas de regresión visual y estructural sobre la extensión **"JRXML Viewer & Editor"** para Visual Studio Code.

---

## 1. Contenido del Fixture (`complex-report.jrxml`)

El archivo [`complex-report.jrxml`](file:///c:/Users/YAMI/Documents/projects/jrxml-viewer-extension/tests/fixtures/complex-report.jrxml) es un reporte empresarial completo que simula un informe de ventas corporativas y auditoría de clientes (*"Enterprise Sales & Customer Performance Summary"*). 

Está construido bajo el esquema estándar de JasperReports (`http://jasperreports.sourceforge.net/xsd/jasperreport.xsd`) y sintetiza todas las estructuras fundamentales de JRXML sin recurrir a datos aleatorios.

### Resumen Cuantitativo de Elementos

| Tipo de Elemento / Estructura | Cantidad | Descripción |
| :--- | :---: | :--- |
| **Configuración de Reporte** | 1 | Dimensiones A4 (595x842), márgenes (20px), orientación Portrait, UUID y lenguaje Java. |
| **Styles (Estilos Reutilizables)** | 13 | Estilos base, cabeceras, celdas de tabla, tarjetas KPI, bordes `<box>` y herencia. |
| **Parámetros (`<parameter>`)** | 10 | Tipos `String`, `Integer`, `Date`, `Boolean`, con `defaultValueExpression` y flags `isForPrompting`. |
| **Campos (`<field>`)** | 16 | Tipos `String`, `Integer`, `Long`, `BigDecimal`, `Date`, `Boolean`. |
| **Variables (`<variable>`)** | 9 | Cálculos `Nothing`, `Sum`, `Count`, `Average`, con `resetType="Group"` y `resetType="Report"`. |
| **Grupos (`<group>`)** | 1 | Grupo funcional `RegionGroup` con `groupExpression`, `groupHeader` y `groupFooter`. |
| **Bandas (`<band>`)** | 11 | `background`, `title`, `pageHeader`, `columnHeader`, `detail`, `columnFooter`, `pageFooter`, `summary`, `noData`, `groupHeader-RegionGroup`, `groupFooter-RegionGroup`. |
| **Contenedores Frame (`<frame>`)** | 4 | Elementos anidados en Title (Header y KPI Grid), GroupHeader y Summary. |
| **Textos Estáticos (`<staticText>`)** | 27 | Diversidad de fuentes, tamaños (7pt - 44pt), colores, alineaciones, `rotation="Left"` y `markup="html"`. |
| **Campos de Texto (`<textField>`)** | 32 | Expresiones `$F{}`, `$P{}`, `$V{}`, patrones de moneda/fecha, `evaluationTime`, `isBlankWhenNull` y `isStretchWithOverflow`. |
| **Imágenes (`<image>`)** | 1 | Expresión URL remota con escalado y alineación. |
| **Líneas (`<line>`)** | 6 | Horizontales y verticales (`direction="BottomUp"`), estilos `Solid` y `Dashed`. |
| **Rectángulos (`<rectangle>`)** | 8 | Con bordes redondeados (`radius`), rellenos opacos y transparentes. |
| **Elipses (`<ellipse>`)** | 3 | Elementos circulares para insignias de estado, watermark y alertas. |
| **Gráficos (`<chart>`)** | 3 | Gráfico de barras (`<barChart>`), pastel (`<pieChart>`) y líneas (`<lineChart>`) con datasets completos. |
| **Subreportes (`<subreport>`)** | 1 | Expresión de archivo `.jasper`, parámetros hijos (`<subreportParameter>`) y conexión. |
| **Condiciones (`<printWhenExpression>`)** | 8 | Pruebas de visibilidad condicional en columnas, tarjetas KPI, gráficos y marcas de agua. |

---

## 2. Features de JasperReports que Prueba el Fixture

1. **Configuración Global del Documento:**
   - Atributos raíz: `name`, `pageWidth`, `pageHeight`, `orientation`, `columnWidth`, `columnSpacing`, márgenes (`leftMargin`, `rightMargin`, `topMargin`, `bottomMargin`), `uuid`, `language`, `whenNoDataType`.
   - Propiedades de reporte (`<property>`).

2. **Tipado y Evaluación de Datos:**
   - Parámetros con valores por defecto evaluados en Java (`new java.util.Date()`, `Integer.valueOf()`, `Boolean.TRUE`).
   - Mapeo exhaustivo de datos relacionales en fields: `Long`, `BigDecimal`, `Date`, `Boolean`, `String`, `Integer`.
   - Variables de agregación con reinicio por grupo (`resetGroup`) y a nivel de reporte global.

3. **Ciclo de Vida de Bandas y Secciones:**
   - Renderizado en capas: `background` para filigrana y bordes de página completa.
   - Cabecera y pie de página en ejecución continua (`pageHeader`, `pageFooter`).
   - Agrupación jerárquica con subtotales en `groupFooter` y títulos en `groupHeader`.
   - Resumen final (`summary`) con cálculos globales y visualizaciones.
   - Estado vacío controlado mediante banda `noData`.

4. **Geometría, Coordenadas y Layout:**
   - Posicionamiento absoluto `(x, y, width, height)`.
   - Elementos adyacentes continuos (estructura tabular sin solapamiento en `columnHeader` y `detail`).
   - Comportamientos de estiramiento y flotación: `positionType="Float"`, `positionType="FixRelativeToTop"`, `positionType="FixRelativeToBottom"`, `stretchType="RelativeToTallestObject"`.
   - Soporte de cajas y bordes (`<box>`, `<topPen>`, `<bottomPen>`, `<leftPen>`, `<rightPen>`, padding individual).

5. **Tipografía y Renderizado de Texto:**
   - Alineación horizontal (`Left`, `Center`, `Right`, `Justified`) y vertical (`Top`, `Middle`, `Bottom`).
   - Formateo mediante patrones JasperReports (`$ #,##0.00`, `yyyy-MM-dd`, `yyyy-MM-dd HH:mm:ss`, `#,##0`).
   - Evaluación diferida: `evaluationTime="Report"`, `evaluationTime="Group"`, `evaluationTime="Now"`.
   - Contenido enriquecido con etiquetas `markup="html"` y `markup="styled"`.
   - Manejo de nulos: `isBlankWhenNull="true"`.
   - Rotación de texto (`rotation="Left"`).

6. **Estructuras Avanzadas y Anidamiento:**
   - Contenedores `<frame>` con coordenadas relativas internas.
   - Subreportes con mapeo de parámetros e inyección de `$P{REPORT_CONNECTION}`.
   - Gráficos estadísticos con `<categoryDataset>` y `<pieDataset>`.

---

## 3. Elementos que Espera Detectar el Parser

El subsistema de análisis de la extensión (`src/jrxmlParser.ts`, `src/jrxmlPropertiesProvider.ts`, `src/jrxmlElementsProvider.ts`) espera extraer:

- **Metadatos del Documento:** Nombre, resolución de página, márgenes, orientación y lista de bandas activas.
- **Colección de Parámetros:** Nombre, clase Java y valor por defecto.
- **Colección de Fields:** Nombre y tipo de clase.
- **Colección de Variables:** Nombre, tipo, método de cálculo y expresión.
- **Grupos:** Nombre del grupo y expresión asociada.
- **Elementos Visuales por Banda:** Coordenadas `(x, y)`, tamaño `(width, height)`, tipo de elemento (`staticText`, `textField`, `image`, `line`, `rectangle`, `subreport`, `chart`), contenido textual/expresión, colores (`forecolor`, `backcolor`) y atributos de fuente.

---

## 4. Features que el Viewer Actual Probablemente NO Renderizará Correctamente

A partir del análisis del código fuente actual de la extensión, se identifican las siguientes discrepancias o limitaciones visuales al cargar este fixture:

1. **Elementos Anidados dentro de `<frame>`:**
   - `src/jrxmlParser.ts` lee los elementos hijos directamente a nivel de `<band>`. No desempaqueta recursivamente los elementos contenidos dentro de `<frame>`. Por lo tanto, los textos, imágenes y tarjetas métricas ubicados dentro de `<frame>` en `title`, `groupHeader` y `summary` no se proyectan en el canvas del Webview.
2. **Estructuras de Gráficos Específicos (`<barChart>`, `<pieChart>`, `<lineChart>`):**
   - El parser busca `band.chart`. En la sintaxis estándar de JasperReports, la etiqueta raíz del gráfico es `<barChart>`, `<pieChart>` o `<lineChart>`, teniendo `<chart>` como elemento interno hijo. El visor actual no reconoce la etiqueta externa tipada y por tanto no genera el placeholder correspondiente en el canvas.
3. **Etiquetas `<ellipse>`:**
   - `src/jrxmlElementsProvider.ts` y `jrxmlPropertiesProvider.ts` incluyen `ellipse`, pero `src/jrxmlParser.ts` no la incluye en su función `parseBandElements`. Como consecuencia, las elipses son ignoradas por el generador HTML del Webview.
4. **Banda `<noData>` y `<background>` en el Canvas:**
   - El cálculo de altura total del canvas suma las alturas de todas las bandas, acumulando secuencialmente `background` (802px) y `noData` (120px) en lugar de posicionar `background` como una capa absoluta inferior (z-index) y conmutar `noData` de forma excluyente.
5. **Detección de Bandas en los Proveedores de Árbol (`TreeDataProvider`):**
   - En `JrxmlPropertiesProvider.ts` y `JrxmlElementsProvider.ts`, el código consulta `report[bandType]` asumiendo la estructura antigua sin etiqueta `<band>` intermedia. Al encontrar la estructura estándar moderna `<title><band height="..."></band></title>`, las propiedades de altura retornan `0px` y la lista de elementos en el árbol lateral aparece vacía a pesar de existir en el XML.
6. **Estilos Heredados (`<style>`):**
   - El renderer no procesa las etiquetas `<style>` a nivel de reporte ni aplica la cascada CSS para los elementos que referencian `style="TableHeaderStyle"` o `style="CurrencyCell"`.
7. **Formateo de Patrones y Expresiones Java:**
   - Las expresiones complejas (como `new java.text.SimpleDateFormat(...)` o `$F{discountAmount} != null ? ... : ...`) se imprimen como cadenas literales en lugar de evaluarse o formatearse con datos mock.

---

## 5. Features Objetivo para Futuros Sprints

Para evolucionar el visor y editor visual hacia soporte completo de nivel de producción:

1. **Parser Recursivo Universal para Contenedores:**
   - Soportar `<frame>` y `<elementGroup>` extrayendo recursivamente sus elementos hijos y calculando sus coordenadas absolutas acumuladas `(frame.x + element.x, frame.y + element.y)`.
2. **Soporte Completo de Jerarquía de Bandas Modernas:**
   - Normalizar la navegación de bandas en los proveedores de árbol (`JrxmlPropertiesProvider`, `JrxmlElementsProvider`) para procesar indistintamente `report[bandType].band` o `report[bandType]`.
3. **Mapeo Integral de Tipos de Gráficos:**
   - Soportar `<barChart>`, `<pieChart>`, `<lineChart>`, `<stackedBarChart>`, `<areaChart>`, `<ganttChart>`, etc., reconociendo el `<reportElement>` anidado dentro de su etiqueta `<chart>`.
4. **Soporte de Formas Adicionales y Bordes:**
   - Incorporar `<ellipse>` en el parser y renderizar `<box>` con bordes CSS reales (`border-top`, `border-bottom`, `padding`).
5. **Motor de Estilos y Temas:**
   - Resolver herencia de estilos `<style name="..." style="...">` y traducirlos a reglas CSS aplicables a las clases del Webview.
6. **Manejo de Capas y Vista Previa con Datos Mock:**
   - Renderizar `background` como capa de fondo independiente con `position: absolute; pointer-events: none;`.
   - Proveer un motor liviano de datos simulados (mock data generator) para poblar expresiones `$F{}` y evaluar variables `$V{}` en la vista previa interactiva.
