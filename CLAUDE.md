# Directrices de Desarrollo - CamperStudio 3D

## Idioma de Comunicación
- Comunícate con el usuario siempre en español.
- El código, comentarios y nombres de variables deben escribirse en inglés estándar.

## Documentación del Proyecto
Antes de realizar cambios importantes, consulta siempre:
- `ARCHITECTURE.md`: Estructura técnica y patrones de diseño.
- `AGENTS.md`: Roles y responsabilidades del equipo.
- `WORKFLOWS.md`: Lógica matemática y física de colisiones/pesos.

## Reglas Estrictas de Código
- Ningún archivo puede superar las 250 líneas de código. Divide en componentes modulares.
  * Excepción: el límite de 250 líneas no aplica a los componentes y utilidades 3D de `src/components/canvas/**` (decisión del usuario). Sigue vigente en UI, store, datos y utilidades no 3D.
- Utiliza TypeScript estricto.
- Prioriza modelos 3D (.glb) y controles orbitales/transformación nativos de Drei/Three.js.

## Protocolo de Orquestación Multi-Agente
- `@LeadArchitect` actúa como el orquestador principal del proyecto.
- Cuando una tarea requiera dominio especializado, `@LeadArchitect` debe lanzar sub-agentes especializados:
  * `@CamperExpert`: Para datos técnicos de furgonetas, catálogos (`itemsCatalog.ts`), masas y fórmulas de `physicsMath.ts`.
  * `@3DEngineer`: Para Three.js, shaders, mallas GLTF y `clippingPlanes`.
  * `@UIUXDesigner`: Para maquetación, Tailwind y componentes de interfaz.
  * `@QAReviewer`: Para compilar (`npm run build`) y verificar cobertura de pruebas.
- Los sub-agentes deben ejecutar tareas aisladas y devolver únicamente el resumen de archivos creados y pruebas pasadas, evitando saturar la ventana de contexto principal.

## Directivas de Optimización de Tokens y Rendimiento
- **Respuestas concisas:** No repitas código no modificado. Emite parches precisos o archivos nuevos sin preámbulos conversacionales.
- **Evitar re-inspección:** Consulta la estructura generada previamente antes de re-leer archivos ya procesados en el mismo turno.
- **Silenciar salidas verbosas:** En comandos de terminal, redirige o filtra la salida cuando solo interese el código de salida (ej. `npm run build --silent`).
- **Pruebas en memoria:** Limpia los scripts de prueba temporales al finalizar para mantener el árbol de trabajo ligero.

## Protocolo de Memoria Persistente (SCRATCHPAD)
- Antes de iniciar cualquier tarea compleja, lee `SCRATCHPAD.md` para recuperar el estado activo.
- Al resolver o avanzar un paso, actualiza las secciones: "Tarea en Curso", "Errores pendientes" y "Siguiente Micro-Paso".
- Si el usuario ejecuta `/compact`, el primer comando tras la compactación debe ser leer `SCRATCHPAD.md` para retomar el flujo sin pérdida de contexto.

## Estrategia de Selección de Modelos (Cost & Performance Routing)

- **Orquestador Principal y Lógica 3D:**
  * Usar **Opus 5.5** para tareas que involucren Three.js, matrices matemáticas, físicas del Centro de Gravedad (CoG) o refactorizaciones complejas de arquitectura.
  * Roles: `@LeadArchitect`, `@3DEngineer`.

- **Maquetación e Interfaz:**
  * Usar **Sonnet 5.5** para componentes visuales de React, paneles laterales e integración con Tailwind.
  * Rol: `@UIUXDesigner`.

- **Datos, Verificación y Mantenimiento de Contexto:**
  * Usar **Haiku 5.5** para rellenar catálogos estáticos (`itemsCatalog.ts`), verificar la compilación (`npm run build`) y mantener al día `SCRATCHPAD.md`.
  * Roles: `@CamperExpert` (modo volcado de datos), `@QAReviewer`.