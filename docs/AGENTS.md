# Agentes Claude para Desarrollo

Este directorio contiene las especificaciones de roles para usar con Claude Code y VS Code.
Cada agente tiene una responsabilidad específica en el ciclo de desarrollo.

## 🏗️ Agentes Disponibles

### 1. **Arquitecto** - [AGENT-ARCHITECT.md](AGENT-ARCHITECT.md)

**Color:** 🔵 Azul | **Modelo:** Sonnet

Diseña la arquitectura de APIs, define interfaces TypeScript y crea especificaciones técnicas (`SPEC.md`).

**Responsabilidades:**

- Analizar requisitos y crear especificaciones
- Definir interfaces y tipos TypeScript
- Crear contratos de API (schemas)
- Identificar riesgos de seguridad y performance
- Generar SPEC.md para el Developer

**Cuándo usarlo:**

- Antes de implementar nueva funcionalidad
- Cuando necesitas claridad arquitectónica
- Para validar que una solución es viable
- Para diseñar refactorizaciones grandes

---

### 2. **Developer** - [AGENT-DEVELOPER.md](AGENT-DEVELOPER.md)

**Color:** 🟢 Verde | **Modelo:** Sonnet

Implementa features, refactoriza código y corrige bugs siguiendo TDD con TypeScript.

**Responsabilidades:**

- Seguir las especificaciones del Arquitecto
- Implementar código con TDD (test first)
- Escribir tests unitarios e integración
- Refactorizar manteniendo tests verdes
- Documentar código y APIs

**Cuándo usarlo:**

- Para implementar features del SPEC.md
- Cuando necesitas debugging y fixes
- Para refactorizar código existente
- Para mejorar la cobertura de tests

**Restricciones:**

- NO modifica código sin escribir tests primero
- NO implementa sin una especificación clara
- NO hace commits sin que los tests pasen

---

### 3. **QA Engineer** - [AGENT-QA.md](AGENT-QA.md)

**Color:** 🔴 Rojo | **Modelo:** Sonnet

Auditor adversario que ejecuta tests, encuentra bugs y valida la calidad del código.

**Responsabilidades:**

- Revisar código estáticamente (seguridad, types)
- Ejecutar suite de pruebas
- Crear tests adversariales
- Verificar cobertura de tests
- Emitir reportes de calidad

**Cuándo usarlo:**

- Para auditar PRs antes de merge
- Cuando sospechas de bugs o vulnerabilidades
- Para validar calidad antes de deploy
- Para crear tests de casos borde

**Niveles de Auditoría:**

1. **Revisión Estática:** Código review pre-test
2. **Smoke Testing:** Ejecutar tests existentes
3. **Adversarial Testing:** Intentar romper el código

---

## 🚀 Flujo de Trabajo Recomendado

```
1. ARQUITECTO
   ├─ Lee requisitos
   ├─ Crea SPEC.md
   └─ Espera aprobación
          ↓
2. DEVELOPER
   ├─ Lee SPEC.md
   ├─ Escribe tests
   ├─ Implementa código
   └─ Verifica que compila
          ↓
3. QA ENGINEER
   ├─ Audita código
   ├─ Ejecuta tests
   ├─ Busca bugs
   └─ Aprueba o rechaza
          ↓
   MERGE & DEPLOY ✅
```

## 💡 Ejemplos de Uso

### Ejemplo 1: Nuevo Feature (desde cero)

```
Usuario: "Necesito crear un endpoint para crear usuarios"
         ↓
Arquitecto: Crea SPEC.md con interfaces, schemas y flujos
         ↓
Developer: Implementa basado en SPEC.md
         ↓
QA: Audita y ejecuta tests
         ↓
Usuario aprueba: Merge a production
```

### Ejemplo 2: Bug Fix

```
Usuario: "El endpoint /users/:id devuelve 500"
         ↓
Developer: Investiga, crea test para reproduzir bug
         ↓
Developer: Implementa fix manteniendo tests verdes
         ↓
QA: Verifica que el bug está resuelto
         ↓
Merge al main
```

### Ejemplo 3: Refactorización

```
Usuario: "El código de GeoService está muy complejo"
         ↓
Arquitecto: Propone nueva arquitectura (service layer)
         ↓
Developer: Refactoriza incrementalmente con tests
         ↓
QA: Verifica que funcionalidad se mantiene
         ↓
Merge mejora de código
```

## 📋 Checklists por Agente

### Arquitecto - Antes de crear SPEC.md

- [ ] He leído el README del proyecto
- [ ] He revisado la estructura en `src/`
- [ ] He buscado SPEC.md previos como referencia
- [ ] He considerado riesgos de seguridad
- [ ] He considerado performance y escalabilidad
- [ ] Las interfaces están completamente tipadas

### Developer - Antes de hacer commit

- [ ] Los tests están escritos PRIMERO (TDD)
- [ ] Todos los tests pasan: `yarn test`
- [ ] TypeScript sin errores: `npx tsc --noEmit`
- [ ] Código formateado: `yarn format`
- [ ] No hay console.log innecesarios
- [ ] Error handling es completo
- [ ] Documentación está actualizada

### QA - Antes de aprobar

- [ ] He ejecutado revisión estática
- [ ] He ejecutado todos los tests
- [ ] He creado tests adversariales si falta coverage
- [ ] El coverage está arriba del 80%
- [ ] No hay vulnerabilidades de seguridad
- [ ] La performance es aceptable
- [ ] Emito reporte claro con veredicto

## 🔧 Integración con Claude Code / VS Code

### Opción 1: Copiar el rol al iniciar sesión

```
Usuario: "Actúa como @Arquitecto"
         ↓
Claude: Leyendo AGENT-ARCHITECT.md...
        Ahora estoy en Modo Arquitecto
```

### Opción 2: Mencionar el archivo directo

```
Usuario: "Revisa esto como un QA auditor siguiendo docs/AGENT-QA.md"
         ↓
Claude: Leyendo protocolo de auditoría...
        Iniciando auditoría...
```

### Opción 3: VS Code Extension (futuro)

Se puede crear una extensión que cargue los agentes automáticamente.

## 📊 Estadísticas de Proyecto

Stack actual:

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript 5.x
- **Database:** MongoDB
- **Testing:** Vitest + Supertest
- **Build:** TypeScript compiler

Estructura:

- Controllers, Services, Models (Mongoose)
- Middleware (auth, error handling, validation)
- Routes definidas en `src/routes/`
- Tests en `test/unit/` y `test/integration/`

## 🤝 Contribuciones

Para agregar nuevos agentes o mejorar los existentes:

1. Crea un nuevo archivo `AGENT-[nombre].md` en este directorio
2. Sigue el template de uno de los agentes existentes
3. Define responsabilidades, restricciones y ejemplos claros
4. Actualiza este README con la nueva información

## 📚 Referencias

- [Proyecto README](../README.md)
- [Plan de Mejoras](./improvement-plan.md)
- [Especificaciones Técnicas](./spikes/SPEC.md) (si existen)
- [Guía de Testing](./testing-coverage-plan.md)

---

**Creado:** Diciembre 2025  
**Última actualización:** Diciembre 2025  
**Mantenedor:** Equipo de Desarrollo
