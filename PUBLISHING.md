# 📦 Guía de Publicación - JRXML Viewer Extension

## Preparativos antes de publicar

### 1. Actualizar información personal en package.json

Actualiza estos campos con tu información real:

```json
{
  "publisher": "yamid",  // Tu nombre de publicador en el Marketplace
  "author": {
    "name": "Yamid Cueto Mazo",
    "email": "yamidcuetomazo@hotmail.com"
  }
}
```

### 2. Crear un ícono para la extensión

Crea un archivo `media/icon.png` con las siguientes especificaciones:
- Tamaño: 128x128 píxeles
- Formato: PNG
- Fondo transparente recomendado
- Debe ser representativo de JasperReports/JRXML

### 3. Actualizar URLs del repositorio

En `package.json`, actualiza las URLs:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/YamiCueto/jrxml-viewer-extension.git"
  },
  "bugs": {
    "url": "https://github.com/YamiCueto/jrxml-viewer-extension/issues"
  },
  "homepage": "https://github.com/YamiCueto/jrxml-viewer-extension#readme"
}
```

## Pasos para publicar en VS Code Marketplace

### Paso 1: Crear cuenta en Azure DevOps

1. Ve a https://dev.azure.com
2. Crea una cuenta (usa tu cuenta Microsoft/GitHub)
3. Crea una organización

### Paso 2: Generar Personal Access Token (PAT)

1. En Azure DevOps, ve a User Settings → Personal Access Tokens
2. Click en "New Token"
3. Configura:
   - **Name**: `vsce-publish`
   - **Organization**: Tu organización
   - **Expiration**: 90 días (o más)
   - **Scopes**: Selecciona "Marketplace" → "Manage"
4. Copia el token (¡guárdalo de forma segura!)

### Paso 3: Crear cuenta de publicador

1. Ve a https://marketplace.visualstudio.com/manage
2. Click en "Create publisher"
3. Configura:
   - **ID**: `YamidCuetoMazo` (debe coincidir con package.json)
   - **Display Name**: Yamid Cueto Mazo
   - **Email**: yamidcuetomazo@hotmail.com

### Paso 4: Instalar vsce (si no lo tienes)

```bash
npm install -g @vscode/vsce
```

### Paso 5: Login con vsce

```bash
vsce login yamid
# Ingresa tu Personal Access Token cuando lo pida
```

### Paso 6: Empaquetar la extensión

```bash
# Limpiar y compilar
npm run compile

# Crear el paquete .vsix
vsce package
```

Esto creará un archivo `jrxml-viewer-0.1.0.vsix`

### Paso 7: Publicar

```bash
# Publicar en el Marketplace
vsce publish
```

O puedes hacerlo manual:
1. Ve a https://marketplace.visualstudio.com/manage/publishers/YamidCuetoMazo
2. Click en "New extension" → "Visual Studio Code"
3. Arrastra el archivo `.vsix`

## Verificación post-publicación

1. **Espera 5-10 minutos** para que la extensión se procese
2. Verifica en: `https://marketplace.visualstudio.com/items?itemName=yamid.jrxml-viewer`
3. Instala desde VS Code: `Ctrl+P` → `ext install yamid.jrxml-viewer`

## Actualizaciones futuras

Para publicar actualizaciones:

1. Actualiza la versión en `package.json`:
   ```json
   "version": "0.2.0"
   ```

2. Actualiza `CHANGELOG.md` con los cambios

3. Compila y publica:
   ```bash
   npm run compile
   vsce publish
   ```

O puedes usar comandos automáticos:
```bash
# Incrementar versión patch (0.1.0 → 0.1.1)
vsce publish patch

# Incrementar versión minor (0.1.0 → 0.2.0)
vsce publish minor

# Incrementar versión major (0.1.0 → 1.0.0)
vsce publish major
```

## Checklist antes de publicar

- [ ] Ícono creado (`media/icon.png`)
- [ ] Email actualizado en `package.json`
- [ ] URLs de GitHub actualizadas
- [ ] README.md completo y sin errores
- [ ] CHANGELOG.md actualizado
- [ ] Código compilado sin errores (`npm run compile`)
- [ ] Extensión probada en modo desarrollo (F5)
- [ ] Personal Access Token creado
- [ ] Cuenta de publicador creada
- [ ] Licencia revisada

## Comandos útiles

```bash
# Ver detalles del paquete sin publicar
vsce package --out test.vsix

# Listar archivos que se incluirán
vsce ls

# Ver información de la extensión
vsce show yamid.jrxml-viewer

# Desinstalar desde el Marketplace (si es necesario)
vsce unpublish yamid.jrxml-viewer
```

## Recursos adicionales

- [Guía oficial de publicación](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Marketplace Publisher Portal](https://marketplace.visualstudio.com/manage)
- [Azure DevOps](https://dev.azure.com)

## Notas importantes

- La primera publicación puede tardar hasta 24 horas en aparecer
- Las actualizaciones suelen ser más rápidas (5-10 minutos)
- El nombre de publicador (`yamid`) debe ser único en el Marketplace
- Si el nombre está tomado, elige otro y actualiza package.json
- Mantén tu Personal Access Token seguro y privado
- Los tokens expiran, tendrás que renovarlos periódicamente

---

**¡Buena suerte con la publicación! 🚀**
