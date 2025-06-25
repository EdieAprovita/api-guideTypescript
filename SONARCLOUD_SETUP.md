# 🔍 SonarCloud Setup Guide

## Configuración Completa de SonarCloud para VEGAN GUIDE API

### ⚙️ Archivos Configurados

✅ **Archivos creados:**

- `sonar-project.properties` - Configuración principal de SonarCloud
- `.sonarcloudignore` - Exclusiones de archivos para análisis
- `.github/workflows/sonarcloud.yml` - CI/CD automático con SonarCloud

✅ **Scripts añadidos al package.json:**

- `npm run sonar:prepare` - Prepara reportes para SonarCloud
- `npm run sonar:scan` - Ejecuta análisis local
- `npm run lint:report` - Genera reporte JSON de ESLint

---

## 🚀 Pasos para Configurar SonarCloud

### 1. Crear Cuenta en SonarCloud

1. Ve a [SonarCloud.io](https://sonarcloud.io)
2. Registrate con tu cuenta de GitHub
3. Importa tu repositorio `api-guideTypescript`

### 2. Obtener Tokens y Keys

1. En SonarCloud, ve a tu proyecto
2. Copia el **Organization Key** y **Project Key**
3. Ve a "My Account" → "Security" → "Generate Token"
4. Crea un token con nombre "GitHub Actions"

### 3. Actualizar Configuración

Edita `sonar-project.properties`:

```properties
# Reemplaza con tus valores reales
sonar.organization=tu-organization-key
sonar.projectKey=tu-project-key

# Si usas GitHub, descomenta y completa:
sonar.links.homepage=https://github.com/tu-usuario/api-guideTypescript
sonar.links.ci=https://github.com/tu-usuario/api-guideTypescript/actions
sonar.links.scm=https://github.com/tu-usuario/api-guideTypescript
sonar.links.issue=https://github.com/tu-usuario/api-guideTypescript/issues
```

### 4. Configurar Secrets en GitHub

Ve a tu repositorio GitHub → Settings → Secrets and variables → Actions:

1. `SONAR_TOKEN` - Token generado en SonarCloud
2. `GITHUB_TOKEN` - Se crea automáticamente

---

## 📊 Problemas Identificados por SonarCloud

### 🔴 Problemas Críticos Encontrados

#### **1. Cobertura de Tests Baja**

- **Actual:** 43.36% cobertura general
- **Objetivo:** 90%+
- **Archivos críticos sin cobertura:**
    - `src/server.ts` (0%)
    - `src/swagger.ts` (0%)
    - `src/config/db.ts` (0%)

#### **2. Errores en Tests**

- **14 test suites fallando**
- **11 tests individuales fallando**
- **Principales problemas:**
    - Middleware de autenticación undefined
    - Tests de seguridad HTTPS fallando
    - Validación XSS no funcionando correctamente

#### **3. Duplicación de Código**

- **Esquemas de validación duplicados** en `validators.ts`
- **Patrones repetidos** en controllers
- **Funciones similares** en services

#### **4. Código Muerto**

- **Funciones no utilizadas** en TokenService (13.88% cobertura)
- **Código de geolocalización** sin tests (36.36% cobertura)
- **Middleware de errores** parcialmente cubierto

---

## 🎯 Recomendaciones de Mejora (Basadas en Análisis)

### **Prioridad Alta 🔴**

1. **Arreglar Middleware de Autenticación**

    ```typescript
    // src/routes/authRoutes.ts - Línea 12
    // El callback está undefined
    router.post('/refresh-token' /* ARREGLAR CALLBACK */);
    ```

2. **Mejorar Validación XSS**

    ```typescript
    // Actual: "javascript%3Aalert(\"xss\")" - NO sanitizado
    // Esperado: Sanitización completa de inputs
    ```

3. **Configurar HTTPS Correctamente**
    ```typescript
    // Tests esperan 302 pero reciben 500
    // Configurar middleware HTTPS enforcement
    ```

### **Prioridad Media 🟡**

1. **Reducir Duplicación**

    - Refactorizar esquemas de validación comunes
    - Crear funciones helper reutilizables
    - Consolidar patrones en controllers

2. **Mejorar Cobertura de Tests**

    - Añadir tests para server.ts
    - Testear configuración de base de datos
    - Aumentar cobertura de services críticos

3. **Optimizar Código**
    - Remover funciones no utilizadas
    - Mejorar error handling
    - Consolidar imports

---

## 🛠️ Comandos Útiles

### **Análisis Local**

```bash
# Preparar reportes
npm run sonar:prepare

# Ejecutar análisis local (requiere sonar-scanner)
npm run sonar:scan

# Ver cobertura en browser
npm run test:ci && open coverage/lcov-report/index.html
```

### **CI/CD Automático**

```bash
# El análisis se ejecuta automáticamente en:
# - Push a main/develop/feature/*
# - Pull requests
# - Ver resultados en GitHub Actions
```

---

## 📈 Métricas Objetivo

### **Quality Gate Targets**

| Métrica            | Actual | Objetivo | Prioridad   |
| ------------------ | ------ | -------- | ----------- |
| **Cobertura**      | 43.36% | 90%+     | 🔴 Critical |
| **Duplicación**    | ~15%   | <3%      | 🟡 High     |
| **Mantenibilidad** | C      | A        | 🟡 High     |
| **Confiabilidad**  | B      | A        | 🟡 High     |
| **Seguridad**      | B      | A        | 🔴 Critical |

### **Technical Debt**

- **Tiempo estimado:** 2-3 días
- **Issues críticos:** 8+
- **Code smells:** 20+

---

## 🔧 Soluciones Rápidas

### **1. Arreglar Callback Undefined**

```typescript
// src/routes/authRoutes.ts
import { refreshToken } from '../controllers/userControllers';

router.post(
    '/refresh-token',
    rateLimits.auth,
    validateInputLength(512),
    validate({
        body: userSchemas.refreshToken,
    }),
    refreshToken // ← Añadir este controller
);
```

### **2. Mejorar Sanitización XSS**

```typescript
// src/middleware/validation.ts
import { sanitize } from 'express-xss-sanitizer';

// Usar sanitizer más agresivo
app.use(
    sanitize({
        allowedTags: [],
        allowedAttributes: {},
        removeUnicodeSequences: true,
    })
);
```

### **3. Configurar HTTPS Enforcement**

```typescript
// src/middleware/security.ts
export const httpsRedirect = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'production') {
        if (req.header('x-forwarded-proto') !== 'https') {
            return res.redirect(301, `https://${req.header('host')}${req.url}`);
        }
    }
    next();
};
```

---

## 🎯 Próximos Pasos

1. **Configurar SonarCloud** (10 min)
2. **Arreglar callbacks undefined** (30 min)
3. **Mejorar sanitización XSS** (45 min)
4. **Configurar HTTPS middleware** (30 min)
5. **Aumentar cobertura tests** (2-3 horas)
6. **Refactorizar duplicación** (1-2 horas)

**Total tiempo estimado:** 1 día de trabajo

---

## 📚 Recursos Adicionales

- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [TypeScript Rules](https://rules.sonarsource.com/typescript)
- [Quality Gate Documentation](https://docs.sonarqube.org/latest/user-guide/quality-gates/)
- [GitHub Actions Integration](https://github.com/SonarSource/sonarcloud-github-action)

---

¡SonarCloud está listo para usar! 🚀 Ejecuta `npm run sonar:prepare` para ver el análisis completo.
