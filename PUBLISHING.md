# 📦 Guía de Publicación - JRXML Viewer & Editor

Este documento describe el flujo y los requisitos para empaquetar y publicar nuevas versiones de la extensión **JRXML Viewer & Editor** (`YamidCuetoMazo.jrxml-viewer`) en el Visual Studio Code Marketplace y GitHub Releases.

---

## 1. Información General de Publicación

- **Publisher ID:** `YamidCuetoMazo`
- **Extension Name:** `jrxml-viewer`
- **Identificador en Marketplace:** `YamidCuetoMazo.jrxml-viewer`
- **Marketplace URL:** `https://marketplace.visualstudio.com/items?itemName=YamidCuetoMazo.jrxml-viewer`
- **Repositorio:** `https://github.com/YamiCueto/jrxml-viewer-extension`

---

## 2. Automatización con GitHub Actions (Recomendado)

El repositorio cuenta con un flujo automatizado en [`.github/workflows/release.yml`](./.github/workflows/release.yml) que se activa automáticamente al empujar un tag de versión (`v*.*.*`).

### Flujo Automático:
1. Verifica el código y compila TypeScript (`npm run compile`).
2. Empaqueta la extensión generando el archivo `.vsix`.
3. Extrae la sección correspondiente de [`CHANGELOG.md`](./CHANGELOG.md).
4. Crea una Release en GitHub adjuntando el `.vsix`.
5. Publica automáticamente la nueva versión en el VS Code Marketplace usando el secret `VSCE_PAT`.

### Pasos para Liberar una Nueva Versión:

```bash
# 1. Asegurar que las suites de pruebas pasen y el código compile
npm run compile
node tests/run-tests.js
node tests/layout/run-layout-tests.js
node tests/render/run-render-tests.js
node tests/editing/run-editing-tests.js
node tests/expression/run-expression-tests.js
node tests/style/run-style-tests.js
node tests/visual/run-visual-tests.js
node tests/charts/run-chart-tests.js

# 2. Confirmar cambios y crear tag
git add .
git commit -m "Release v0.2.0"
git tag v0.2.0

# 3. Empujar commits y tags a GitHub
git push origin main
git push origin v0.2.0
```

---

## 3. Publicación Manual Local (Alternativa)

Si requieres empaquetar o publicar localmente mediante la herramienta CLI oficial `@vscode/vsce`:

### Prerrequisitos:
- Tener instalado `@vscode/vsce` globalmente o usar `npx vsce`.
- Un Personal Access Token (PAT) de Azure DevOps configurado con el scope `Marketplace (Manage)`.

### Empaquetado Local:
```bash
# Compilar el proyecto
npm run compile

# Generar el archivo .vsix
npx vsce package
```
Esto genera el archivo `jrxml-viewer-0.2.0.vsix` en la raíz del proyecto.

### Inspección del Paquete:
```bash
# Listar los archivos que se incluirán en el .vsix
npx vsce ls
```

### Publicación Manual:
```bash
# Iniciar sesión con el publisher
npx vsce login YamidCuetoMazo

# Publicar la versión
npx vsce publish
```

O bien subir el archivo `.vsix` directamente a través del portal de gestión:
[https://marketplace.visualstudio.com/manage/publishers/YamidCuetoMazo](https://marketplace.visualstudio.com/manage/publishers/YamidCuetoMazo)

---

## 4. Checklist Pre-Release

- [ ] Versión actualizada en `package.json` (e.g. `"version": "0.2.0"`).
- [ ] Entradas de cambios documentadas en `CHANGELOG.md` bajo `## [0.2.0] - YYYY-MM-DD`.
- [ ] Documentación actualizada en `README.md` y `README.es.md`.
- [ ] Compilación TypeScript exitosa sin errores (`npm run compile` y `npx tsc --noEmit`).
- [ ] Todas las suites de pruebas pasando al 100%.
- [ ] Archivo `.vscodeignore` actualizado para excluir directorios internos de pruebas (`tests/`, `docs/`, `.github/`).
- [ ] Secret `VSCE_PAT` configurado en los Secrets del repositorio GitHub (`Settings -> Secrets and variables -> Actions`).
