# API Contract Changelog

## Version 2.3.1 (Febrero 15, 2026)

### 🔴 Correcciones Críticas

1. **Paginación — Documentación corregida (Sección 3.2)**
   - ❌ **Antes:** Documentaba que `page`/`limit` funcionaban en todos los endpoints
   - ✅ **Ahora:** Clarifica que solo endpoints de reviews soportan paginación
   - **Impacto:** Evita confusión en integración frontend
   - **Endpoints afectados:** GET /restaurants, /businesses, /doctors, /markets, /recipes

2. **Reviews — Advertencia crítica sobre campo `title` (Sección 7.4)**
   - ⚠️ **Nuevo:** Documenta discrepancia con frontend Vegan-Guide-Platform
   - **Problema:** Backend requiere `title` (5-100 chars), frontend no lo envía
   - **Resultado:** Todas las reviews desde frontend fallan con 400
   - **Workarounds:** Documentados para backend (Phase 2) y frontend (generación temporal)

3. **Nueva Sección 14 — Apéndice de Discrepancias Conocidas**
   - 📋 Lista completa de 25 discrepancias validadas contra código real
   - 3 críticas (C1-C3) que bloquean funcionalidad
   - 13 mayores (M1-M13) con datos incompatibles
   - 9 menores (m1-m9)
   - Incluye roadmap de corrección referenciando `IMPLEMENTATION_PLAN.md`

### 📊 Cambios Menores

- **Versión actualizada:** 2.3.0 → 2.3.1
- **Fecha actualizada:** Enero 2025 → Febrero 2026
- **Tabla de Contenidos:** Agregada sección 14

### 🎯 Por Qué Estos Cambios

El contrato v2.3.0 era **90% preciso** documentando el estado actual del backend, pero:
- No documentaba limitaciones de paginación → desarrolladores asumían soporte universal
- No advertía sobre review title → causaba errores en producción
- No mencionaba discrepancias con frontend → duplicación de esfuerzo descubriendo issues

**v2.3.1 mantiene la precisión de v2.3.0 pero agrega transparencia sobre limitaciones y issues conocidos.**

---

## Version 2.3.0 (Enero 2025)

Versión original. Documentación completa y precisa del backend `api-guideTypescript` tag V2.0.0 incluyendo:
- 13 secciones de documentación
- 50+ endpoints documentados
- Modelos de datos completos
- Ejemplos de código TypeScript/React
- Validaciones y reglas de negocio
- Consideraciones de seguridad
