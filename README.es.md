# JRXML Viewer & Editor

*[🇺🇸 Read in English](./README.md)*

Una extensión profesional de Visual Studio Code para visualizar y editar archivos JasperReports JRXML con preview visual interactivo en tiempo real.

**Creado por Yamid Cueto para la comunidad Java y JasperReports**

![JRXML Viewer](https://img.shields.io/badge/version-0.1.4-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-1.85%2B-blue.svg)

## 🎯 Características

### Editor Visual & Vista Previa
- **Vista previa visual interactiva**: Visualiza la estructura completa de tus reportes JRXML directamente en VS Code
- **Elementos clickeables**: Haz click en cualquier elemento para ver sus propiedades detalladas
- **Panel de propiedades**: Inspecciona y analiza cada elemento con información completa
- **Tooltips informativos**: Información detallada al pasar el mouse sobre elementos
- **Export a HTML**: Exporta tus reportes a archivos HTML standalone
- **Zoom y paneo interactivo**: Controla el zoom con botones, teclado o rueda del mouse. Paneo arrastrando
- **Vista de código fuente**: Alterna entre editor visual y código XML con un click

### Panel Lateral JRXML Explorer
- **Panel de Archivos JRXML**: Navega todos los archivos .jrxml en tu workspace con estructura de carpetas
- **Panel de Propiedades**: Propiedades del documento en tiempo real incluyendo:
  - Dimensiones y márgenes del reporte
  - Tamaño y orientación de página
  - Conteo de parámetros, campos y variables
  - Información de bandas y estadísticas
- **Navegador de Elementos**: Vista de árbol jerárquico de todos los elementos organizados por banda
  - Navegación rápida a través de la estructura del reporte
  - Información de posición y tamaño de cada elemento
  - Iconos visuales para diferentes tipos de elementos

### Navegación Avanzada
- **Syntax highlighting**: Resaltado de sintaxis mejorado para archivos JRXML
- **Visualización de bandas**: Identifica fácilmente header, detail, footer y otras bandas del reporte
- **Elementos visuales**: Muestra textFields, staticTexts, imágenes, líneas, rectángulos, subreportes y gráficos
- **Integración con workspace**: Icono dedicado en la barra de actividades para acceso rápido
- **Soporte completo**: Compatible con todos los elementos principales de JasperReports

## 📦 Instalación

### Desde VS Code Marketplace (próximamente)
1. Abre VS Code
2. Ve a la vista de Extensiones (Ctrl+Shift+X)
3. Busca "JRXML Viewer"
4. Haz clic en "Install"

### Instalación manual para desarrollo
1. Clona este repositorio
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Compila el proyecto:
   ```bash
   npm run compile
   ```
4. Presiona F5 para abrir una nueva ventana de VS Code con la extensión cargada

## 🚀 Uso

### Abriendo Archivos JRXML
1. Abre cualquier archivo `.jrxml` en VS Code
2. La extensión automáticamente abrirá el visor visual
3. **Cambiar vistas**:
   - Haz click en el botón **`</>`** en la barra del editor para ver el código XML
   - Click derecho en cualquier archivo `.jrxml` en el Explorador → "Open JRXML Source"
   - Usa el panel lateral JRXML Explorer para navegar y abrir archivos

### Panel Lateral JRXML Explorer
1. Haz click en el icono JRXML en la Barra de Actividades (barra lateral izquierda)
2. **JRXML Files**: Navega todos los reportes en tu workspace
   - Click en cualquier archivo para abrir en el editor visual
   - Usa el botón de actualizar para recargar la lista de archivos
3. **Properties**: Ver metadata del documento y estadísticas
4. **Elements**: Navega a través de la estructura del reporte por banda
   - Expande bandas para ver los elementos contenidos
   - Ver información de posición y tamaño

### Atajos de teclado

- `Ctrl/Cmd + +`: Aumentar zoom
- `Ctrl/Cmd + -`: Disminuir zoom
- `Ctrl/Cmd + 0`: Resetear zoom al 100%
- `Ctrl/Cmd + Wheel`: Zoom con la rueda del mouse
- `Click + Arrastrar`: Paneo del canvas
- `Doble-click`: Resetear zoom y posición
- `Escape`: Cerrar panel de propiedades/deseleccionar elemento

### Comandos

- `JRXML: Open Preview`: Abre la vista previa del archivo JRXML actual
- `JRXML: Open JRXML Source`: Abre el editor de código XML
- `JRXML: Refresh JRXML Files`: Actualiza la lista de archivos en el panel lateral

### Configuración

| Configuración | Descripción | Por defecto |
|---------------|-------------|-------------|
| `jrxml-viewer.defaultView` | Elige qué vista abrir por defecto al abrir archivos JRXML. Opciones: `preview` (editor visual) o `source` (código XML) | `preview` |

Para cambiar la vista por defecto:
1. Abre la Configuración de VS Code (Ctrl+,)
2. Busca "JRXML Viewer"
3. Selecciona tu vista preferida

### Botones de la interfaz

- **📄 Export HTML**: Exporta el reporte a un archivo HTML
- **🔧 Properties**: Abre/cierra el panel de propiedades
- **+/-**: Controles de zoom
- **</>**: Cambiar a vista de código XML

## 🔧 Desarrollo

### Requisitos previos
- Node.js 20.x o superior
- npm 9.x o superior
- Visual Studio Code 1.85.0 o superior

### Estructura del proyecto

```
jrxml-viewer-extension/
├── src/
│   ├── extension.ts              # Punto de entrada de la extensión
│   ├── jrxmlEditorProvider.ts    # Proveedor del editor personalizado
│   ├── jrxmlParser.ts            # Parser de archivos JRXML
│   ├── jrxmlFilesProvider.ts     # Proveedor del explorador de archivos
│   ├── jrxmlPropertiesProvider.ts # Proveedor del panel de propiedades
│   └── jrxmlElementsProvider.ts  # Proveedor del navegador de elementos
├── media/
│   ├── preview.css               # Estilos del visor
│   ├── preview.js                # Lógica del visor
│   └── jrxml-icon.svg            # Icono de la extensión
├── .vscode/
│   ├── launch.json               # Configuración de debug
│   └── tasks.json                # Tareas de build
├── package.json                  # Manifiesto de la extensión
└── tsconfig.json                 # Configuración de TypeScript
```

### Scripts disponibles

```bash
npm run compile      # Compila TypeScript
npm run watch        # Compila en modo watch
npm run lint         # Ejecuta el linter
npm run package      # Empaqueta la extensión para publicación
```

### Debug

1. Abre el proyecto en VS Code
2. Presiona F5 o selecciona "Run Extension" en el panel de Debug
3. Se abrirá una nueva ventana de VS Code con la extensión cargada
4. Abre un archivo `.jrxml` para probar

## 📝 Elementos soportados

### Bandas
- ✅ Title
- ✅ Page Header
- ✅ Column Header
- ✅ Group Header
- ✅ Detail
- ✅ Group Footer
- ✅ Column Footer
- ✅ Page Footer
- ✅ Summary
- ✅ Background
- ✅ Last Page Footer
- ✅ No Data

### Elementos
- ✅ Static Text
- ✅ Text Field
- ✅ Image
- ✅ Line
- ✅ Rectangle
- ✅ Subreport
- ✅ Chart (visualización básica)
- ⏳ Barcode (próximamente)

### Propiedades
- ✅ Position (x, y, width, height)
- ✅ Text alignment
- ✅ Font properties
- ✅ Colors (foreground, background)
- ✅ Borders
- ✅ Patterns
- ✅ Expressions

## 🛣️ Roadmap

### Completado ✅
- [x] Vista previa visual con elementos clickeables
- [x] Controles de zoom y paneo interactivos
- [x] Panel lateral JRXML Explorer con tres paneles
- [x] Navegación de propiedades y elementos
- [x] Funcionalidad de exportar a HTML
- [x] Cambio entre vista visual y código fuente
- [x] Zoom con rueda del mouse y navegación arrastrando
- [x] Navegador de archivos del workspace
- [x] Estadísticas del documento en tiempo real

### En Progreso 🚧
- [ ] Editor visual interactivo (drag & drop)
- [ ] Scroll al elemento en código fuente
- [ ] Sincronización de selección de elementos

### Planeado 📋
- [ ] Soporte completo para charts y gráficos complejos
- [ ] Exportar a PDF desde VS Code
- [ ] Validación de sintaxis en tiempo real
- [ ] Snippets para elementos comunes
- [ ] Autocompletado inteligente
- [ ] Integración con JasperReports Server
- [ ] Preview con datos de ejemplo

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Si deseas contribuir:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👨‍💻 Autor

**Yamid Cueto**
- GitHub: [@YamiCueto](https://github.com/YamiCueto)
- Extensión creada para la comunidad Java y JasperReports
- Contribuciones y sugerencias son bienvenidas

## 🙏 Agradecimientos

- A la comunidad de JasperReports por crear una herramienta tan poderosa
- A todos los desarrolladores Java que trabajan con reportes día a día
- A la comunidad de VS Code por proporcionar una plataforma extensible

## 📧 Contacto y Soporte

Si tienes preguntas, sugerencias o encuentras algún bug:
- Abre un issue en el [repositorio de GitHub](https://github.com/YamiCueto/jrxml-viewer-extension/issues)
- Deja una reseña en el [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=yamid.jrxml-viewer)

## 📊 Estadísticas

- **Versión actual**: 0.1.4
- **Fecha de lanzamiento**: 16 de diciembre de 2025
- **Compatible con**: VS Code 1.85.0+
- **Licencia**: MIT
- **Lenguaje**: TypeScript
- **Dependencias**: fast-xml-parser

## 📝 Historial de Cambios

Ver [CHANGELOG.md](./CHANGELOG.md) para el historial detallado de versiones.

### Últimas Actualizaciones (v0.1.4)
- ✨ Agregado comando "Open JRXML Source"
- 🐛 Corregido bug crítico de bucle infinito en el panel de Elementos
- 🔧 Mejorada integración del editor personalizado con los paneles laterales
- 📊 Agregado canal de output para debugging

---

**¡Hecho con ❤️ por Yamid Cueto para la comunidad Java!**

*Si esta extensión te resulta útil, considera dejar una ⭐ en GitHub y una reseña en el Marketplace*
