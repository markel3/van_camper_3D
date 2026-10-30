# CamperStudio 3D - Documento Maestro de Visión y Producto

## 1. Propósito del Producto

**CamperStudio 3D** es una aplicación profesional de diseño asistido por ordenador (CAD ligero y paramétrico) especializada en la camperización de vehículos industriales y furgonetas. Su objetivo es permitir tanto a talleres profesionales de homologación como a usuarios particulares diseñar distribuciones interiores, validar instalaciones (eléctrica, agua, gas), calcular pesos y repartos de cargas en tiempo real, y generar presupuestos y listas de corte automáticamente.

## 2. Propuesta de Valor Diferencial

A diferencia de programas genéricos como SketchUp (demasiado complejos y sin datos de ingeniería camper) o herramientas básicas 2D:

* **Paramétrico e Inteligente:** Los muebles se adaptan a la curvatura real de la chapa de la furgoneta seleccionada.

* **Ingeniería en Tiempo Real:** Cálculo continuo de Masa Máxima Autorizada (MMA), Centro de Gravedad ($CoG$), balance energético (Ah/Wh) y autonomía de aguas.

* **Acabado Visual hiperrealista y fluido:** Renderizado PBR (Physically Based Rendering) en el navegador a 60 FPS con sombras suaves y oclusión ambiental.

## 3. Pilares Funcionales de la Aplicación

### 3.1. Selector de Chasis Base (Base Vans)

El usuario comienza eligiendo la furgoneta exacta con sus cotas interiores reales, pasos de rueda, vigas estructurales y curvatura de paredes:

* Furgón grande de plataforma común (L2H2, L3H2, L4H3).

* Furgón medio de tracción trasera (L2H2, L3H2).

* Furgón L3H2 de techo alto.

* Modo "Caja Libre" (personalizable en largo, ancho, alto y posición de pasos de rueda).

### 3.2. Catálogo Modular e Inteligente

Organizado por categorías técnicas:

1. **Estructuras y Mobiliario:** Camas (fijas, elevables, peine), muebles altos, bloques de cocina, arcones, comedores y baños/duchas.

2. **Electrodomésticos y Equipamiento:** Neveras (compresor 12V), fregaderos, cocinas (gas/inducción), calentadores (boilers), calefacción estacionaria.

3. **Aberturas y Exterior:** Claraboyas (40x40, 70x50), ventanas laterales proyectables/correderas, placas solares, toldos.

4. **Sistemas Ocultos (Ingeniería):** Baterías LiFePO4, inversores, reguladores MPPT, depósitos de aguas limpias y grises (bajos o interiores), bombas de presión.

### 3.3. Motor de Posicionamiento y Colisiones

* **Snapping Magnético:** Los objetos se imantan automáticamente al suelo, techo, paredes laterales o caras de otros muebles adyacentes.

* **Detección de Colisiones:** Aviso visual en rojo si un mueble atraviesa un paso de rueda, una viga estructural o se solapa con otro módulo.

* **Edición Paramétrica:** Al seleccionar cualquier módulo, el usuario puede cambiar su `Ancho`, `Alto` y `Profundidad` en milímetros sin deformar las texturas ni los herrajes.

### 3.4. Telemetría e Ingeniería (Panel Inferior)

* **Control de Peso y MMA:** Peso tara del vehículo + peso acumulado del equipamiento vs. límite legal (3.500 kg).

* **Centro de Gravedad (**$CoG$**):** Visualización en planta del equilibrio longitudinal (eje delantero vs. trasero) y transversal (izquierda vs. derecha) para evitar desequilibrios peligrosos o rechazos en ITV.

* **Presupuesto Dinámico:** Suma automática del coste de materiales y componentes seleccionados.

### 3.5. Modos de Visualización

* **Vista 3D Perspectiva (Órbita):** Para diseño general con paredes exteriores ocultables automáticamente según el ángulo de cámara.

* **Vista Primera Persona (Walkthrough):** Cámara a la altura de los ojos para sentir la amplitud real del pasillo y la altura libre al techo.

* **Vista 2D Planta / Alzado (Plano Técnico):** Vista ortográfica acotada lista para exportar en PDF o imagen para el taller o ingeniero de homologación.

## 4. Estética y Experiencia de Usuario (UI/UX)

* **Inspiración Visual:** Blender 4.x, Figma, Spline y Shapr3D.

* **Tema:** Modo oscuro profesional (`Slate-950` / `Zinc-900`) para no fatigar la vista y hacer que el modelo 3D iluminado sea el protagonista absoluto.

* **Tipografía:** `Inter` para interfaz general y `JetBrains Mono` para todas las cotas numéricas, coordenadas ($X, Y, Z$), pesos y precios.