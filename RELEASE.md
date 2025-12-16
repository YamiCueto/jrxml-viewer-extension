# Release Automation Guide

## 🚀 Automated Release Process

Este proyecto usa GitHub Actions para automatizar completamente el proceso de release.

### Flujo Automático

Cuando creas un tag con formato `v*.*.*`, automáticamente:
1. ✅ Compila TypeScript
2. ✅ Empaqueta la extensión (.vsix)
3. ✅ Crea un GitHub Release con notas del CHANGELOG
4. ✅ Adjunta el archivo .vsix al release
5. ✅ Publica al VS Code Marketplace (si está configurado VSCE_PAT)

### 📋 Comandos Rápidos

#### Opción 1: Scripts npm (Recomendado)

```bash
# Incrementar versión patch (0.1.3 → 0.1.4)
npm run release:patch

# Incrementar versión minor (0.1.3 → 0.2.0)
npm run release:minor

# Incrementar versión major (0.1.3 → 1.0.0)
npm run release:major
```

Estos comandos automáticamente:
- Incrementan la versión en package.json
- Crean un commit con el mensaje "v0.1.4"
- Crean un tag git (v0.1.4)
- Hacen push del commit y del tag
- ⚡ **GitHub Actions se dispara automáticamente**

#### Opción 2: Manual

```bash
# 1. Actualizar versión en package.json manualmente
# 2. Actualizar CHANGELOG.md con la nueva versión
# 3. Commit y tag
git add .
git commit -m "v0.1.4: Add new features"
git tag v0.1.4
git push && git push --tags
```

### ⚙️ Configuración Inicial

#### Habilitar Publicación Automática al Marketplace

1. Ve a GitHub: `Settings` → `Secrets and variables` → `Actions`
2. Crea un nuevo secret llamado `VSCE_PAT`
3. Pega tu Personal Access Token de Azure DevOps

**Sin este secret**, el workflow seguirá funcionando pero **no publicará** al Marketplace automáticamente.

### 📝 Buenas Prácticas

1. **Actualiza el CHANGELOG.md** antes de crear el release:
   ```markdown
   ## [0.1.4] - 2025-12-16
   
   ### Added
   - Nueva característica increíble
   
   ### Fixed
   - Bug corregido
   ```

2. **El formato del tag es importante**: Debe ser `v0.1.4` (con la 'v' al inicio)

3. **Commit antes del tag**: Asegúrate de que todos los cambios estén commiteados

4. **Espera la confirmación**: GitHub Actions tardará 2-3 minutos en completar

### 🔍 Verificar el Release

Después de hacer push del tag:

1. Ve a **Actions** en GitHub para ver el progreso
2. Una vez completado, revisa **Releases** para el nuevo release
3. El archivo .vsix estará disponible para descarga
4. La extensión aparecerá en el Marketplace en 5-10 minutos

### 🎯 Ejemplo Completo

```bash
# 1. Asegúrate de estar en main
git checkout main
git pull

# 2. Actualiza CHANGELOG.md
# (edita el archivo manualmente)

# 3. Usa el script de release
npm run release:patch

# 4. ¡Listo! GitHub Actions hace el resto
```

### ❌ Solución de Problemas

**El workflow no se dispara:**
- Verifica que el tag tenga el formato `v*.*.*`
- Asegúrate de hacer push del tag: `git push --tags`

**Falla la publicación al Marketplace:**
- Revisa que el secret `VSCE_PAT` esté configurado
- Verifica que el token no haya expirado
- El workflow continúa aunque esto falle (release en GitHub funciona)

**Error en compilación:**
- Corre `npm run compile` localmente primero
- Corrige errores antes de crear el tag

### 📦 Versiones Antiguas

Para crear un release de una versión anterior:

```bash
git checkout <commit-hash>
git tag v0.1.3
git push origin v0.1.3
```

---

**¿Preguntas?** Abre un issue en GitHub.
