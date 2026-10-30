# Arquitectura Técnica y Estándares de Desarrollo

> **NOTA PARA LA IA:** Este archivo es la ley técnica del proyecto. Debes consultarlo antes de crear cualquier archivo nuevo o instalar dependencias.

## 1. Stack Tecnológico Oficial
* **Framework Principal:** React 19 + TypeScript (Vite como empaquetador).
* **Motor 3D:** Three.js a través de `@react-three/fiber` (R3F) y `@react-three/drei`.
* **Física y Colisiones:** Límites matemáticos mediante `THREE.Box3` (AABB - Axis-Aligned Bounding Boxes) y Raycasting nativo para imantación a superficies.
* **Gestión de Estado Global:** `Zustand` + middleware `immer` (para mutaciones limpias de árboles de objetos) + `zundo` (para historial nativo de Deshacer/Rehacer `Ctrl+Z` / `Ctrl+Y`).
* **Estilos e Interfaz (UI):** Tailwind CSS + `shadcn/ui` (Radix UI) + `lucide-react` para iconografía técnica.
* **Persistencia Local:** `localStorage` / `IndexedDB` y exportación/importación de proyectos mediante archivos `.camper.json`.

---

## 2. Estructura de Directorios Estricta
Ningún archivo debe colocarse fuera de su módulo correspondiente:

```text
src/
├── assets/                 # Modelos 3D (.glb), texturas PBR y fuentes
├── components/
│   ├── canvas/             # Todo lo que vive dentro de <Canvas> (R3F)
│   │   ├── VanShell.tsx    # Chasis de la furgoneta y paredes inteligentes
│   │   ├── FurnitureItem.tsx # Renderizador individual de cada módulo
│   │   ├──GizmoControl.tsx # Controles de transformación (mover/rotar)
│   │   ├── GridSystem.tsx  # Rejilla métrica en milímetros/centímetros
│   │   └── CenterOfGravityMarker.tsx # Indicador visual 3D del centro de masas
│   ├── ui/                 # Componentes base de shadcn/ui (botones, inputs, sliders)
│   └── layout/             # Paneles de la aplicación
│       ├── TopToolbar.tsx  # Barra superior (Vistas, Guardar, Undo/Redo, Snap)
│       ├── LeftCatalog.tsx # Catálogo de módulos y buscador
│       ├── RightInspector.tsx # Propiedades del objeto seleccionado (Cotas, Material)
│       └── BottomTelemetry.tsx # Panel de pesos, centro de gravedad, electricidad y €
├── data/
│   ├── vansCatalog.ts      # Definiciones geométricas de furgonetas reales
│   ├── itemsCatalog.ts     # Catálogo maestro de muebles y componentes
│   └── materialsCatalog.ts # Maderas (Chopo, Abeto), laminados HPL y colores
├── hooks/                  # Lógica reutilizable (ej. useKeyboardShortcuts, useCollision)
├── store/
│   └── useProjectStore.ts  # Estado único de Zustand (Vehículo, Items, Selección, UI)
├── types/
│   └── camper.types.ts     # Interfaces TypeScript estrictas de todo el dominio
└── utils/
    ├── physicsMath.ts      # Cálculos de Centro de Gravedad, pesos y colisiones Box3
    └── unitConverters.ts   # Conversión milímetros <-> unidades de Three.js (metros)
```

---

## 3. Sistema de Coordenadas y Unidades
Para evitar errores de escala en Three.js, **1 unidad en Three.js equivale exactamente a 1 metro (1000 mm) en el mundo real**, pero la interfaz de usuario muestra siempre **milímetros (mm)** o **centímetros (cm)**.

* **Eje $X$ (Ancho / Transversal):** De izquierda ($-X$, lado conductor) a derecha ($+X$, lado acompañante/puerta corredera). El centro del suelo es $X = 0$.
* **Eje $Y$ (Alto / Vertical):** Del suelo de carga ($Y = 0$) hacia el techo ($+Y$). Ningún mueble interior puede tener $Y < 0$.
* **Eje $Z$ (Largo / Longitudinal):** Desde el mamparo separador de cabina ($Z = 0$ o $-Z/2$) hacia las puertas traseras ($+Z$).

---

## 4. Modelo de Datos Central (`camper.types.ts`)
Todo el estado de un diseño debe cumplir esta interfaz:

```typescript
export type CategoryType = 'structure' | 'kitchen' | 'bathroom' | 'electrical' | 'water' | 'openings';

export interface Vector3Tuple {
  x: number; // en metros
  y: number; // en metros
  z: number; // en metros
}

export interface DimensionsMM {
  width: number;  // Eje X en mm
  height: number; // Eje Y en mm
  depth: number;  // Eje Z en mm
}

export interface CamperItem {
  id: string;
  catalogId: string;
  name: string;
  category: CategoryType;
  position: Vector3Tuple;
  rotation: Vector3Tuple; // en radianes
  dimensions: DimensionsMM;
  parametric: boolean;    // ¿Permite cambiar ancho/alto/largo?
  weightKg: number;       // Peso base o calculado por volumen
  priceEur: number;
  materialId: string;
  electricalSpecs?: {
    batteryCapacityAh?: number;
    solarWatts?: number;
    dailyConsumptionWh?: number;
  };
  waterSpecs?: {
    cleanWaterLiters?: number;
    greyWaterLiters?: number;
  };
  locked: boolean;
  visible: boolean;
  hasCollision?: boolean;
}
```

---

## 5. Reglas Inquebrantables de Código (Code Guardrails)
1. **Límite de Tamaño de Archivo:** Ningún archivo `.ts` o `.tsx` puede superar las **250 líneas de código**. Si un componente crece más, debe dividirse en subcomponentes o extraer su lógica a un hook en `src/hooks/`.
2. **Cero `any`:** Está terminantemente prohibido usar el tipo `any` en TypeScript. Todo debe estar estrictamente tipado en `src/types/camper.types.ts`.
3. **Separación UI vs. 3D:** Los componentes dentro de `src/components/canvas/` nunca deben contener HTML directo (salvo mediante el componente `<Html>` de `@react-three/drei` para etiquetas de cotas).
4. **Rendimiento 3D:** No recrear geometrías ni materiales (`new THREE.BoxGeometry()`) dentro del bucle de renderizado (`useFrame`). Usar referencias (`useRef`) y memorización (`useMemo`).