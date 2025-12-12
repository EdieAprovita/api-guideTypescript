# Guía Rápida: Cómo Usar los Agentes

## TL;DR - Comandos Rápidos

### 🔵 Necesito Arquitectura → Usa el ARQUITECTO

```
Copiar este prompt:

"Eres el Arquitecto de Software. Lee los agentes en docs/AGENT-ARCHITECT.md

Necesito que diseñes [descripción de feature/cambio]

Requisitos:
- [requisito 1]
- [requisito 2]

Contexto: [información adicional relevante]"
```

**Espera:** SPEC.md completamente documentado

---

### 🟢 Necesito Implementar → Usa el DEVELOPER

```
Copiar este prompt:

"Eres el Developer. Lee los agentes en docs/AGENT-DEVELOPER.md

Implementa lo siguiente basándote en docs/spikes/SPEC.md:
- [tarea 1]
- [tarea 2]

Sigue TDD (test first). Asegúrate de:
✅ Escribir tests primero
✅ Pasar todos los tests
✅ Sin errores de TypeScript"
```

**Espera:** Código implementado con tests verdes

---

### 🔴 Necesito Auditar/Validar → Usa el QA ENGINEER

```
Copiar este prompt:

"Eres el QA Engineer. Lee los agentes en docs/AGENT-QA.md

Audita el siguiente cambio/feature:
- [rama/PR a auditar]
- [componentes afectados]

Ejecuta el protocolo completo:
1. Revisión estática
2. Smoke testing
3. Adversarial testing

Entrega un reporte detallado"
```

**Espera:** Reporte con veredicto 🔴/🟡/🟢

---

## Ciclo Completo: De Idea a Producción

### Paso 1️⃣: ARQUITECTO diseña

```bash
# Usuario → Arquitecto: "Necesito crear feature X"
#
# Arquitecto entrega:
# → docs/spikes/SPEC.md (completo)
# → Interfaces TypeScript definidas
# → Flujos documentados
# → Riesgos identificados
```

### Paso 2️⃣: DEVELOPER implementa

```bash
# Developer → Lee SPEC.md
#
# Developer entrega:
# → Código escrito con TDD
# → Tests unitarios e integración (✅ todos pasan)
# → Documentación actualizada
# → Commits limpios

yarn test      # ✅ Todos los tests pasan
npx tsc --noEmit  # ✅ Sin errores de TypeScript
```

### Paso 3️⃣: QA audita

```bash
# QA → Ejecuta auditoría
#
# QA entrega:
# → Reporte detallado
# → Veredicto: 🟢 APROBADO
#              🟡 APROBADO CON CAMBIOS
#              🔴 RECHAZADO

yarn lint      # ✅ Sin warnings críticos
yarn test -- --coverage  # ✅ Coverage > 80%
```

### Paso 4️⃣: MERGE & DEPLOY ✅

```bash
git merge feature/X → main
git push
# → CD/CI ejecuta tests
# → Deploy a producción
```

---

## Escenarios Comunes

### Escenario A: Feature Completamente Nueva

```
┌─────────────┐
│ ARQUITECTO  │  "Diseña endpoint POST /api/users"
└──────┬──────┘
       │ SPEC.md creado ✅
       ↓
┌─────────────┐
│  DEVELOPER  │  "Implementa basado en SPEC.md"
└──────┬──────┘
       │ Código + Tests ✅
       ↓
┌─────────────┐
│  QA ENGINE  │  "Audita calidad y seguridad"
└──────┬──────┘
       │ Reporte ✅
       ↓
    MERGE → DEPLOY 🚀
```

### Escenario B: Bug en Código Existente

```
┌──────────────────┐
│ DEVELOPER        │  "Investiga y arregla bug"
│ (sin SPEC.md)    │
└────────┬─────────┘
         │ Fix + Tests ✅
         ↓
┌─────────────┐
│  QA ENGINE  │  "Valida que bug está resuelto"
└──────┬──────┘
       │ Aprobación ✅
       ↓
    MERGE → DEPLOY 🚀
```

### Escenario C: Refactorización Grande

```
┌─────────────┐
│ ARQUITECTO  │  "Propone nueva arquitectura"
└──────┬──────┘
       │ SPEC.md (refactoring plan) ✅
       ↓
┌─────────────┐
│  DEVELOPER  │  "Refactoriza incrementalmente"
└──────┬──────┘
       │ Tests verdes siempre ✅
       ↓
┌─────────────┐
│  QA ENGINE  │  "Valida que funcionalidad se mantiene"
└──────┬──────┘
       │ Aprobación ✅
       ↓
    MERGE → DEPLOY 🚀
```

---

## Preguntas Frecuentes (FAQ)

### P: ¿Por qué escribir tests primero (TDD)?

**R:**

- Asegura que el código sea testeable
- Evita bugs que los tests no detectaron
- Facilita refactorización futura
- Documentación viva del comportamiento

### P: ¿Puedo saltarme al Developer sin Arquitecto?

**R:**

- ✅ Sí, para bugs simples y tareas pequeñas
- ❌ No, para features nuevas complejas
- La falta de diseño causa problemas después

### P: ¿El QA rechaza mi código?

**R:**

1. Lee el reporte detallado
2. Implementa los cambios sugeridos
3. Ejecuta `yarn test` localmente
4. Envía al QA nuevamente
5. Itera hasta aprobación

### P: ¿Cómo documentar mi código?

**R:**

- JSDoc para funciones públicas
- Comments en lógica compleja
- Tests como documentación ejecutable
- SPEC.md como especificación técnica

### P: ¿Puedo usar los agentes fuera de VS Code?

**R:**

- ✅ Sí, en Claude Web (Claude.ai)
- ✅ Sí, copiar el contenido de `AGENT-*.md` en el prompt
- ✅ Sí, en Claude API (integración programática)

### P: ¿Qué pasa si no hay SPEC.md?

**R:**

- Developer puede pedir que Arquitecto lo cree
- O Developer puede pedir aclaraciones al usuario
- No implementes sin especificación clara

---

## Checklist Antes de Usar Cada Agente

### 🔵 Arquitecto

```
Antes de iniciar:
☑ He leído el README del proyecto
☑ Entiendo la estructura en src/
☑ Tengo claro cuál es el requisito
☑ Sé qué componentes se verán afectados
```

### 🟢 Developer

```
Antes de empezar:
☑ Tengo el SPEC.md del Arquitecto
☑ Entiendo el requisito completamente
☑ Las herramientas están instaladas (yarn, Node.js)
☑ Puedo ejecutar yarn test localmente
```

### 🔴 QA Engineer

```
Antes de auditar:
☑ El código está completo y en una rama
☑ Se pueden ejecutar los tests localmente
☑ Tengo acceso a ver los cambios
☑ Sé cuál es el alcance (qué auditar)
```

---

## Comandos Útiles

### Para el Proyecto (en terminal)

```bash
# Setup inicial
yarn install

# Desarrollo
yarn dev

# Testing
yarn test              # todos los tests
yarn test:unit         # solo unitarios
yarn test:integration  # solo integración
yarn test:watch        # watch mode

# Linting
yarn lint
yarn format

# Build
yarn build

# Type checking
npx tsc --noEmit
```

### Para Usar Agentes

```bash
# 1. Abre docs/AGENT-ARCHITECT.md
open docs/AGENT-ARCHITECT.md

# 2. Copia el contenido relevante
# 3. Pégalo en el prompt de Claude
# 4. Describe tu requisito

# Ejemplo:
# "Eres el Arquitecto. Lee docs/AGENT-ARCHITECT.md
#  Necesito diseñar un endpoint para..."
```

---

## Flujo Visual Rápido

```
        ┌─────────────────────┐
        │   USUARIO/PM        │
        │  Tiene Requisito    │
        └──────────┬──────────┘
                   │
                   ↓
        ┌─────────────────────┐
        │ 🔵 ARQUITECTO       │
        │ Diseña solución     │ → docs/spikes/SPEC.md
        │ Define interfaces   │ → Tipos TypeScript
        │ Especifica API      │ → Flujos documentados
        └──────────┬──────────┘
                   │ ✅ SPEC listo
                   ↓
        ┌─────────────────────┐
        │ 🟢 DEVELOPER        │
        │ Implementa código   │ → Tests primero
        │ Escribe tests       │ → Código mínimo
        │ Refactoriza         │ → Mejoras
        └──────────┬──────────┘
                   │ ✅ Tests verdes
                   ↓
        ┌─────────────────────┐
        │ 🔴 QA ENGINEER      │
        │ Audita código       │ → Revisión estática
        │ Ejecuta tests       │ → Smoke testing
        │ Busca vulnerabilidades│ → Adversarial testing
        └──────────┬──────────┘
                   │
           ┌───────┴───────┐
           ↓               ↓
        🟢 OK         ❌ Problemas
           │               │
           └───────┬───────┘
                   ↓
        ┌─────────────────────┐
        │  GIT MERGE          │
        │  Feature → Main     │
        └──────────┬──────────┘
                   │
                   ↓
        ┌─────────────────────┐
        │ 🚀 DEPLOY           │
        │ CI/CD ejecuta tests │
        │ Sube a producción   │
        └─────────────────────┘
```

---

## Próximos Pasos

1. **Guarda este archivo** para referencia rápida
2. **Abre docs/AGENTS.md** para el índice completo
3. **Lee el agente relevante** (ARCHITECT/DEVELOPER/QA)
4. **Copia el rol** en tu prompt a Claude
5. **Describe tu tarea** claramente

¡Listo! 🚀

---

**Última actualización:** Diciembre 2025  
**Versión:** 1.0
