# Flujos Funcionales y Lógica de Negocio Paso a Paso

Este documento detalla cómo debe comportarse la aplicación ante cada acción del usuario y qué fórmulas matemáticas deben ejecutarse por debajo.

---

## Flujo 1: Inicialización y Selección de Vehículo Base
1. **Inicio:** Al abrir la aplicación, se carga por defecto una furgoneta estándar (**furgón grande L3H2**: Largo interior de carga $3705\text{ mm}$, Ancho máximo $1870\text{ mm}$, Ancho entre pasos de rueda $1422\text{ mm}$, Alto interior $1932\text{ mm}$).
2. **Renderizado del Chasis (`VanShell`):**
   * Se dibuja el suelo de carga con textura o rejilla milimétrica.
   * Se dibujan los dos **pasos de rueda traseros** como volúmenes fijos bloqueados (no se pueden mover ni borrar, pero sí sirven para detectar colisiones o apoyar arcones encima).
   * Se dibujan las paredes laterales, el mamparo de cabina y las puertas traseras con un material semitransparente o con *Backface Culling* inteligente: **la pared que queda entre la cámara y el interior de la furgoneta se vuelve invisible automáticamente** para permitir ver y clicar dentro sin obstáculos.
3. **Cambio de Furgoneta:** Si el usuario cambia de modelo en el selector superior (ej. pasa de L3H2 a L2H2), el chasis actualiza sus dimensiones al instante y el sistema ejecuta el **Flujo 4 (Validación)** para avisar si algún mueble ha quedado fuera de los nuevos límites.

---

## Flujo 2: Inserción de Módulos desde el Catálogo
1. El usuario navega por el **Catálogo Izquierdo** (ej. pestaña *Mobiliario* $\rightarrow$ *Arcón Cama Lateral*).
2. Al hacer clic en el módulo:
   * El sistema crea una nueva instancia `CamperItem` con un `id` único (UUID).
   * **Posición inicial inteligente:** Se coloca en el centro libre del suelo de la furgoneta ($X = 0, Z = 0$) y con su base apoyada exactamente sobre el suelo ($Y = 0$), salvo los "Muebles Altos" o "Claraboyas", que se instalan automáticamente a la altura del techo ($Y = \text{AlturaFurgoneta} - \text{AlturaMueble}$).
   * El nuevo objeto queda seleccionado automáticamente y aparece el **Gizmo 3D** sobre él.
   * El estado global registra la acción en el historial de `Undo/Redo`.

---

## Flujo 3: Manipulación 3D, Snapping y Colisiones
1. **Selección:** Al hacer clic sobre cualquier mueble en el visor 3D:
   * Se ilumina su contorno (Outline blanco o azul cian).
   * El **Inspector Derecho** muestra sus propiedades (Nombre, Posición $X, Y, Z$, Rotación, Dimensiones en $\text{mm}$, Material, Peso y Precio).
2. **Arrastre con Snapping (Imantación):**
   * Mientras el usuario arrastra el objeto con las flechas del Gizmo, las coordenadas se redondean al paso de rejilla activo (por defecto, saltos de $10\text{ mm}$ o $50\text{ mm}$).
   * **Imantación a Paredes (Wall Snap):** Si la cara exterior de un mueble se acerca a menos de $30\text{ mm}$ del límite lateral de la furgoneta o de la cara de otro mueble, se pega exactamente a distancia $0\text{ mm}$.
3. **Detección de Colisiones en Tiempo Real (formas reales, sin cajas invisibles):**
   * Cada módulo es el conjunto de **piezas sólidas que se dibujan** (`src/utils/shapes/`): patas, largueros, somier, colchón y almohadas de la cama; tablero, columna y brazo de la mesa; costados, trasera, puerta y tapa del arcón; cuerpo, encimera y grifo de la cocina; etc. El prop 3D y la forma de colisión salen del **mismo layout** (`bedLayout`, `benchLayout`, `kitchenLayout`…), así que lo que choca es exactamente lo que se ve (desviación medida ≤ 10 mm por ítem; tiradores y LED incluidos como piezas o absorbidos en ellas).
   * Los huecos son huecos: el garaje bajo la cama, el interior del arcón, el espacio bajo la mesa o bajo el altillo no colisionan.
   * En cada movimiento se comparan **pieza contra pieza** (prefiltro por envolvente) con:
     * Los límites de la caja de carga (envolvente de las piezas).
     * Las cajas de los pasos de rueda (solo cuentan las piezas que los tocan de verdad).
     * Las piezas del resto de muebles instalados.
   * Si hay intersección (solape mayor a $2\text{ mm}$), se tiñen de rojo **las propias mallas visibles** del mueble (sin casco translúcido) y aparece el aviso en el Inspector. La selección se muestra con un brillo cian sobre esas mismas mallas. El clic selecciona por las mallas visibles: clicar el hueco de una cama no la selecciona.
   * `itemBox` (la caja de las dimensiones) solo se usa donde se quiere la envolvente: regla del 50 % de la muesca, minimapa del recorrido y las propias cotas.
4. **Adaptación al entorno (`fitAdaptation.ts`):** los muebles se ajustan en lugar de colisionar.
   * **Muesca en el paso de rueda:** camas, arcones, cocina y cajonera se recortan alrededor del arco si alguna de sus piezas lo toca, su superficie útil (somier, tapa, encimera) queda al menos $20\text{ mm}$ por encima del arco y la muesca no supera el $50\%$ de la huella en planta. Las piezas se parten alrededor de la muesca (la vista la recorta igual) y se añaden los tableros de cajeado como piezas sólidas. Si no, las piezas que tocan el arco son colisión.
   * **Equipos anidados:** batería, inversor, depósitos y kit de bomba dentro del hueco abierto de una cama o arcón (tolerancia $5\text{ mm}$) y sin tocar ninguna de sus piezas quedan alojados: no colisionan (no se tocan) y se mueven/giran con él en el mismo paso de deshacer. Si tocan una pata, un costado o el cajeado del arco, es colisión.
   * Cada módulo puede desactivarlo (`adaptToFit = false`): sin muesca y sin alojamiento (no arrastra equipos). Las colisiones siguen siendo las de su forma real.
5. **Apoyo de la decoración (`surfaceSnap.ts`):** la decoración se apoya en el suelo o en la cara superior de la pieza que hay bajo su centro (colchón, encimera, tablero de la mesa) donde quepa su altura. Entre los niveles libres se elige el más cercano a la Y pedida: al deslizarla se queda a su altura (bajo la mesa, en el suelo) y la flecha vertical del gizmo la sube al tablero. Al insertarla se usa el nivel libre más alto.

---

## Flujo 4: Redimensionado Paramétrico y Recálculo de Peso
1. Con un mueble paramétrico seleccionado (ej. un bloque de cocina), el usuario modifica el campo `Ancho` en el Inspector Derecho de $1000\text{ mm}$ a $1250\text{ mm}$.
2. **Efecto en 3D:** La geometría del módulo se actualiza al instante manteniendo su base pegada al suelo.
3. **Efecto en Ingeniería (Recálculo automático):**
   * Si es un mueble de madera, su peso se recalcula proporcionalmente a su área superficial multiplicada por el factor de densidad del material elegido en `materialsCatalog.ts` (ej. Contrachapado de Chopo ligero vs. Abeto estándar).
   * Su coste estimado también se ajusta según el volumen de material.

---

## Flujo 5: Telemetría Continua (Centro de Gravedad, MMA y Electricidad)
Cada vez que se añade, mueve, redimensiona o elimina un objeto, `physicsMath.ts` recalcula instantáneamente:

### 5.1. Masa Total y Margen Legal (MMA)
$$M_{\text{total}} = M_{\text{tara}} + \sum_{i=1}^{n} m_i$$
* Muestra una barra de progreso respecto a la MMA del vehículo (normalmente $3500\text{ kg}$). Si supera el $90\%$, pasa a ámbar; si supera el $100\%$, pasa a rojo crítico.

### 5.2. Centro de Gravedad ($CoG$)
Se calcula el centro de masas combinado de toda la camperización:
$$X_{\text{CoG}} = \frac{\sum (m_i \cdot x_i)}{\sum m_i}, \quad Z_{\text{CoG}} = \frac{\sum (m_i \cdot z_i)}{\sum m_i}, \quad Y_{\text{CoG}} = \frac{\sum (m_i \cdot y_i)}{\sum m_i}$$
* **Indicador de Equilibrio Transversal ($X_{\text{CoG}}$):** Muestra el porcentaje de peso a Izquierda (Conductor) vs. Derecha (Acompañante). El objetivo ideal es mantenerse dentro del rango $45\% - 55\%$. Si el usuario pone las baterías, el depósito de 100L de agua y la cocina en el mismo lado, la interfaz alerta de descompensación lateral y sugiere mover cargas pesadas al lado opuesto.

### 5.3. Balance Energético y de Aguas
* Suma la capacidad total de baterías instaladas ($\text{Ah}$ pasados a $\text{Wh}$ útiles), potencia solar total ($\text{W}$) y consumo diario estimado de los electrodomésticos añadidos, mostrando los **días de autonomía estimada sin sol**.
* Suma los litros totales de aguas limpias y grises.

---

## Flujo 6: Vistas de Cámara, Guardado y Exportación
1. **Conmutador de Vistas (Barra Superior):**
   * `3D Libre`: Cámara orbital suave alrededor de la furgoneta.
   * `Planta (Top 2D)`: Cámara ortográfica cenital mirando exactamente desde arriba con techo oculto (ideal para cuadrar pasillos y medir pasos libres).
   * `Alzado Lateral (Side 2D)`: Vista de perfil para comprobar alturas de camas y muebles altos.
2. **Exportación e Informes:**
   * **Guardar / Cargar JSON:** Descarga un archivo `.camper.json` con toda la escena para seguir trabajando otro día.
   * **Informe de Proyecto (Modal de Resumen / Impresión):** Genera una vista limpia con el listado completo de piezas (Bill of Materials - BOM), dimensiones de cada módulo, peso total, reparto por ejes y presupuesto desglosado.