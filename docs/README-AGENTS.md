# 📚 Índice Completo de Recursos de Agentes Claude

Tu proyecto está ahora equipado con **3 agentes especializados de Claude** para todo el ciclo de desarrollo.

Este archivo te guía a través de toda la documentación disponible.

---

## 🎯 Comienza Aquí

### ⚡ Si tienes 5 minutos

👉 **[docs/QUICK-START-AGENTS.md](QUICK-START-AGENTS.md)** - Guía ultra-rápida con ejemplos

### 📖 Si tienes 15 minutos

👉 **[docs/AGENTS-SETUP.md](AGENTS-SETUP.md)** - Guía completa de integración

### 🎓 Si tienes 30 minutos

👉 **[docs/EXAMPLE-COMPLETE-FEATURE.md](EXAMPLE-COMPLETE-FEATURE.md)** - Ejemplo real paso a paso

---

## 📂 Estructura de Recursos

```
docs/
├── 📘 AGENTS.md                    # Índice maestro de todos los agentes
├── ⚡ QUICK-START-AGENTS.md         # TL;DR - Comandos rápidos
├── 📖 AGENTS-SETUP.md              # Guía completa de setup e integración
├── 🎓 EXAMPLE-COMPLETE-FEATURE.md  # Ejemplo real paso a paso
│
├── 🔵 AGENT-ARCHITECT.md           # Arquitecto de Software
│   ├── Responsabilidades
│   ├── Template SPEC.md
│   └── Restricciones operativas
│
├── 🟢 AGENT-DEVELOPER.md           # Senior Developer
│   ├── Metodología TDD
│   ├── Stack tecnológico
│   └── Patrones de código
│
└── 🔴 AGENT-QA.md                  # QA Engineer & Security Auditor
    ├── Protocolo de auditoría
    ├── 3 niveles de revisión
    └── Template de reporte
```

---

## 🔵 El Arquitecto (Diseñador)

**Archivo:** [docs/AGENT-ARCHITECT.md](AGENT-ARCHITECT.md)

**Responsabilidad:** Diseña arquitectura, define interfaces y crea SPEC.md

**Cuándo usarlo:**

- ✅ Antes de implementar features nuevas
- ✅ Para refactorizaciones grandes
- ✅ Para validar viabilidad técnica
- ✅ Para diseñar nuevos servicios/modelos

**Entregables:**

```
📄 docs/spikes/SPEC.md
├── Interfaces TypeScript
├── Schemas de request/response
├── Flujos de casos de uso
├── Consideraciones de seguridad
└── Plan de implementación
```

**Ejemplo de prompt:**

```
"Eres el Arquitecto. Lee docs/AGENT-ARCHITECT.md

Diseña un endpoint para [requisito]
Con estos requisitos:
- [req 1]
- [req 2]

Crea un SPEC.md completo"
```

---

## 🟢 El Developer (Implementador)

**Archivo:** [docs/AGENT-DEVELOPER.md](AGENT-DEVELOPER.md)

**Responsabilidad:** Implementa código con TDD, escribe tests, refactoriza

**Cuándo usarlo:**

- ✅ Para implementar features del SPEC.md
- ✅ Para corregir bugs
- ✅ Para refactorizar código
- ✅ Para agregar tests

**Entregables:**

```
✅ Tests verdes
✅ Código tipado (TypeScript)
✅ Error handling completo
✅ Documentación actualizada
```

**Flujo TDD:**

```
1. 🔴 Escribe test que falla
2. 🟢 Implementa código mínimo
3. 🔵 Refactoriza manteniendo tests verdes
```

**Ejemplo de prompt:**

```
"Eres el Developer. Lee docs/AGENT-DEVELOPER.md

Implementa basándote en docs/spikes/SPEC.md:
- [tarea 1]
- [tarea 2]

Sigue TDD estrictamente"
```

---

## 🔴 El QA Engineer (Auditor)

**Archivo:** [docs/AGENT-QA.md](AGENT-QA.md)

**Responsabilidad:** Audita código, ejecuta tests, valida seguridad

**Cuándo usarlo:**

- ✅ Antes de merge a main
- ✅ Para buscar bugs y vulnerabilidades
- ✅ Para validar cobertura de tests
- ✅ Para casos borde adversariales

**Protocolo (3 Niveles):**

```
1. 📝 Revisión Estática
   ├─ Código por seguridad
   ├─ TypeScript correcto
   └─ Error handling completo

2. 🧪 Smoke Testing
   ├─ Ejecutar: yarn test
   ├─ Ejecutar: yarn lint
   └─ Verificar: coverage > 80%

3. 🔨 Adversarial Testing
   ├─ Inputs extremos
   ├─ Valores null/undefined
   └─ Performance bajo carga
```

**Entregables:**

```
📋 Reporte detallado
├── Veredicto: 🟢 APROBADO | 🟡 CON CAMBIOS | 🔴 RECHAZADO
├── Análisis estático
├── Resultados de tests
└── Recomendaciones
```

**Ejemplo de prompt:**

```
"Eres el QA Engineer. Lee docs/AGENT-QA.md

Audita el nuevo endpoint [nombre]

Archivos afectados:
- src/controllers/...
- src/services/...
- test/...

Ejecuta protocolo completo:
1. Revisión estática
2. Smoke testing
3. Adversarial testing"
```

---

## 🔄 Flujos Comunes de Trabajo

### Flujo 1: Feature Nueva Completa

```
Usuario: "Necesito crear feature X"
   ↓
🔵 ARQUITECTO
   ├─ Analiza requisito
   ├─ Crea SPEC.md
   └─ Propone arquitectura
   ↓
🟢 DEVELOPER
   ├─ Lee SPEC.md
   ├─ Escribe tests (TDD)
   ├─ Implementa código
   └─ Verifica: tests ✅ + lint ✅ + tsc ✅
   ↓
🔴 QA ENGINEER
   ├─ Revisión estática
   ├─ Ejecuta tests
   ├─ Busca bugs
   └─ Emite reporte
   ↓
✅ MERGE & DEPLOY
```

### Flujo 2: Bug Fix Simple

```
Usuario: "Endpoint X devuelve error"
   ↓
🟢 DEVELOPER
   ├─ Investiga el bug
   ├─ Crea test que reproduce
   ├─ Implementa fix
   └─ Verifica tests ✅
   ↓
🔴 QA ENGINEER
   ├─ Valida que bug está resuelto
   └─ Aprueba
   ↓
✅ MERGE & DEPLOY
```

### Flujo 3: Refactorización Grande

```
Usuario: "El código de X está muy complejo"
   ↓
🔵 ARQUITECTO
   ├─ Propone nueva estructura
   └─ Crea SPEC de refactoring
   ↓
🟢 DEVELOPER
   ├─ Refactoriza incrementalmente
   ├─ Mantiene tests verdes todo el tiempo
   └─ Verifica funcionalidad se mantiene
   ↓
🔴 QA ENGINEER
   ├─ Valida que todo sigue funcionando
   └─ Aprueba refactoring
   ↓
✅ MERGE & DEPLOY
```

---

## 🎯 Guía Rápida por Acción

### "Necesito diseñar algo"

1. Abre [docs/AGENT-ARCHITECT.md](AGENT-ARCHITECT.md)
2. Copia el rol del Arquitecto
3. Describe tu requisito
4. Espera SPEC.md

### "Necesito implementar algo"

1. Abre [docs/AGENT-DEVELOPER.md](AGENT-DEVELOPER.md)
2. Copia el rol del Developer
3. Describe la tarea (o pega SPEC.md)
4. Espera código + tests ✅

### "Necesito auditar/validar algo"

1. Abre [docs/AGENT-QA.md](AGENT-QA.md)
2. Copia el rol del QA
3. Describe qué auditar
4. Espera reporte

### "No sé por dónde empezar"

1. Lee [docs/QUICK-START-AGENTS.md](QUICK-START-AGENTS.md) (5 min)
2. Mira el ejemplo en [docs/EXAMPLE-COMPLETE-FEATURE.md](EXAMPLE-COMPLETE-FEATURE.md) (15 min)
3. Elige tu agente
4. ¡Comienza!

---

## 📚 Documentación Completa

### Agentes (Roles Especializados)

- **[AGENT-ARCHITECT.md](AGENT-ARCHITECT.md)** - Diseñador (🔵 Azul)
- **[AGENT-DEVELOPER.md](AGENT-DEVELOPER.md)** - Implementador (🟢 Verde)
- **[AGENT-QA.md](AGENT-QA.md)** - Auditor (🔴 Rojo)

### Guías de Integración

- **[AGENTS-SETUP.md](AGENTS-SETUP.md)** - Setup completo e integración
- **[AGENTS.md](AGENTS.md)** - Índice maestro con descripción detallada
- **[QUICK-START-AGENTS.md](QUICK-START-AGENTS.md)** - Guía ultra-rápida

### Ejemplos

- **[EXAMPLE-COMPLETE-FEATURE.md](EXAMPLE-COMPLETE-FEATURE.md)** - Ejemplo real paso a paso

### Configuración

- **.agents.json** - Configuración en JSON de los agentes (en root del proyecto)

### Proyecto

- **[README.md](../README.md)** - Visión general del proyecto
- **[improvement-plan.md](improvement-plan.md)** - Plan de mejoras
- **[testing-coverage-plan.md](testing-coverage-plan.md)** - Plan de testing

---

## 🚀 Cómo Empezar Ahora Mismo

### Opción 1: Rápido (5 minutos)

```bash
1. Abre: docs/QUICK-START-AGENTS.md
2. Lee los ejemplos
3. Elige tu agente
4. Copia el prompt
5. Pégalo en Claude
```

### Opción 2: Profundo (30 minutos)

```bash
1. Lee: docs/AGENTS-SETUP.md (integración completa)
2. Lee: docs/EXAMPLE-COMPLETE-FEATURE.md (ejemplo real)
3. Abre el agente específico que necesites
4. Comienza a trabajar
```

### Opción 3: Referencia Rápida

```bash
.agents.json → Configuración JSON
docs/AGENTS.md → Índice completo
docs/QUICK-START-AGENTS.md → TL;DR
```

---

## 📊 Estadísticas

**Agentes Disponibles:** 3
**Documentación:** 7 archivos
**Páginas:** 50+ páginas de guías
**Ejemplos:** 1 ejemplo completo (feature real)

**Stack Soportado:**

- Runtime: Node.js 18+
- Framework: Express.js
- Database: MongoDB
- Language: TypeScript 5.x
- Testing: Vitest + Supertest

---

## ✅ Checklist de Setup

```
☐ Leer docs/QUICK-START-AGENTS.md
☐ Revisar docs/AGENTS-SETUP.md
☐ Entender los 3 agentes (ARCHITECT, DEVELOPER, QA)
☐ Leer ejemplo en docs/EXAMPLE-COMPLETE-FEATURE.md
☐ Copiar rol del agente en Claude
☐ Comenzar a trabajar
```

---

## 🎓 Conceptos Clave

| Concepto                | Definición                                             |
| ----------------------- | ------------------------------------------------------ |
| **SPEC.md**             | Especificación técnica que el Arquitecto crea          |
| **TDD**                 | Test-Driven Development: tests primero, código después |
| **Service Layer**       | Patrón: Controller → Service → Model                   |
| **TypeScript Strict**   | Sin `any`, tipos explícitos siempre                    |
| **Auditoría 3 Niveles** | Estática + Smoke + Adversarial                         |

---

## 💬 Preguntas Frecuentes

### P: ¿Necesito leer toda la documentación?

**R:** No. Lee [QUICK-START-AGENTS.md](QUICK-START-AGENTS.md) (5 min) y comienza.

### P: ¿Puedo usar los agentes en Claude.ai?

**R:** Sí. Copia el contenido del archivo AGENT-\*.md y pégalo en el prompt.

### P: ¿Puedo usar los agentes en VS Code?

**R:** Sí. Abre Claude Code y copia el rol del agente.

### P: ¿Cuál es el orden correcto?

**R:** Arquitecto → Developer → QA (siempre en ese orden).

### P: ¿Puedo saltarme al Developer sin Arquitecto?

**R:** Solo para bugs simples. Para features nuevas, siempre Arquitecto primero.

### P: ¿Qué pasa si el QA rechaza?

**R:** Implementa los cambios sugeridos y envía de nuevo.

---

## 🔗 Enlaces Rápidos

| Necesidad                  | Archivo                                                    |
| -------------------------- | ---------------------------------------------------------- |
| ⚡ Guía rápida (5 min)     | [QUICK-START-AGENTS.md](QUICK-START-AGENTS.md)             |
| 📖 Setup completo (15 min) | [AGENTS-SETUP.md](AGENTS-SETUP.md)                         |
| 🎓 Ejemplo real (30 min)   | [EXAMPLE-COMPLETE-FEATURE.md](EXAMPLE-COMPLETE-FEATURE.md) |
| 🔵 Arquitecto              | [AGENT-ARCHITECT.md](AGENT-ARCHITECT.md)                   |
| 🟢 Developer               | [AGENT-DEVELOPER.md](AGENT-DEVELOPER.md)                   |
| 🔴 QA Engineer             | [AGENT-QA.md](AGENT-QA.md)                                 |
| 📚 Índice completo         | [AGENTS.md](AGENTS.md)                                     |

---

## 🎯 Próximos Pasos

### Hoy Mismo

1. ⚡ Lee [QUICK-START-AGENTS.md](QUICK-START-AGENTS.md) (5 min)
2. 🎓 Mira [EXAMPLE-COMPLETE-FEATURE.md](EXAMPLE-COMPLETE-FEATURE.md) (15 min)
3. 🚀 Elige tu primer agente y comienza

### Esta Semana

- Crea tu primer SPEC.md con el Arquitecto
- Implementa con el Developer
- Audita con el QA

### Este Mes

- Domina los 3 agentes
- Automatiza tu workflow
- Mejora la calidad del código

---

## 📝 Notas

- Los agentes están listos para usar AHORA
- Copia el contenido del archivo AGENT-\*.md en tus prompts
- El archivo `.agents.json` contiene toda la configuración
- Toda la documentación está en `docs/`

---

**Última actualización:** Diciembre 2025  
**Versión:** 1.0  
**Estado:** ✅ Listo para usar

---

¿Dudas? Consulta [QUICK-START-AGENTS.md](QUICK-START-AGENTS.md) o [AGENTS-SETUP.md](AGENTS-SETUP.md)

¡Happy coding! 🚀
