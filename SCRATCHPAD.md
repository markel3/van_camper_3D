# SCRATCHPAD - Memoria de Sesión & Estado Activo

> Este archivo es el bloc de notas volátil del orquestador. Debe actualizarse al inicio y fin de cada tarea para permitir la ejecución de `/compact` sin pérdida de contexto.

---

## 1. Tarea en Curso
- **Fase 20 (rectificada): Carpintería libre tablero a tablero.** Verificada en Chromium con ratón real: 15/15 (@QAReviewer). Eliminadas las 6 plantillas DIY (diy-bed, diy-drawers, diy-bench, diy-shower, diy-overhead, diy-board), `DiyDrawerProp` y sus formas, rutas y fixtures. Piezas (`src/data/diyCatalog.ts`): board-horizontal (grosor = altura), board-vertical (grosor = profundidad) y wood-slat 40×40 pino (longitud = anchura). Utilidades `src/utils/boardPieces.ts` (isBoardPiece, lockBoardThickness, stretchFaces, boardOrientationOf, orientBoard): el grosor queda bloqueado al material en setItemMaterial y resizeItem. Precio `src/utils/boardPricing.ts`: una hoja (área × €/m², área × grosor × densidad); listón 2,4 €/m. Store `slices/boardSlice.ts`: duplicateItem (+50 mm en Z, seleccionado, un paso de deshacer) y setBoardOrientation. 3D: `ResizeHandles3D` solo en tableros y listones y solo en caras estirables (nueva cara inferior '-y'); imán de bordes también a caras tocantes (una balda apoyada en dos laterales alinea a 0 mm); cotas con precisión 0,1 mm (`roundToTenthMM`); `props/CustomBoardProp.tsx` (CustomBoardProp, WoodSlatProp); perfil `panel` en `fitProfiles` → muesca de paso de rueda (`fitAdaptation` panelNotch, ≤60 % de la cara, sin encajonar tableros). UI (Sonnet): sección «Carpintería (tableros)» con selector de madera y 3 piezas (SVG `PieceArt`), orientación Horizontal / Vertical longitudinal / Vertical transversal, campos de grosor bloqueados y «Duplicar (Ctrl+D)». Pruebas: lateral 700→450 mm con ratón (base fija), grosor 15 mm bloqueado, un paso de deshacer, Ctrl+D +50 mm, imán a 0 mm en ambas caras exteriores, ensamblaje sin colisiones, precio de hoja 600×615 = 8,12 €, roble 18 mm, volteos, tablero de pared con muesca encaja y el rígido colisiona. Pendiente: sin prueba en GPU real; agarres pequeños en perspectiva lejana; el listón solo se alarga en X local (rotar para otras direcciones). `tsc -b` y build en verde.
- **Fase 19 (3D, store y UI implementados; @3DEngineer Opus + Sonnet; pendiente prueba en GPU real y ratón): puertas de la furgoneta y agua corriente.** UI: `components/layout/viewport/VanDoorButtons.tsx` (barra del visor: «Puerta lateral»/«Portones»), `components/layout/inspector/WaterTapButton.tsx` («Abrir/Cerrar grifo/ducha») y «Cerrar toda el agua» en `WalkthroughPanel`. Ducha: película de trazos brillantes aditivos (cono ±22°). Store solo-UI `src/store/useInteractionStore.ts` (`vanDoors`, `toggleVanDoor`, `setVanDoor`, `runningWater`, `toggleRunningWater`, `setRunningWater`, `stopAllWater`) y `src/utils/waterFixtures.ts` (`waterFixtureOf`, `WATER_FIXTURE_LABEL`). Puertas: `canvas/props/van/vanDoorMotion.ts` (progreso, aperturas, corte interior, apuntado), .glb anima `SlidingDoor_R`/`RearDoor_L`/`RearDoor_R` (sin corte de sección mientras están abiertas), carrocería procedural con hueco y hojas reales (`CargoBody.tsx`); las capas interiores se descartan en el hueco abierto (`insulation/doorCutPatch.ts`). Agua: `canvas/water/*` (chorro laminar físico + gotas/salpicaduras en GPU + película con ondas). Recorrido: [E] sobre grifo/ducha → agua, sobre el hueco de una puerta → abrir/cerrar. Verificado en Chromium (swiftshader), `tsc -b` y build en verde.
- **Fase 18 (implementada, @3DEngineer Opus): colisión = lo que se ve.** Formas compuestas por módulo en `src/utils/shapes/` (`itemShape.ts` registro + caché; `bedShape`, `benchShape`, `cabinetShapes`, `deviceShapes`, `fixtureShapes`, `decorShapes`, `vines`, `notchBoards`, `shapeBox`; tipos en `types/shape.types.ts`). Props y formas comparten layout. `moduleLayout.ts` eliminado. Motor pieza-contra-pieza (`collisionMath`), muesca por piezas (partidas + cajeado como piezas), anidado = dentro de `openSpace` y sin tocar piezas. Apoyo de decoración por piezas con nivel libre más cercano a la Y pedida (flecha Y del gizmo habilitada para decoración apoyada). Magnet, stackCarry, aisles y colisión del recorrido usan piezas. Vista: sin casco translúcido; `canvas/adapt/ItemSkin.tsx` (sustituye a `NotchCut`) tiñe las mallas visibles (cian/rojo) y aplica la muesca; picking por mallas visibles. Cambios de props: cama sin tablero de suelo ni balda (garaje abierto), almohadas ajustadas al alto, edredón dentro del largo; arcón hueco con marco frontal; frentes retranqueados por el tirador (altillo, arcón, ducha); bomba del kit y correas de la tabla corregidas; cojines, cafetera, guirnalda y planta colgante dentro de su caja. 75/75 pruebas de motor/store; comparación visual en Chromium ≤ 10 mm salvo cojines (11 mm). Miniaturas regeneradas (14).
- **Objetivo:** Fase 17 (adaptación de muebles): lógica, 3D y UI implementadas. Verificación @QAReviewer: `tsc -b` y `npm run build` con código 0; ningún `.ts`/`.tsx` fuera de `canvas/**` supera 250 líneas.
- **Fase 17 UI (Sonnet):** `src/hooks/useAdaptations.ts`, `layout/inspector/AdaptationSection.tsx` (interruptor «Adaptar al entorno», chips azules y motivo en ámbar), aviso de colisión reformulado.
- **Fase 17 (implementada, Opus):** `src/utils/fitAdaptation.ts` (`analyzeFit`, `findAdaptations`), datos en `src/data/fitProfiles.ts`, tipos en `src/types/adaptation.types.ts`, primitivas en `src/utils/collisionBoxes.ts` (re-exportadas por `collisionMath.ts`), maquetación compartida en `src/utils/moduleLayout.ts`, arrastre de equipos anidados en `src/utils/nestCarry.ts`. Muesca de paso de rueda: arco + 20 mm ≤ superficie útil y ≤ 50 % de la huella. Anidado: equipo dentro del volumen de almacenaje ±5 mm. Acción `setItemAdaptToFit`. 3D: `canvas/adapt/NotchCut.tsx` (descarte por shader, 2 cajas) y `NotchBoxing.tsx`; cama sin balda y arcón con frente translúcido cuando alojan equipos. 26/26 comprobaciones de store, `tsc -b` y build en verde, render revisado en Chromium.
- **Fase 16 (implementada):** ver abajo.
- **Fase 16 (implementada):**
  - Decoración con el mueble (Opus): nuevo `src/utils/stackCarry.ts` (`findRiders`, `carryRiders`) y `applyCarriedPoses` en `src/store/slices/projectHelpers.ts`. `moveItem`, `rotateItemQuarterTurn`, `resizeItem` y `removeItem` arrastran o recolocan la decoración en un solo paso de deshacer. Arrastre en vivo en `GizmoControl.tsx`.
  - Regla de "pasajero": decoración apoyada en superficie cuyo centro X/Z está en la huella del módulo, cuya Y coincide con su cara superior (±1 mm), y esa cara es la más alta debajo. La decoración bloqueada también se arrastra. 21/21 comprobaciones de store pasadas.
  - Movimiento vertical (Sonnet): nuevo `src/utils/verticalMove.ts` (`canMoveVertically`, `maxItemY`, `clampItemY`). El gizmo muestra flecha Y salvo en decoración apoyada y módulos de techo. Y se ajusta a la rejilla y se limita a [0, altura interior − altura del ítem] en vivo y en `moveItem`. Campo Y deshabilitado en `ItemInspector` para esos ítems.
  - Limitación: `TransformControls` de drei muestra también los planos XY/YZ cuando Y está activo.
- **Estado:** Build y `tsc -b` con código 0 (@QAReviewer). Pendiente: prueba en navegador del arrastre en vivo (acompañamiento y vertical). Modelos .glb aplazados por decisión del usuario.
- **Fase 14 (completada):** rediseño fotorrealista según las imágenes de referencia de `img/`. Se mantiene three.js; el realismo viene de HDRI, materiales PBR y postproceso.
- **Decisión de producto (Fase 14):** se mantiene three.js (sin motor nuevo). El realismo se logra con HDRI CC0, materiales PBR y postproceso.
- **Fase 10B (completada):** forro integral de madera por defecto, tuberías 3D de agua y cableado 3D, con botones «Agua» y «Electricidad» y un desglose en metros. Orquestación con sub-agentes: @QAReviewer (Haiku, store), @UIUXDesigner (Sonnet, barra y desglose) y @LeadArchitect (Opus, 3D).
- **Fase 10A (completada):** revestimiento interior, catálogo de 16 módulos y apertura de muebles.
- **Referencia visual:** `ejemplos_interior.mp4` (Pinterest) está en la raíz y en `.gitignore`. Muestra techos de listones con LED cálido, altillos, paredes claras o de madera y suelos de tarima.
- **Fase 13 (completada):** eje trasero a 2695 mm, alineado con el .glb, y props de batería, depósito y arcón.
- **Fase 12 (completada):** calibración del .glb, modo rayos X, doble corte, accesorios de techo ocultos en planta y code-splitting.
- **Decisión de producto (Fase 12):** se mantienen los 3705 mm oficiales del fabricante en `vansCatalog.ts` y en la caja de colisiones. Es el .glb el que se ajusta a ellos.
- **Regla de tamaño:** el límite de 250 líneas ya no aplica a `src/components/canvas/**` (está escrito en CLAUDE.md); sigue vigente en UI, store y datos.
- **Agente activo:** `@LeadArchitect` (Opus 5.5, implementación) y `@QAReviewer` (Haiku 5.5, cierre de ciclo).
- **Decisión de producto:** Las cajas se mantienen como geometría por defecto; un módulo de catálogo con `modelUrl` se dibuja con su .glb (todavía ningún módulo lo tiene).
- **Estado:** Sin tareas abiertas en este bloque. Pendientes de la Fase 15 en la sección 4.

---

## 2. Estado de Archivos & Implementación

### Completados y Verificados
- [x] `src/store/useProjectStore.ts`: Store Zustand + Immer + Zundo (100 pasos de historial, selección fuera de undo).
- [x] `src/data/vansCatalog.ts`: Furgón L3H2, tara 2.135 kg, MMA 3.500 kg, batalla 4035 mm y eje trasero a 2600 mm (estimación).
- [x] `src/data/itemsCatalog.ts`: 8 módulos camper con masa, precio, consumos y dimensiones.
- [x] `src/utils/physicsMath.ts`: masa total, CoG (X, Y, Z), balance lateral, balance longitudinal por palanca, % de MMA y estado de MMA.
- [x] `src/utils/energyMath.ts`: presupuesto acumulado y balance energético (Ah, W, autonomía).
- [x] `src/utils/engineeringMetrics.ts`: agregador puro de todas las métricas.
- [x] `src/hooks/useEngineeringMetrics.ts`: hook derivado del store (memoizado).
- [x] `src/components/layout/BottomTelemetry.tsx` y `telemetry/`: MMA (ámbar > 90 %, rojo > 100 %), balance lateral con banda 45-55 %, longitudinal, presupuesto y energía.
- [x] `src/types/camper.types.ts`: `VanSpec`, `SnapStepMM`, `CatalogItemDef`, `LateralBalance`, `LongitudinalBalance`, `MmaStatus`, `EnergyBalance`, `EngineeringMetrics`.
- [x] `src/components/canvas/VanShell.tsx`: caja de carga desde `van` del store, paredes con BackSide (la pared entre cámara e interior se oculta sola), pasos de rueda.
- [x] `src/components/canvas/FurnitureItem.tsx` + `FurnitureLayer.tsx`: módulos desde el store, pivote en la base, clic para seleccionar, resaltado de selección, rojo si `hasCollision`.
- [x] `src/components/canvas/CenterOfGravityMarker.tsx`: esfera del CoG siempre visible, plomada discontinua, anillo en el suelo y etiqueta en mm (conectado a `useEngineeringMetrics`).
- [x] `src/components/canvas/VanScene.tsx`: espacio furgoneta centrado en el origen; `SceneCanvas.tsx` deselecciona al hacer clic en vacío.
- [x] `src/components/layout/LeftCatalog.tsx`: búsqueda y clic para insertar módulos (Flujo 2).
- [x] `src/utils/itemFactory.ts` y `src/utils/unitConverters.ts`.
- [x] `VanSpec`: `wheelArchHeightMM` y `wheelArchLengthMM`.
- [x] Build (`npm run build`) en verde (código de salida 0).
- [x] Render verificado en Chromium sin interfaz a 1280x720 con 5 módulos: furgoneta, muebles, CoG, etiqueta y telemetría. Valores del CoG (X −129, Y 382, Z 1301 mm) comprobados a mano.
- [x] Corregido: la etiqueta `<Html>` del CoG no se montaba si había muebles al arrancar (condición de carrera de drei con `events.connected`). Ahora espera a que los eventos estén conectados.
- [x] `SceneCanvas.tsx`: `shadows="percentage"` (three r186 eliminó `PCFSoftShadowMap`).
- [x] `src/components/canvas/GizmoControl.tsx`: `TransformControls` sobre el módulo seleccionado (solo X/Z), snap a 50 mm en espacio furgoneta durante el arrastre, Y ≥ 0, `OrbitControls` bloqueado con `dragging-changed`, un arrastre = un paso de deshacer. Clic sobre el gizmo no deselecciona.
- [x] `src/components/layout/RightInspector.tsx` + `inspector/NumberField.tsx`: posición y dimensiones en mm (se aplican al salir del campo o con Enter; Esc cancela; Y < 0 rechazado; medidas fijas deshabilitadas en módulos no paramétricos), rotar 90°, eliminar.
- [x] Store: `snapStepMM` por defecto 50; `rotateItemQuarterTurn` (sin deriva numérica); `snapToGridM` en `unitConverters.ts`.
- [x] **Bug corregido en el historial:** zundo registraba un paso en cada `set()` (seleccionar creaba pasos vacíos de deshacer). Ahora usa `equality` por referencia y `moveItem` ignora movimientos nulos.
- [x] Prueba E2E en Chromium (protocolo DevTools, ratón real sobre la app): 14/14 comprobaciones (arrastre + snap, Y = 0, un paso de deshacer, clic en gizmo, Inspector, rotación ×4 = 0, deseleccionar sin crear historial). Cámara inmóvil durante el arrastre verificada por captura.
- [x] `src/utils/collisionMath.ts`: motor AABB puro con `THREE.Box3`. Caja del módulo con intercambio ancho/fondo en giros impares de 90°. Solapes entre módulos con tolerancia de 2 mm (el contacto a ras no cuenta). Límites de la caja de carga (paredes, mamparo, puertas y techo). Pasos de rueda oficiales 920 × 220 × 340 mm. Devuelve el motivo: `item`, `bounds` o `wheelArch`.
- [x] Store: `hasCollision` sincronizado tras cada cambio de geometría; `dragCollisionIds` para la vista previa en vivo durante el arrastre (fuera del historial); `undo`/`redo` limpian la selección huérfana.
- [x] `VanShell.tsx` dibuja los pasos de rueda con `wheelArchBoxes`, la misma fuente que las colisiones.
- [x] `inspector/CollisionWarning.tsx`: aviso en el Inspector con el motivo de la colisión.
- [x] `hooks/useKeyboardShortcuts.ts`: Ctrl+Z, Ctrl+Y y Ctrl+Shift+Z globales (ignorados dentro de campos de texto). Botones Deshacer/Rehacer de la barra superior conectados y deshabilitados sin historial.
- [x] `utils/parametricMath.ts`: recálculo de masa y coste por área de tablero (A = 2·(w·h + w·d + h·d)) desde la referencia del catálogo, sin acumular error (Flujo 4).
- [x] `vansCatalog.ts`: pasos de rueda oficiales; nuevo campo `wheelArchWidthMM` en `VanSpec`.
- [x] Pruebas: 19 unitarias (colisiones y paramétrico) y 20 E2E en Chromium (rojo y aviso, atajos, botones, recálculo y vista previa en vivo). Todas pasan.
- [x] `src/utils/snapMath.ts`: imantación a paredes (laterales, mamparo, puertas), caras de otros módulos y pasos de rueda a menos de 30 mm (Flujo 3). Solo atrae caras enfrentadas (solape en el otro eje horizontal y en Y). Se aplica tras el snap de rejilla durante el arrastre del gizmo.
- [x] Barra superior: botón de snap que alterna 10/50 mm con indicador del paso activo (`toolbar/ToolButton.tsx`).
- [x] Atajos: Supr/Retroceso elimina el módulo seleccionado (no si está bloqueado ni dentro de un campo), Esc deselecciona, Ctrl+S guarda.
- [x] Guardar/abrir `.camper.json`: `utils/projectFile.ts` (serialización y validación estricta campo a campo, mensajes de error en español, ids duplicados rechazados, `hasCollision` no se guarda), `store/projectPersistence.ts`, `toolbar/ProjectFileButtons.tsx` (mensaje de estado en línea). Abrir un proyecto se puede deshacer con Ctrl+Z. Tipo `ProjectFile` en `camper.types.ts`.
- [x] Comentarios del código traducidos al inglés (textos de interfaz en español).
- [x] Pruebas: 28 unitarias (imantación y archivo de proyecto) y 18 E2E en Chromium (snap, Esc, Supr, Ctrl+Z, guardar con botón y Ctrl+S, abrir archivo válido e inválido, deshacer apertura). Todas pasan.
- [x] Vistas técnicas (botón "Vistas" de la barra): Perspectiva libre, Planta cenital, Alzado lateral y Alzado trasero. Las tres últimas son ortográficas con rotación desactivada (desplazar y zoom), encuadre automático de la caja de carga y transición animada de 500 ms. Archivos: `store/useViewStore.ts`, `utils/cameraViews.ts`, `canvas/CameraRig.tsx`, `canvas/useViewTransition.ts`, `layout/toolbar/ViewMenu.tsx`.
- [x] Inspector: botones Bloquear/Desbloquear y Ocultar/Mostrar (`inspector/ItemFlagsBar.tsx`; acciones `setItemLocked` y `setItemVisible` en el store, con historial). Un módulo oculto no se dibuja ni se puede seleccionar en el visor, pero sigue contando en peso, CoG y colisiones.
- [x] `data/materialsCatalog.ts`: 9 materiales con densidad (kg/m³), grosor, €/m² y textura base (chopo 15 y 18 mm, pino macizo, abedul CPL, inox, ABS, HDPE, ACM y aluminio). Todos los `materialId` del catálogo de módulos existen. Tipo `MaterialDef` en `camper.types.ts`.
- [x] Autoguardado en `localStorage` (`store/autosave.ts`, clave `camperstudio:autosave:v1`, espera de 800 ms, guardado inmediato al cerrar la pestaña). Al arrancar restaura el proyecto y limpia el historial; si los datos están corruptos los descarta.
- [x] Corregido: la transición de cámara no giraba (`slerpQuaternions` recibía el mismo cuaternión como origen y destino), así que las vistas ortográficas salían en diagonal.
- [x] Corregido: la rejilla del suelo desaparecía con la cámara rasante (el suelo del estudio estaba a 1 mm de la rejilla; ahora a 10 mm).
- [x] Corregido: la etiqueta del CoG no aparecía al arrancar con un proyecto restaurado. Ahora se monta tras 3 fotogramas estables.
- [x] Pruebas: 25 E2E en Chromium (menú de vistas, 4 cámaras, Esc, deseleccionar en ortográfica, bloquear, ocultar, deshacer, autoguardado, restauración tras recargar y datos corruptos). Capturas revisadas de las 4 vistas. Todas pasan.
- [x] `utils/parametricMath.ts`: `estimateMassAndCost`. Peso y coste = parte fija (herrajes, equipos, mano de obra) + parte de tablero, que escala con el área (A/A₀) y con el material (grosor × densidad para la masa; €/m² para el coste). Calibrado con el catálogo: a la medida y material de catálogo devuelve exactamente sus valores. Al redimensionar, el fregadero o las bisagras ya no escalan.
- [x] `utils/itemPricing.ts`: `repriceItem` (catálogo + material → masa y coste), `BOARD_MATERIALS` (chopo 15/18 mm, pino macizo, abedul CPL) e `isBoardMaterial`.
- [x] Store: acción `setItemMaterial` (solo módulos paramétricos, no bloqueados y materiales de tablero; con historial). `resizeItem` usa `repriceItem`.
- [x] Inspector: sección Material (`inspector/MaterialField.tsx`) con desplegable para módulos paramétricos y nombre fijo para equipos comprados; muestra grosor, densidad, €/m² y una muestra de color.
- [x] Visor: cada módulo se pinta con el color base y la rugosidad de su material (`FurnitureItem.tsx`); color por categoría si el material no existe.
- [x] Pruebas: 13 unitarias (identidad con el catálogo en los 3 módulos paramétricos, redimensionado y cambio de material calculados a mano, la parte fija de la cocina se conserva) y 11 E2E en Chromium (desplegable, valores del Inspector, presupuesto, deshacer, bloqueo, material no válido, guardado). Captura con pino, abedul e inox revisada.
- [x] `utils/clearanceMath.ts`: cotas puras. Planta: ancho libre de pasillo por tramos (corte en cada borde de obstáculo, tramos iguales fusionados; solo bloquean obstáculos que empiezan por debajo de 1 m, así los altillos no cuentan; ámbar si < 600 mm). Alzados: altura libre sobre cada módulo y paso de rueda (hasta el techo o hasta lo que cuelga encima) y bajo módulos elevados sin nada debajo; en el alzado lateral se dibujan una vez las cotas que coinciden en pantalla. Se omiten tramos < 100 mm.
- [x] `canvas/DimensionLayer.tsx` + `canvas/DimensionLine.tsx`: líneas de cota con topes y etiqueta en mm, siempre encima (sin test de profundidad); solo en Planta, Alzado lateral y Alzado trasero. Se actualizan al soltar el arrastre.
- [x] `GizmoControl.tsx`: la posición imantada se redondea a la micra (el imán a pared dejaba residuos como −0,6350000000000001).
- [x] Pruebas: 13 unitarias de cotas y 33 E2E en Chromium (cotas en las 3 vistas, color de aviso, arrastre real con ratón del gizmo en planta (X y Z), alzado lateral (Z) y alzado trasero (X): mueve solo el eje arrastrado, snap 50 mm o imán, cámara quieta, un paso de deshacer). Sin errores de consola.
- [x] Texturas PBR procedurales en Canvas 2D (`utils/textureGenerator.ts`, `utils/textures/periodicNoise.ts`, `surfacePatterns.ts`, `metricBoxGeometry.ts`). Son repetibles sin costuras y tienen difuso, normal y rugosidad.
  - Familias: madera (fibra recta, anillos suaves, intensidad según `grain`), CPL mate micro-rugoso, metal satinado cepillado y plástico mate.
  - Se generan una vez por material, en tramos de unos 8 ms para no bloquear, y se comparten entre módulos.
  - Las UV de la caja van en metros, así que la veta no se estira.
- [x] `canvas/FurnitureBox.tsx` + `FurnitureItem.tsx`: el material aplica map, normalMap y roughnessMap según el material del Inspector, con metalness en los metales. Se conservan el tinte rojo de colisión, el resaltado de selección y el color plano si el material no existe.
- [x] Materiales nuevos de tablero: `roble-18mm` (680 kg/m³, 62 €/m²) y `cpl-antracita` (690 kg/m³, 52 €/m², #3a3d42). Son valores de referencia.
- [x] Sombras de contacto (`canvas/ContactShadowLayer.tsx`, `contactShadowRefresh.ts`): opacidad 0,65, escala 10, desenfoque 1,8 y alcance 1,5 m, a 2 mm sobre el suelo de carga.
  - Se recalculan solo al cambiar los módulos o la furgoneta, y en cada fotograma durante el arrastre.
  - El gizmo, el CoG y las cotas están en la capa 1 (`canvas/sceneLayers.ts`), así que no proyectan sombra; el raycaster del gizmo incluye la capa 1.
- [x] Entorno de reflejos sin conexión (`canvas/StudioEnvironment.tsx`): `Environment` de drei hecho con `Lightformer`, sin HDR ni CDN. Los metales se ven grises satinados en vez de negros. La luz ambiental y la hemisférica se han bajado a 0,2 y 0,4.
- [x] Soporte .glb: `modelUrl?` solo en `CatalogItemDef` (`itemFactory` no lo copia al módulo ni al archivo de proyecto).
  - `canvas/FurnitureModel.tsx` usa `useGLTF`, clona el modelo por instancia y lo escala para encajarlo en la caja con la base en el pivote.
  - La caja queda invisible para seleccionar y como AABB.
  - Mientras carga se ve la caja texturizada, y `ModelErrorBoundary.tsx` vuelve a ella si el .glb falla.
  - Se ha creado la carpeta `public/models/`.
- [x] Pruebas en Chromium: 17 E2E. Los 4 módulos tienen difuso, normal y rugosidad; el plano de sombra de contacto existe; la cámara ve las capas 0 y 1; la etiqueta del CoG es visible; el cambio de material cambia la textura y la caché la reutiliza; el gizmo se agarra y arrastra en perspectiva y en planta; las cotas siguen visibles. Sin errores de consola. Capturas revisadas: veta de roble y chopo, CPL antracita, inox satinado y sombra bajo la cama.
- [x] `canvas/FurnitureRenderer.tsx`: elige el prop según `catalogId`. Sin prop (arcón, batería, depósito o desconocido) se dibuja la caja texturizada. Un `modelUrl` (.glb) tiene prioridad sobre los props. Cada prop lleva una caja invisible para seleccionar, para las colisiones AABB y para el contorno; en colisión se ve una envoltura roja translúcida.
- [x] `canvas/props/`:
  - `SolarPanelProp.tsx`: marco de aluminio y células monocristalinas procedurales con capa transparente brillante, como vidrio.
  - `SkylightProp.tsx`: pestaña de sellado, marco y cúpula de policarbonato ahumado con clearcoat. Sin `transmission`, para no añadir otra pasada de render.
  - `BedProp.tsx`: base con el material del Inspector y colchón redondeado de 120–150 mm, acolchado en rombos y de tono hueso.
  - `KitchenProp.tsx`: encimera, pila de inox rehundida con desagüe y grifo.
  - `FridgeProp.tsx`: puerta con junta y tirador.
  - Comunes: `propParts.tsx` y `propMaterials.ts` (materiales compartidos). Texturas en `utils/textures/propTextures.ts`: célula solar y tejido.
- [x] Corregido: la envoltura roja de colisión parpadeaba contra la cara superior del colchón (z-fighting). Ahora usa polygonOffset (`FurnitureBox.tsx`).
- [x] Inox cepillado más suave (`surfacePatterns.ts`: relieve de 2 a 0,6 y menos contraste en las vetas).
- [x] Pruebas en Chromium: los 5 props se componen de varias mallas; clic sobre la placa solar la selecciona; la claraboya sobre la placa marca colisión; ocultar la cama la oculta; cambiar el material de la cama cambia la base. Sin errores de consola. Capturas revisadas: la placa solar y la claraboya se reconocen a simple vista, y también la cocina con pila y grifo, la nevera con tirador y la cama con colchón.
- [x] `vansCatalog.ts`: dos variantes, de valores de referencia.
  - `van_l3h2_3700` (Furgón H2, gris plata satinado).
  - `van_l3h3_camper` (Gran Volumen Camper H3, interior de 2172 mm, capuchón aerodinámico, molduras negras y toldo opcional).
  - `VanSpec` gana `bodyStyle`, `paintColor`, `awning`, `modelUrl?` y medidas exteriores: largo 5998 mm, ancho 2050 mm, suelo a 540 mm, rueda de 350 mm de radio y techo de 70 mm.
  - `projectFile.ts` acepta archivos antiguos: rellena los campos que faltan desde el catálogo y traduce los ids antiguos.
- [x] `canvas/props/VanShellProp.tsx` + `props/van/*`: carrocería procedural.
  - Cabina: morro en cuña, parabrisas inclinado, lunas tintadas, rejilla y parachoques negro mate, y retrovisores de doble brazo.
  - Ruedas: 4, con neumático y llanta plata en los ejes reales.
  - Carrocería: paredes de 90 mm y pintura con clearcoat.
  - Ocultación automática por paneles según la cámara, sin reservar memoria por fotograma.
  - `van.modelUrl` carga un .glb y vuelve a la carrocería procedural si falla.
- [x] Suelo del estudio a Y = −0,54 (los neumáticos apoyan). Las 4 vistas encuadran el vehículo completo. La sombra de contacto solo cubre el suelo de carga.
- [x] Módulos de techo (`mount: 'roof'` en el catálogo; `utils/roofMount.ts`).
  - La claraboya y la placa solar se colocan sobre el techo exterior (2,002 m en H2 y 2,242 m en H3).
  - Colisionan con una zona de techo propia y entre ellos, no con los módulos interiores.
  - `setVan` los recoloca al cambiar H2 ↔ H3 en un solo paso de deshacer.
  - Quedan fuera de las cotas de pasillo y de altura libre; el CoG los sigue contando.
- [x] Menú «Chasis» en la barra (`toolbar/ChassisMenu.tsx`): las 2 variantes y el interruptor «Toldo lateral», que solo está activo en la Camper Pro. `hooks/useMenuDismiss.ts` se comparte con `ViewMenu`.
- [x] Pruebas en Chromium: 13 E2E, sin errores de consola.
  - Módulos de techo a 2,002 m sin colisiones; el menú lista 2 variantes; el toldo está desactivado en el furgón.
  - Al pasar a Camper Pro los módulos de techo suben a 2,242 m en un solo paso de deshacer, y el toldo se activa y desactiva.
  - Las cotas siguen apareciendo en los alzados.
  - Capturas revisadas: 3/4 delantero y trasero de ambas variantes, cabina de la Pro, pose por defecto y vistas ortográficas.
- [x] `vansCatalog.ts`: `modelUrl: '/models/van-l3h2.glb'` solo en `van_l3h2_3700`. El modelo es H2 sin capuchón, así que la Camper Pro sigue con la carrocería procedural. Los proyectos guardados sin `modelUrl` lo toman del catálogo.
- [x] `props/van/vanModelFit.ts` + `VanModel.tsx`: ajuste del .glb.
  - Clon por instancia y giro de 180° en Y (el modelo mira a +Z).
  - Escala uniforme 1,000: la batalla medida en las ruedas, 4,035 m, coincide.
  - Desplazamiento (0, −0,54, +0,615): eje trasero alineado con `rearAxleZMM` y neumáticos sobre el suelo del estudio.
  - `Cargo_Floor` del modelo oculto, para evitar z-fighting con nuestra losa. Sombras solo en ruedas y parachoques. Sin raycast.
  - Con Suspense y error boundary; la carrocería procedural es el respaldo.
- [x] Corte seccional (`props/van/sectionCut.ts`, `cargoPanels.ts`):
  - `gl.localClippingEnabled = true`.
  - Materiales clonados con planos compartidos, `clipIntersection` y `DoubleSide`.
  - Según la cámara se abre la pared lateral, los portones o el techo de la zona de carga, sin tocar la cabina ni las ruedas. Las reglas son las mismas que en la ocultación procedural.
- [x] Pruebas en Chromium: el .glb carga; clipping activo con intersección; `Cargo_Floor` oculto; la Camper Pro no muestra el .glb. Capturas revisadas:
  - 3/4 delantero con la orientación correcta (cabina hacia −Z y puerta del conductor en −X);
  - 3/4 trasero-lateral con la pared derecha cortada y los muebles visibles;
  - alzado lateral con cotas y planta con el techo cortado.

- [x] Calibración del .glb (`props/van/vanModelFit.ts`):
  - Estiramiento en Z anclado en el mamparo (Z = 0), de 1,0364: la cara interior de los portones queda en 3705 mm (antes 3575).
  - Bajada de 55 mm: el suelo `Cargo_Floor` del modelo queda a Y = 0.
  - Las ruedas se compensan: se suben 55 mm y no se estiran en Z, así que siguen redondas (700 × 700 mm) y apoyadas en el suelo (Y = −540).
  - Las ruedas tienen ahora clones de material sin corte, para poder hacerlas transparentes sin tocar la caché del glTF.
  - Medido en Chromium: portones a 3705, suelo a 0, neumáticos a −540.
- [x] Modo Chasis Transparente:
  - `isVanTransparent` y `toggleVanTransparent` están en `useViewStore`, fuera del historial y del archivo. Se activa con el botón `ScanEye` de la barra, junto a Vistas, con `aria-pressed` (`ToolButton` gana la prop `pressed`).
  - `props/van/ghostChassis.ts` (`useGhostChassis`) actúa sobre todo lo que cuelga de `VanShellProp`: .glb, carrocería procedural, losa de suelo y pasos de rueda. Pone transparent, opacidad 0,18, `depthWrite: false` y `clippingPlanes: null`. Guarda el estado original en `userData`, así que el cambio es reversible.
  - Todas las mallas del chasis tienen raycast desactivado.
  - Con rayos X, la carrocería procedural muestra todos sus paneles.
  - Verificado en Chromium: clic en la cama a través de los portones transparentes la selecciona, y el gizmo arrastra con rayos X (X 0 → −0,55 m).
- [x] Doble corte (`sectionCut.ts`, `chooseCargoOpening`, `isPanelOpen`): en perspectiva con chasis opaco se abren el techo y la pared lateral más cercana a la cámara. Desde atrás se mantiene el corte de portones.
  - En el .glb es una cuña diagonal: va desde el borde superior de la pared lejana hasta la línea de suelo de la pared cercana, con 4 planos en intersección. No se pueden hacer dos huecos-caja con un solo conjunto de planos.
  - La carrocería procedural oculta los mismos paneles (`useAutoHidePanels`).
  - `removeBeyond` normaliza la normal del plano.
  - Las vistas ortográficas mantienen su corte único.
- [x] En planta no se dibujan la placa solar ni la claraboya (`canvas/viewVisibility.ts`, `isHiddenInView`): ni se pintan ni se seleccionan, y el gizmo no se engancha. Siguen contando en peso, CoG y colisiones.
- [x] Code-splitting (`vite.config.ts`, `rolldownOptions.output.codeSplitting.groups`). Prioridades: react 40, three 30 y @react-three (con three-stdlib, troika, etc.) 20. Hace falta que react y three tengan más prioridad que @react-three, porque cada grupo arrastra sus dependencias.
  - Chunks: app 101 kB, react 219 kB, react-three 386 kB y three 737 kB (antes, uno solo de 1,44 MB). `chunkSizeWarningLimit` 800.
- [x] Pruebas en Chromium. Capturas revisadas: perspectiva con doble corte por ambos lados, planta sin accesorios de techo y la cama enrasada con los portones, rayos X por ambos lados con los muebles sólidos dentro, y vuelta a opaco con el corte restaurado. Sin errores de consola, salvo el aviso conocido de `THREE.Clock`.

- [x] Eje trasero L3H2: `rearAxleZMM` pasa de 2600 (estimación) a 2695 mm. Cuadra con el voladizo trasero oficial de unos 1015 mm y con el hueco de rueda del .glb. También afecta a la Camper Pro, que comparte plataforma.
  - Los pasos de rueda interiores de colisión se centran en 2695.
  - El reparto longitudinal (`physicsMath`) usa el nuevo eje.
  - `projectFile.ts`: un archivo o autoguardado con el valor obsoleto 2600 se actualiza al valor del catálogo (`LEGACY_REAR_AXLE_Z_MM`).
- [x] `vanModelFit.ts`: el ajuste en Z usa ahora dos puntos, el eje trasero en `rearAxleZMM` y la cara interior de los portones en `cargoL`. Antes estiraba alrededor del mamparo, y al cambiar el eje este se desplazaba (con 2695 habría acabado en ~2720).
  - Medido en Chromium: eje del .glb a 2695, centro del paso de rueda a 2695, portones a 3705, suelo a 0 y neumáticos a −540. Con estas medidas, la batalla visual del .glb sale de unos 4180 mm, frente a 4035 oficiales.
- [x] Nuevos props (`canvas/props/`), registrados en `FurnitureRenderer`; su aspecto es fijo, al ser equipos comprados:
  - `BatteryProp.tsx`: caja antracita, tapa negra diferenciada, bornes con funda roja (+, en +X) y negra (−) y poste metálico, dos asas en los extremos de la tapa y pantalla LCD retroiluminada en el frente (+Z).
  - `WaterTankProp.tsx`: carcasa de polietileno natural translúcida (opacidad 0,6, sin `depthWrite`) con el nivel de agua azul visible dentro (70 %). Lleva dos cinchas horizontales de refuerzo, nervios verticales en las caras largas y tapón de registro roscado (collarín, tapón y 4 anillos de rosca).
  - `StorageBenchProp.tsx`: arcón en el material de tablero del Inspector, con zócalo oscuro rehundido, tapa abatible separada por una ranura de la tira trasera fija (bisagras), puerta frontal con ranura de sombra de 5 mm y pulsador push-lock cromado con aro oscuro.
  - Materiales nuevos en `propMaterials.ts`: `batteryCase`, `batteryLid`, `terminalRed`, `terminalBlack`, `lcd`, `tankShell`, `tankWater` y `tankCap`.
- [x] Pruebas en Chromium: los 8 módulos sin colisiones y todos compuestos de varias mallas (cama 3, cocina 14, nevera 5, arcón 10, depósito 17, batería 11, placa solar 7 y claraboya 4, contando la caja invisible). Sin errores de consola, salvo el aviso de `THREE.Clock`. Capturas revisadas: vista general, paso de rueda centrado sobre la rueda del .glb (rayos X) y primeros planos de la batería, el depósito y el arcón.

- [x] **Fase 10A, revestimiento interior.**
  - `VanInteriorFinish` (techo, suelo, paredes y `ledStrips`) se guarda en `useProjectStore.interiorFinish`, con historial (`setInteriorFinish`). También se guarda en el archivo y en el autoguardado (`interiorFinish` opcional; los archivos antiguos toman `DEFAULT_INTERIOR_FINISH`, todo desnudo). Las opciones están en `data/interiorFinish.ts`.
  - Menú «Interior» en la barra (`toolbar/InteriorMenu.tsx`) con tres grupos de opciones y un interruptor para el LED.
  - `props/van/InteriorLining.tsx`, montado en `VanShellProp`:
    - Techo de listones de pino de 70 mm con huecos de 22 mm, colgado 60 mm bajo la altura oficial (`CEILING_DROP_M`). Así queda también bajo el techo interior del .glb, que está a 1885 mm.
    - Dos tiras LED de 3000 K (emisivas) a ±42 % del semiancho, en el hueco de los listones, y 3 `pointLight` cálidas fuera del grupo del techo, para que sigan encendidas aunque se corte el techo.
    - Tarima de 4 mm (roble o pino) sobre Y = 0, con juntas escalonadas.
    - Paredes de madera clara (abedul CPL, machihembrado de 120 mm) o panelado blanco roto mate (juntas cada 600 mm), dentro del grosor de la pared de la carrocería.
    - Juntas: máscaras alphaMap en `utils/textures/liningTextures.ts`, con UV en teselas (`createTiledPlaneGeometry`).
    - Las paredes y el techo siguen los cortes de cámara de la carrocería (`useAutoHidePanels`), y el modo rayos X los convierte en fantasma.
    - Usa sus propios clones de material: el modo rayos X no puede tocar los materiales compartidos con los muebles.
  - `sectionCut.chooseCargoOpening`: con la cámara dentro de la carrocería no hay corte, así se ven el techo y los LED desde dentro.
  - No cambia colisiones, masas ni cotas.
- [x] **Fase 10A, catálogo.** 8 módulos nuevos (valores de referencia):
  - cabina de ducha + WC (800 × 1880 × 700);
  - inodoro portátil (420 × 330 × 380);
  - altillo (1000 × 380 × 350, `mount: 'overhead'`);
  - cajonera (600 × 850 × 600);
  - mesa tipo Lagun (700 × 720 × 450);
  - depósito de aguas grises de 90 L;
  - kit hidráulico (bomba 12 V + boiler de 10 L);
  - inversor de 2000 VA.
  - `itemFactory`: el altillo se coloca en Y = altura interior − alto, contra la pared −X y girado 90° con el frente hacia el pasillo.
  - `utils/catalogLookup.ts` (`findCatalogDef`, `isArticulated`, `catalogGroup`) y `LeftCatalog` con acordeones: Estructura y muebles (7), Agua y baño (5), Electricidad (2) y Techo (2). Al buscar se muestran todas las coincidencias.
  - Props nuevos en `canvas/props/`: `ShowerCabinProp`, `ToiletProp`, `OverheadCabinetProp` (tira LED inferior que se enciende con el LED del menú Interior), `DrawerUnitProp`, `LagunTableProp`, `HydraulicKitProp`, `InverterProp` y `GreyWaterTankProp` (variante de `WaterTankProp`). Materiales nuevos en `propMaterials.ts`.
- [x] **Fase 10A, apertura.**
  - `CamperItem.isOpen?` se guarda en el archivo; `articulated` va solo en el catálogo. Acción `setItemOpen` con historial. No toca las colisiones.
  - Botón Abrir/Cerrar en el Inspector (`inspector/OpenCloseButton.tsx`), solo en módulos articulados.
  - `props/articulation.tsx`: `Hinge` (bisagra animada) y `Slide` (guía de cajón), con amortiguación de ~0,3 s. Recalculan la sombra de contacto mientras se mueven.
  - Qué se abre:
    - nevera: la puerta gira 85° y deja ver el interior blanco;
    - cocina: dos puertas nuevas con pomo y zócalo;
    - arcón: la tapa se levanta y la puerta gira;
    - altillo: la trampilla sube;
    - ducha: la puerta gira;
    - cajonera: los tres cajones salen el 80 % de su fondo.
- [x] Pruebas en Chromium:
  - 15 módulos sin colisiones, todos de varias piezas (de 4 a 23 mallas).
  - Los 8 nuevos se insertan desde los botones reales del catálogo.
  - El altillo se coloca en (−0,76; 1,552) con un giro de 90°.
  - El botón Abrir del Inspector abre la cajonera, y el menú Interior cambia las paredes y el suelo.
  - El autoguardado conserva el acabado y los 6 módulos abiertos.
  - Sin errores de consola, salvo el aviso de `THREE.Clock`.
  - Capturas revisadas: vista general con doble corte, interior hacia delante (techo de listones con LED, blanco roto y roble), muebles abiertos, y madera clara con pino, equipos, inodoro con mesa Lagun, y planta.
- [x] Refactor del store (@QAReviewer, Haiku): `useProjectStore.ts` reducido de 241 a 150 líneas; movimiento/rotación extraídos a `src/store/slices/itemGeometrySlice.ts` (43 líneas), flags/material/acabado a `src/store/slices/itemFlagsSlice.ts` (56 líneas) y helpers a `src/store/slices/projectHelpers.ts` (22 líneas). API pública sin cambios. `tsc` sin errores en `src/store`; el build solo fallaba por `SystemsBreakdown.tsx`, que esperaba el contrato del @LeadArchitect; ya está resuelto y el build final está en verde.

- [x] **Fase 10B: UI de instalaciones (@UIUXDesigner, Sonnet).**
  - `useViewStore`: `showWater`, `showElectrical`, `toggleWater` y `toggleElectrical`, fuera del historial y del archivo.
  - `toolbar/SystemsToggles.tsx`: botones «Agua» (`Droplets`) y «Electricidad» (`Zap`) en la barra, junto al de rayos X, con `data-systems-toggle`.
  - `inspector/SystemsBreakdown.tsx`: «Instalaciones» en el Inspector cuando no hay nada seleccionado. Por red: color, sección o diámetro y metros; total por grupo; aviso si la vista 3D está apagada.
- [x] **Fase 10B: forro integral (@LeadArchitect).**
  - `canvas/props/InteriorLiningProp.tsx` sustituye a `van/InteriorLining.tsx`. Por defecto: friso de pino machihembrado en tablas horizontales (opción nueva `warmWood`), techo de listones de pino con LED de 3000 K y tarima de roble (`DEFAULT_INTERIOR_FINISH`). Los archivos sin acabado también lo toman.
  - Envolvente continua:
    - suelo;
    - paredes laterales de arriba abajo;
    - chaflanes de 45° y 90 mm en la unión pared-techo;
    - techo;
    - mamparo con paneles laterales, cabecero y marco de roble alrededor del paso a cabina de 1450 mm;
    - cara interior de los portones, con la junta entre hojas;
    - pasos de rueda forrados en la madera de las paredes (`liningArchMaterial`).
  - Techo a ras: la cara inferior de los listones queda a la altura oficial; la cámara de 20 mm está dentro del grosor del techo (`CEILING_CAVITY_M`). En `CargoBody` la piel interior del techo procedural sube 20 mm. El altillo y la ducha quedan a ras, sin atravesar el techo.
  - `.glb`: estiramiento en Y alrededor del suelo, para que su techo exterior coincida con `roofTop` (medido: 2002 mm). Su techo interior queda en unos 1960 mm, por encima de 1932. Las ruedas se compensan (700 × 700 mm, apoyadas en −540) y las placas del techo apoyan sobre el modelo.
  - Corte: `SECTION_PLANES` es un único juego de planos de corte para toda la escena (`sectionCut.ts`), escrito por `VanModel` y que vuelve a «no cortar» al desmontarse. Los materiales del forro lo llevan cuando el chasis es el .glb, y además siguen las reglas de ocultación por paneles. El modo rayos X mantiene sincronizada su copia de seguridad.
- [x] **Fase 10B: redes 3D (@LeadArchitect).**
  - `utils/systems/systemPorts.ts`: racores y bornes por módulo, en coordenadas locales y con giro.
  - `utils/systems/systemsRouting.ts`: rutas ortogonales. El agua va por el suelo, por un carril de pared o en directo si los dos extremos están cerca del centro. Los cables van por las aristas pared-suelo y pared-techo. Cada red tiene su carril y su desfase. El LED se trata como consumidor sintético.
  - `hooks/useSystemRoutes.ts`.
  - `canvas/systems/SystemsRouting3D.tsx`: `TubeGeometry` con codos redondeados de 50 mm, racores de latón o prensaestopas, una pasada sólida y otra fantasma por encima (opacidad 0,3, sin prueba de profundidad), y capa de overlay (no proyecta sombra ni se selecciona).
  - `WaterSystem3D.tsx`: agua fría `#0ea5e9` Ø12, caliente `#ef4444` Ø12 y grises `#64748b` Ø25.
  - `ElectricalSystem3D.tsx`: solar `#f59e0b`, 12 V `#f97316` y 230 V `#10b981`.
  - Montados en `VanScene`, fuera de la carrocería: ni el modo fantasma ni el corte les afectan.
- [x] Pruebas en Chromium:
  - Acabado por defecto confirmado; 15 módulos sin colisiones.
  - 15 rutas: 26,2 m de agua (fría 8,8, caliente 8,0, grises 9,3) y 33,6 m de cable (solar 5,7, 12 V 16,2, 230 V 11,7). Los botones reales de la barra activan las redes y el desglose muestra los mismos metros.
  - Calibración: techo 2002, suelo 0, eje 2695, portones 3705 y neumáticos 700 × 700 apoyados en −540.
  - Sin errores de consola, salvo el aviso de `THREE.Clock`.
  - Capturas revisadas: vista general con el forro cortado; interior hacia delante y hacia atrás (chaflanes, marco del mamparo, LED); altillo a ras del techo; vista por los portones; redes en opaco y en rayos X desde los dos lados.
- [x] **Fase 14: rediseño fotorrealista según `img/` (verificado).**
  - Render (@3DEngineer, Opus): `src/components/canvas/render/` (`renderQualityStore` high/balanced/low, `useLightingMood`, `PostEffects` con N8AO + Bloom + AgX + viñeta + SMAA, `OverlayPass`, `StudioBackdrop`). HDRI `public/hdri/studio_small_09_1k.hdr` (Poly Haven, CC0). Normales del .glb reconstruidas (crease de 35°) y materiales mejorados por nombre (pintura con clearcoat, cristal, goma, llantas, cromo). Suelo de estudio oscuro con rejilla azul. Modo día/noche.
  - Interior (@3DEngineer, Opus): `props/insulation/` (`BareShell` con ray-cast de perfil desde `van-l3h2.glb`, `InsulationLayer`, listones). Forro PBR en `InteriorLiningProp`. Texturas `public/textures/lining-*` e `insul-*` (Poly Haven + ambientCG, CC0; 7,7 MB). Activación por `layers.structure` / `layers.insulation`.
  - Mobiliario y decoración (@3DEngineer, Opus): `finishMaterials.ts`, `propGeometry.ts`, `cabinetParts.tsx`. Rediseñados cocina, cajones, altillo, banco, cama, nevera, mesa y ducha (verde salvia + roble). `src/data/decorCatalog.ts` con 8 items `decor-*`. Nuevos: `seat-chest-1000`, `bed-rear-garage`, `fridge-85l`, `fridge-100l`. Materiales: `roble-salvia`, `lino-natural`, `ceramica`, `yute`. Modelos en `public/models/decor/` (con `CREDITS.md`).
  - Recorrido (@3DEngineer, Opus): `canvas/walkthrough/` y `layout/walkthrough/`. WASD, mirada con ratón (arrastre como alternativa), ojos a 1,75 m, radio de colisión 0,2 m, E interactúa, minimapa, día/noche y botón «Cerrar Recorrido».
  - Interfaz (Opus): nuevo shell en `layout/` (barra de menús, catálogo con miniaturas, barra de herramientas del visor, propiedades por fase, Capas, stepper de flujo, modal de nuevo proyecto), `ui/` y `canvas/overlays/ViewCube.tsx`. `scripts/capture-thumbnails.mjs` genera `public/thumbnails` (33 webp). Eliminados `TopToolbar`, `LeftCatalog`, `RightInspector` y `toolbar/`.
  - Datos (@CamperExpert, Haiku): furgones L2H2 3,27 m, L3H2 3,45 m y L3H2 3,49 m (valores de referencia). `insulationCatalog.ts` (7 materiales), `insulationMetrics.ts`. El aislamiento entra en masa, CoG y presupuesto. `projectFile` valida el aislamiento.
  - Orquestador: contratos compartidos (tipos `WorkflowPhase`, `SceneLayerId`, `Insulation*`; categoría `CategoryType` 'decor'; `useViewStore` con fases, capas, recorrido, noche, `ledIntensity` y `newProject`). `utils/textures/pbrTextures.ts` con placeholder de 1×1 para evitar avisos «no image data». Los items de decoración quedan fuera de las colisiones de items y pasos de rueda (`isDecor` en `collisionMath`). `types` compactado a 247 líneas.
  - Verificación: `tsc` y `npm run build` en verde. Capturas en Chromium (SwiftShader) de las 5 fases, del recorrido y del modal de nuevo proyecto. Consola limpia, salvo el aviso de deprecación de `THREE.Clock`.
  - Pendiente de esta fase (sección 4): modelos .glb de furgoneta de alto detalle (el `van-l3h2.glb` actual es de poca malla y es la principal carencia de realismo; los otros furgones solo tienen carrocería procedural); swatches «Lino Beige» y «Verde Salvia» solo de muestra; ajuste de la decoración sobre superficies de muebles; herramientas Seleccionar/Mover en la barra solo muestran estado; error boundary alrededor del Canvas si falla WebGL; comprobación de FPS en GPU real (el agente de render midió 40–55 FPS en 'high' con AMD 680M).

- [x] **Fase 15: apilado de decoración (@3DEngineer, Opus).**
  - `src/utils/surfaceSnap.ts` (puro). Regla: si el centro X/Z del ítem decor cae dentro de la huella (con bordes) de un mueble no decor y no techo, Y = cara superior más alta; si no, Y = 0.
  - La alfombra y otros decor no cuentan. Los ítems `mount: 'overhead'` (planta colgante, guirnalda LED, tabla de surf) conservan su Y.
  - Aplicado en `addItem`, en `moveItem` (un paso de deshacer) y en vivo durante el arrastre del gizmo (`GizmoControl`). `itemFactory` acepta `items` opcional.
- [x] **Fase 15: herramientas (@UIUXDesigner, Sonnet).** `useViewStore.activeTool`: `'select' | 'move'` (por defecto `'move'`). Seleccionar oculta los TransformControls; Mover los muestra. Atajos V y G.
- [x] **Fase 15: muestras PBR (Sonnet).**
  - `layout/properties/decorSwatches.ts`. `materialsAllowedFor(item)` en `itemPricing.ts` gobierna `setItemMaterial`.
  - Muebles: Roble → `roble-18mm`, Verde Salvia → `roble-salvia`, Negro Mate → `negro-mate`.
  - Cojines: Lino Beige → `lino-natural`, Verde Salvia → `lino-salvia`, Negro Mate → `lino-negro` (nuevos en `materialsCatalog`).
  - Las muestras no aplicables se ven en gris con aviso. `SmallDecorProps` lee `materialId`.
- [x] **Fase 15: WebGL (orquestador).** `canvas/CanvasErrorBoundary.tsx` y comprobación previa de WebGL2: panel amigable en español con «Reintentar».
- [x] **Fase 15: instalaciones (orquestador).** Tuberías y cables visibles solo con `showWater`/`showElectrical` y la capa «Instalaciones» (`layers.systems`).
  - Verificado en Chromium con 8 equipos: 10 recorridos (agua 10,5 m, cable 25,9 m); se ocultan al apagar la capa.
  - Cafetera sobre cocina a y=0,9 m; al sacarla, y=0.
  - Gizmo oculto en Seleccionar.
  - Cocina a negro-mate: 976 → 894,40 €.
- [x] **Fase 15: build (@QAReviewer).** `npm run build` con código de salida 0. Ningún archivo fuera de `src/components/canvas/` supera 250 líneas (el mayor: `camper.types.ts`, 247).

### En Progreso / Pendientes Inmediatos
- [ ] Verificar datos de `itemsCatalog.ts` contra fichas de fabricante (valores de referencia).
- [ ] Confirmar el eje trasero de el furgón L3H2 (2695 mm, deducido del voladizo y del .glb) con la guía de carroceros.
- [ ] Inconsistencia de datos: `wheelArchSpacingMM` = 1422 mm, pero 1870 − 2 × 220 = 1430 mm. `wheelArchSpacingMM` ya no se usa en geometría; confirmar cuál es el dato real (@CamperExpert).

---

## 3. Errores de Compilación & Alertas Pendientes
- **TypeScript / Build:** 0 errores (`npm run build` y `npx tsc -b`, código de salida 0, verificado por @QAReviewer en Fase 20).
- **Tamaño de ficheros:** ningún `.ts`/`.tsx` fuera de `src/components/canvas/` supera 250 líneas (el mayor: `camper.types.ts`, 250). `src/components/canvas/**` no tiene límite (CLAUDE.md). Bundle (Fase 12): app 101 kB, react 219 kB, react-three 386 kB y three 737 kB, sin comprimir.
- **Pruebas de fórmulas:** casos simétricos, ponderados, desequilibrio, MMA, autonomía y masa vacía. Pasan.
- **Deuda técnica:**
  - Supuestos de energía sin validar: `BATTERY_NOMINAL_V = 12.8` y `BATTERY_USABLE_RATIO = 0.8` (`energyMath.ts`).
  - Tara centrada entre ejes en el reparto longitudinal (estimación).
  - El área de tablero se aproxima con la caja envolvente (no cuenta baldas ni divisiones interiores).
  - El Inspector muestra el aviso de colisión al soltar el arrastre, no durante él (el visor sí lo muestra en vivo).
  - La imantación solo actúa al arrastrar con el gizmo; los valores escritos en el Inspector se respetan tal cual.
  - En planta la etiqueta de una cota puede solaparse con la del CoG cuando coinciden en Z.
  - three voltea las flechas del gizmo hacia el lado de la cámara (usa la fórmula de perspectiva también en ortográfica): la flecha puede apuntar al sentido contrario del eje, pero el arrastre sigue al ratón.
  - El ancho de pasillo usa la caja envolvente de cada módulo; el umbral de 1 m para obstáculos que bloquean el paso es una estimación.
  - Las densidades y precios de `materialsCatalog.ts` y la parte fija calibrada de cada módulo son estimaciones de referencia; verificar con proveedor.
  - Fase 16: `TransformControls` muestra los planos XY/YZ cuando el eje Y está activo; el arrastre vertical en vivo no está probado en navegador.
  - Fase 20 (rectificada):
    - Sin prueba con GPU real.
    - Los agarres de redimensionado son pequeños en vistas en perspectiva lejanas.
    - El listón solo se alarga en X local (rotar para otras direcciones).
    - Pesos y precios de tableros y listones son estimaciones; verificar con proveedor.
  - Fase 19:
    - El jugador no sale por las puertas abiertas (la caja de colisión no cambia); solo se ve el exterior.
    - Abiertas, las puertas no cuentan en colisiones ni cotas; el interior de las hojas del .glb sigue con la pintura exterior.
    - El escalado no uniforme del .glb (≈ 3,6 % en Z) alarga ligeramente los portones al girar 90°.
    - Sin sonido de agua (opcional, no implementado). El chorro del grifo es vertical desde la boca (ignora la inclinación del caño).
    - El agua no choca con los muebles más allá del plato/inodoro y el seno; la etiqueta del CoG (`Html`) se ve en el recorrido (previo).
    - El chorro del grifo es fino y duro: poco visible a altura de ojos.
    - El agua corriente no se limpia al borrar el elemento.
    - Sin prueba en GPU real ni con ratón de los botones nuevos.
    - Coste medido en swiftshader: ≈ 1,6 → 1,3 FPS con ducha y grifo en vista (relativo).
  - Fase 18:
    - Imantación y apoyo de decoración usan las piezas sin muesca (el cajeado del arco no ofrece apoyo ni cara de imán).
    - El minimapa del recorrido sigue dibujando la envolvente de cada módulo.
    - El arrastre en vivo con piezas no está probado con ratón real en navegador (sí la selección por clic: depósito dentro del garaje, hueco vacío deselecciona).
  - Fase 17:
    - Muesca de paso de rueda: solo se ve al soltar el arrastre (forma y alojamiento); la zona recortada sigue proyectando sombra.
    - Los modelos .glb no admiten muesca.
    - La cama fija de 400 mm colisiona con los arcos salvo que se eleve (sigue así en Fase 18: su somier está a 200 mm, bajo el arco).
    - La vista del armario (locker) con corte no está comprobada visualmente.
    - Sin insignia de adaptación en el outliner.
  - Aviso de three r186: `THREE.Clock` obsoleto (viene de @react-three/fiber; no es de nuestro código).
  - Los modelos .glb se escalan por eje para llenar la caja, así que un modelo con otras proporciones se deforma; se puede cambiar a escala uniforme.
  - Ningún módulo de mobiliario tiene `modelUrl` todavía (la furgoneta L3H2 sí: `van-l3h2.glb`). Los 8 se dibujan con props procedurales.
  - La textura de madera a 1024 px tarda unos 0,8 s de CPU por material (en tramos); mientras tanto se ve el color plano.
  - Con cámara rasante la veta de las caras superiores se suaviza por el mipmapping.
  - Al añadirlas, la claraboya y la placa solar aparecen en el mismo punto del techo exterior, así que colisionan si se añaden ambas hasta que se mueve una.
  - La encimera de la cocina queda unos 160 mm por debajo del borde de la caja, para que el grifo quepa dentro del AABB.
  - El frente de la cocina y de la nevera mira a +Z local.
  - La cara interior de las paredes usa la misma pintura brillante que el exterior y refleja bandas diagonales del entorno. Debería tener un revestimiento interior mate.
  - Las medidas exteriores, la tara de la Camper Pro y su altura interior H3 son valores de referencia.
  - Calibración del .glb: el estiramiento en Z (unos 3,6 %) deja su batalla visual en unos 4180 mm, frente a 4035 oficiales, y su largo total en unos 6,29 m. El eje trasero y los portones sí coinciden con los datos (2695 y 3705).
  - Los props de batería, depósito y arcón tienen el frente en +Z local, como la cocina y la nevera.
  - Fase 10B:
    - Los chaflanes del forro entran 90 mm en las esquinas superiores. Un altillo pegado a la pared los tapa con su caja, sin parpadeo visible.
    - Las rutas son ortogonales y simples: pueden pasar bajo los muebles y superponerse dentro de una misma red. Las longitudes no suman holguras ni codos.
    - Las secciones de cable son nominales, no calculadas.
    - Con el .glb estirado en Y, las nervaduras del techo sobresalen 16 mm sobre `roofTop`.
  - Fase 10A:
    - (Resuelto en 10B) el techo de listones colgaba 60 mm; ahora va a ras de la altura oficial.
    - Las puertas y cajones abiertos no cuentan en colisiones ni en cotas de pasillo; solo sirven de comprobación visual.
    - Al cambiar H2 ↔ H3 el altillo no se reubica: no sube con el techo.
    - El mamparo (Z = 0) y los portones no tienen revestimiento.
    - La cara interior de los portones del .glb sigue con la pintura exterior.
    - Las `pointLight` del LED recompilan los shaders al activarse o desactivarse (una vez).
    - Pesos, precios y consumos de los 8 módulos nuevos son valores de referencia.
    - El bundle principal pasa de 101 a 131 kB.
  - La carcasa translúcida del depósito no escribe profundidad: si se superpone a otro objeto transparente, el orden de dibujo puede variar.
  - El doble corte del .glb es una cuña diagonal: deja una franja de unos 90 mm de techo sobre la pared lejana.
  - Con rayos X la carrocería sigue proyectando sombra direccional (ruedas, parachoques y paneles bajos procedurales).
  - En perspectiva, con el techo cortado, la placa solar y la claraboya siguen flotando a la altura del techo (solo se ocultan en planta).

---

## 4. Siguiente Micro-Paso
0. Fase 20b (hecho): la tecla R (y el botón) alterna Redimensionar ↔ Mover; botón central del ratón = desplazar la vista (pan) en perspectiva y en vistas ortográficas (`CameraRig.tsx`). Verificado en Chromium (R: move → resize → move; arrastre central mueve el target 0,93 m).
0. Fase 20 (pendiente): prueba en GPU real; agarres de redimensionado más grandes en vistas lejanas; listón con longitud en cualquier dirección sin rotar; ajustar pesos y precios con proveedor.
0. Fase 19 (pendiente): probar en GPU real y con ratón los botones de puertas y agua. Decisión del usuario: el grifo se queda como está y no habrá sonido de agua.
0. Fase 19b (hecho): puerta de la cocina abría hacia dentro (bisagra derecha, ahora `+DOOR_OPEN_RAD`); arcones (`StorageBenchProp`) se abren solo por la tapa, frente fijo; etiqueta del CoG oculta en primera persona; el agua corriente se limpia al borrar la cocina o la ducha (suscripción en `useInteractionStore`). `tsc -b` y build en verde; sin verificar visualmente.
0. Fase 18 (pendiente): probar en navegador con ratón el arrastre en vivo (decoración bajo/sobre la mesa con la flecha Y, cama sobre arcos). El brillo de selección es débil sobre superficies blancas: valorar contorno (outline). Magnet y reposo de decoración ignoran las tablas de cajeado de arcos. Aproximaciones de decoración orgánica (cojines 11 mm frente a ≤ 10 mm del resto).
0. Fase 17 (pendiente): revisar en navegador la muesca al soltar y el corte del armario; decidir si el outliner muestra insignia de adaptación; valorar la cama fija de 400 mm frente a los arcos.
0. Fase 16 (pendiente): prueba en navegador del arrastre en vivo (decoración que acompaña al mueble y movimiento vertical con límites); decidir si los planos XY/YZ de `TransformControls` se ocultan.
0. Fase 15 (pendiente): modelos .glb detallados con licencia para las furgonetas; verificar el color 3D de las muestras con vista interior. (Resuelto en Fase 16: re-apilar la decoración al mover el mueble de debajo.)
0. Fase 14 (pendiente): modelos .glb de furgoneta de alto detalle (el `van-l3h2.glb` actual es la principal carencia de realismo; los otros furgones solo tienen carrocería procedural). Comprobación de FPS en GPU real (40–55 FPS en 'high' con AMD 680M, medido por el agente de render). Resueltos en Fase 15: muestras PBR, apilado de decoración, Seleccionar/Mover y error boundary de WebGL.
1. Instalaciones: evitar que las rutas atraviesen muebles. Ahora pasan bajo ellos y se ven con la pasada fantasma. Añadir un regulador MPPT y un fusible o cuadro como módulos, y secciones de cable calculadas por corriente y caída de tensión.
2. Confirmar con la guía de carroceros del fabricante la posición del eje trasero (2695 mm desde el mamparo) (@CamperExpert).
2. Opcional: lazy-load del visor 3D (`React.lazy`) para mostrar la interfaz antes de descargar three.
3. Conseguir o modelar .glb para los módulos (nevera, cocina, cama) y rellenar `modelUrl`.
4. Verificar los datos del catálogo y de el furgón L3H2 (batalla, eje trasero, `wheelArchSpacingMM`).
5. Opcional: botón para mostrar/ocultar cotas y evitar el solape con la etiqueta del CoG.
6. Revestimiento interior mate en las paredes de la carrocería.
