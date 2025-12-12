# Cómo Usar los Agentes Claude en Este Proyecto

Esta sección te guía sobre cómo utilizar los agentes especializados de Claude para diferentes tareas en el desarrollo.

## 🎯 Los 3 Agentes Disponibles

Este proyecto cuenta con **3 agentes especializados** que cubren todo el ciclo de desarrollo:

| Agente          | Icono | Color | Rol                                         | Cuándo Usarlo           |
| --------------- | ----- | ----- | ------------------------------------------- | ----------------------- |
| **Arquitecto**  | 🔵    | Azul  | Diseña arquitectura y crea especificaciones | Antes de implementar    |
| **Developer**   | 🟢    | Verde | Implementa código siguiendo TDD             | Para codificar features |
| **QA Engineer** | 🔴    | Rojo  | Audita código y valida calidad              | Antes de merge          |

📖 **Documentación Completa:** [docs/AGENTS.md](docs/AGENTS.md)  
⚡ **Guía Rápida:** [docs/QUICK-START-AGENTS.md](docs/QUICK-START-AGENTS.md)

## 🚀 Inicio Rápido

### Opción 1: Usa la Guía Rápida (Recomendado)

```bash
# Lee esta guía primero
open docs/QUICK-START-AGENTS.md

# Luego copia el prompt para el agente que necesites
# y pégalo en Claude Code o Claude.ai
```

### Opción 2: Carga el Agente Específico

```bash
# Lee el agente que necesitas
open docs/AGENT-ARCHITECT.md    # Para diseñar
open docs/AGENT-DEVELOPER.md    # Para implementar
open docs/AGENT-QA.md            # Para auditar
```

### Opción 3: Copia el Rol en tu Prompt

```
Copiar y pegar en Claude:

"Eres el [NOMBRE DEL AGENTE]. Lee los agentes en docs/AGENT-[NOMBRE].md

[Tu tarea específica aquí]"
```

## 📋 Flujo de Trabajo Recomendado

```
┌─────────────────────┐
│   USUARIO/PM        │ "Necesito agregar feature X"
└──────────┬──────────┘
           │
           ↓
    🔵 ARQUITECTO ──→ docs/spikes/SPEC.md
           │
           ↓ (SPEC aprobado)
    🟢 DEVELOPER  ──→ Código + Tests (TDD)
           │
           ↓ (Tests verdes)
    🔴 QA ENGINEER ──→ Reporte de Auditoría
           │
           ↓ (✅ Aprobado)
    MERGE & DEPLOY 🚀
```

## 💡 Ejemplos Prácticos

### Ejemplo 1: Agregar Nuevo Endpoint

**Paso 1: Usa el Arquitecto**

```
"Eres el Arquitecto. Lee docs/AGENT-ARCHITECT.md

Necesito crear un endpoint POST /api/businesses para crear negocios.
Requisitos:
- Validar datos del negocio
- Almacenar en MongoDB
- Retornar respuesta estructurada

Crea un SPEC.md con interfaces TypeScript, schemas y flujos."
```

**Paso 2: Usa el Developer**

```
"Eres el Developer. Lee docs/AGENT-DEVELOPER.md

Implementa el endpoint basándote en docs/spikes/SPEC.md

Sigue TDD:
1. Escribe tests primero
2. Haz pasar los tests
3. Refactoriza

Asegúrate de:
- Tests verdes: yarn test
- TypeScript limpio: npx tsc --noEmit"
```

**Paso 3: Usa el QA Engineer**

```
"Eres el QA Engineer. Lee docs/AGENT-QA.md

Audita el nuevo endpoint POST /api/businesses

Ejecuta el protocolo completo:
1. Revisión estática
2. Smoke testing (yarn test)
3. Adversarial testing

Emite un reporte."
```

### Ejemplo 2: Corregir un Bug

```
"Eres el Developer. Lee docs/AGENT-DEVELOPER.md

El endpoint GET /api/users/:id falla cuando el ID es inválido.

Sigue TDD:
1. Crea un test que reproduzca el bug
2. Implementa el fix mínimo
3. Verifica que otros tests siguen pasando

Ejecuta: yarn test"
```

### Ejemplo 3: Refactorizar Código

```
"Eres el Arquitecto. Lee docs/AGENT-ARCHITECT.md

El archivo src/services/GeoService.ts está muy grande (500+ líneas).

Propón una refactorización que:
- Divida responsabilidades
- Siga el patrón de Service Layer
- Sea fácil de testear

Crea un SPEC.md con el plan."
```

## 🎨 Estructura de Agentes

Cada agente está completamente documentado en su archivo:

```
docs/
├── AGENT-ARCHITECT.md      # 🔵 Arquitecto
│   ├── Responsabilidades
│   ├── Restricciones
│   ├── Template de SPEC.md
│   └── Instrucciones de activación
│
├── AGENT-DEVELOPER.md       # 🟢 Developer
│   ├── Metodología TDD
│   ├── Patrones de código
│   ├── Comandos de desarrollo
│   └── Checklist pre-commit
│
├── AGENT-QA.md             # 🔴 QA Engineer
│   ├── Protocolo de auditoría (3 niveles)
│   ├── Checklists de validación
│   ├── Template de reporte
│   └── Comandos de testing
│
├── AGENTS.md               # 📖 Índice completo
├── QUICK-START-AGENTS.md   # ⚡ Guía rápida
└── AGENTS-SETUP.md         # Este archivo
```

## ⚙️ Configuración

El archivo `.agents.json` contiene la configuración de todos los agentes:

```json
{
    "agents": [
        {
            "id": "architect",
            "name": "Arquitecto de Software",
            "file": "docs/AGENT-ARCHITECT.md"
            // ... más configuración
        }
        // ... otros agentes
    ],
    "project": {
        "stack": {
            "runtime": "Node.js 18+",
            "framework": "Express.js",
            "database": "MongoDB"
        }
    }
}
```

## 🔧 Comandos Útiles

```bash
# Ver los agentes disponibles
cat .agents.json | jq '.agents[].name'

# Abrir guía rápida
open docs/QUICK-START-AGENTS.md

# Abrir índice completo
open docs/AGENTS.md

# Ejecutar tests (para que use el QA)
yarn test

# Ver linting (parte de auditoría)
yarn lint
```

## 📊 Checklist por Fase

### 🔵 Fase de Arquitectura

```
☐ Requisitos claros
☐ Arquitecto crea SPEC.md
☐ Interfaces TypeScript definidas
☐ Riesgos identificados
☐ Aprobación del diseño
```

### 🟢 Fase de Desarrollo

```
☐ SPEC.md disponible y entendido
☐ Tests escritos PRIMERO (TDD)
☐ Código implementado
☐ Tests: yarn test ✅
☐ TypeScript: npx tsc --noEmit ✅
☐ Formato: yarn format ✅
```

### 🔴 Fase de Auditoría

```
☐ Revisión estática completada
☐ Tests ejecutados: yarn test ✅
☐ Coverage > 80%
☐ Sin vulnerabilidades de seguridad
☐ Performance aceptable
☐ Reporte emitido
☐ Veredicto: 🟢 APROBADO
```

## 🎓 Buenas Prácticas

### ✅ Cómo Usar los Agentes Correctamente

1. **Lee el archivo del agente primero**

    ```
    Abre docs/AGENT-[NOMBRE].md antes de usar
    ```

2. **Sé específico en tu solicitud**

    ```
    ❌ "Implementa el endpoint"
    ✅ "Implementa POST /api/users basándote en docs/spikes/SPEC.md"
    ```

3. **Proporciona contexto**

    ```
    ✅ Incluye el SPEC.md relevante
    ✅ Describe el comportamiento esperado
    ✅ Menciona restricciones o limitaciones
    ```

4. **Espera los entregables correctos**
    ```
    Arquitecto  → SPEC.md completo
    Developer   → Código + Tests verdes
    QA Engineer → Reporte con veredicto
    ```

### ❌ Errores Comunes

- **No leer el SPEC.md antes de implementar**
    - El Arquitecto crea el diseño, el Developer lo implementa

- **Saltar tests**
    - TDD es obligatorio: Tests primero, código después

- **No auditar antes de merge**
    - El QA valida calidad y seguridad

- **Usar el agente equivocado**
    - Arquitecto ≠ Developer ≠ QA Engineer

## 🤝 Soporte e Integración

### Con Claude Code (VS Code)

```
1. Abre la paleta de comandos (Cmd + Shift + P)
2. Busca "Claude: Open Chat"
3. Copia el rol del agente (de docs/AGENT-*.md)
4. Pega en el chat
5. Describe tu tarea
```

### Con Claude.ai (Web)

```
1. Ve a claude.ai
2. Abre un nuevo chat
3. Copia el contenido de docs/AGENT-*.md
4. Pega en el mensaje
5. Describe tu tarea
```

### Con Claude API (Programático)

```python
import anthropic

client = anthropic.Anthropic()

# Cargar el rol del agente
with open('docs/AGENT-DEVELOPER.md', 'r') as f:
    agent_role = f.read()

# Usar en el prompt
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=4096,
    system=agent_role,
    messages=[
        {
            "role": "user",
            "content": "Mi tarea específica aquí..."
        }
    ]
)
```

## 📚 Documentación Relacionada

- [README.md](README.md) - Visión general del proyecto
- [docs/AGENTS.md](docs/AGENTS.md) - Índice completo de agentes
- [docs/QUICK-START-AGENTS.md](docs/QUICK-START-AGENTS.md) - Guía rápida
- [docs/improvement-plan.md](docs/improvement-plan.md) - Plan de mejoras
- [docs/testing-coverage-plan.md](docs/testing-coverage-plan.md) - Plan de testing

## 🎯 Próximos Pasos

1. ✅ **Leer esta guía** (ya lo hiciste)
2. 📖 **Abre [docs/QUICK-START-AGENTS.md](docs/QUICK-START-AGENTS.md)** para ejemplos rápidos
3. 🔵 **Usa el Arquitecto** cuando necesites diseñar
4. 🟢 **Usa el Developer** cuando necesites codificar
5. 🔴 **Usa el QA** cuando necesites validar

---

**¿Preguntas?** Consulta [docs/AGENTS.md](docs/AGENTS.md) o [docs/QUICK-START-AGENTS.md](docs/QUICK-START-AGENTS.md)

**Última actualización:** Diciembre 2025  
**Versión:** 1.0
