import { useEffect, useMemo } from 'react';
import type { BufferGeometry, Material } from 'three';
import type { InsulationMaterialDef, InsulationMaterialId } from '../../../../types/camper.types';
import { INSULATION_MATERIALS } from '../../../../data/insulationCatalog';
import { createMetricBoxGeometry } from '../../../../utils/textures/metricBoxGeometry';
import type { VanLayout } from '../../../../utils/vanLayout';
import { arcLengths, MeshBuilder, pathBetweenHeights, subPath, thickSweep, type Vec2 } from './shellProfile';
import { BOW_DEPTH_M, PILLAR_DEPTH_M, SHELL_FLOOR_Y_M, frameBays, shellLayout, type ShellLayout } from './shellLayout';
import { archHousingGeometry, type ShellVisibility } from './BareShell';
import { battenMaterial, insulationMaterial } from './interiorMaterials';
import { usePanelGroups } from './usePanelGroups';

// Insulation layers of the bare shell (workflow phase 2), from interiorFinish.insulation: the first
// material lies on the steel skin, each next one on top of it. Sheets fill the bays between the
// frames of walls, roof and rear doors; aluminium tape covers the bay seams; a vapour barrier runs
// continuously over the frames; the floor gets a pine batten grid with the sheets laid between the
// battens, and the wheel-arch housings are wrapped. Thicknesses are real but squeezed to fit the
// frame depth when a stack is deeper. Visual only: nothing here takes part in collisions.

interface InsulationLayerProps {
  layout: VanLayout;
  arches: readonly { center: readonly number[]; size: readonly number[] }[];
  insulation: readonly InsulationMaterialId[];
  visible: ShellVisibility;
}

const MIN_SHEET_M = 0.0025; // thinnest layer drawn (foils, barriers)
const TAPE_W_M = 0.05;
const TAPE_T_M = 0.0006;
const BATTEN_W_M = 0.045;
const BATTEN_H_M = 0.02;
const BATTEN_SPACING_X_M = 0.42;
const BATTEN_SPACING_Z_M = 0.6;
const ROOF_EDGE_M = 0.09; // roof sheets stop at the cant rails
const WALL_STACK_M = 0.02; // wall sheets fit under the stamped inner panels (BareShell, 22 mm)

const SHEET_KINDS: ReadonlySet<InsulationMaterialDef['kind']> = new Set(['closedCellFoam', 'mineralWool', 'reflective', 'felt']);

interface Layer {
  def: InsulationMaterialDef;
  d0: number;
  d1: number;
}

// Inset ranges of the sheet layers (array order, from the skin), scaled to fit `maxDepth`
function stackLayers(defs: readonly InsulationMaterialDef[], maxDepth: number): Layer[] {
  const sheets = defs.filter((def) => SHEET_KINDS.has(def.kind));
  const raw = sheets.map((def) => Math.max(MIN_SHEET_M, def.thicknessMM / 1000));
  const total = raw.reduce((sum, t) => sum + t, 0);
  const k = total > maxDepth ? maxDepth / total : 1;
  let depth = 0;
  return sheets.map((def, i) => {
    const d0 = depth;
    depth += raw[i]! * k;
    return { def, d0, d1: depth };
  });
}

// Inset of the stack top after the layers listed before `index` (tape lies on what is beneath it)
function stackTopBefore(defs: readonly InsulationMaterialDef[], layers: readonly Layer[], index: number): number {
  let top = 0;
  for (const layer of layers) if (defs.indexOf(layer.def) < index) top = Math.max(top, layer.d1);
  return top;
}

interface Part {
  geometry: BufferGeometry;
  material: Material;
}

class Parts {
  private map = new Map<Material, MeshBuilder>();
  get(material: Material): MeshBuilder {
    let builder = this.map.get(material);
    if (!builder) {
      builder = new MeshBuilder();
      this.map.set(material, builder);
    }
    return builder;
  }
  build(): Part[] {
    return [...this.map.entries()].filter(([, b]) => !b.empty).map(([material, b]) => ({ material, geometry: b.build() }));
  }
}

function buildSurface(
  defs: readonly InsulationMaterialDef[],
  path: readonly Vec2[],
  bays: readonly [number, number][],
  frameDepth: number,
  maxStack: number, // sheets stay behind the stamped inner panels
  cargoL: number,
): Part[] {
  const parts = new Parts();
  const layers = stackLayers(defs, maxStack);
  for (const { def, d0, d1 } of layers) {
    const builder = parts.get(insulationMaterial(def));
    for (const [z0, z1] of bays) thickSweep(builder, path, d0, d1, z0, z1);
  }
  defs.forEach((def, index) => {
    if (def.kind === 'tape') {
      // Strips over the joints along both edges of every bay
      const top = stackTopBefore(defs, layers, index) + 0.0004;
      const builder = parts.get(insulationMaterial(def));
      for (const [z0, z1] of bays) {
        for (const z of [z0 + TAPE_W_M / 2 - 0.01, z1 - TAPE_W_M / 2 + 0.01]) {
          thickSweep(builder, path, top, top + TAPE_T_M, z - TAPE_W_M / 2, z + TAPE_W_M / 2, { front: true, sides: true });
        }
      }
    } else if (def.kind === 'barrier') {
      // Continuous film stapled over the frames
      const inset = frameDepth + 0.0015 + 0.001 * defs.slice(0, index).filter((d) => d.kind === 'barrier').length;
      thickSweep(parts.get(insulationMaterial(def)), path, inset, inset, 0, cargoL, { front: true });
    }
  });
  return parts.build();
}

// Z intervals of [0, L] left free by the wheel arches at lateral position x (±half width)
function freeSpans(x: number, half: number, L: number, arches: InsulationLayerProps['arches']): [number, number][] {
  let spans: [number, number][] = [[0, L]];
  for (const { center, size } of arches) {
    const [cx = 0, , cz = 0] = center;
    const [sx = 0, , sz = 0] = size;
    if (Math.abs(x - cx) >= half + sx / 2) continue;
    const a = cz - sz / 2 - 0.01;
    const b = cz + sz / 2 + 0.01;
    spans = spans.flatMap(([s0, s1]): [number, number][] =>
      b <= s0 || a >= s1 ? [[s0, s1]] : ([[s0, a], [b, s1]] as [number, number][]).filter(([p, q]) => q - p > 0.03),
    );
  }
  return spans;
}

interface FloorPart {
  geometry: BufferGeometry;
  material: Material;
  position: [number, number, number];
}

function buildFloor(layout: VanLayout, defs: readonly InsulationMaterialDef[], arches: InsulationLayerProps['arches']): FloorPart[] {
  const out: FloorPart[] = [];
  const inner = layout.cargoW / 2;
  const L = layout.cargoL;
  const y0 = SHELL_FLOOR_Y_M;
  const count = Math.max(2, Math.round((layout.cargoW - BATTEN_W_M) / BATTEN_SPACING_X_M) + 1);
  const xs = Array.from({ length: count }, (_, i) => -inner + BATTEN_W_M / 2 + 0.01 + (i * (layout.cargoW - BATTEN_W_M - 0.02)) / (count - 1));
  const batten = battenMaterial();
  const box = (w: number, h: number, d: number, material: Material, x: number, y: number, z: number) =>
    out.push({ geometry: createMetricBoxGeometry(w, h, d), material, position: [x, y, z] });
  for (const x of xs) {
    for (const [z0, z1] of freeSpans(x, BATTEN_W_M / 2, L, arches)) box(BATTEN_W_M, BATTEN_H_M, z1 - z0, batten, x, y0 + BATTEN_H_M / 2, (z0 + z1) / 2);
  }
  // Cross battens between the longitudinal ones
  const rows = Math.max(1, Math.floor(L / BATTEN_SPACING_Z_M));
  for (let r = 1; r < rows; r++) {
    const z = (r * L) / rows;
    for (let i = 1; i < xs.length; i++) {
      const a = xs[i - 1]! + BATTEN_W_M / 2;
      const b = xs[i]! - BATTEN_W_M / 2;
      const mid = (a + b) / 2;
      const blocked = freeSpans(mid, (b - a) / 2, L, arches).every(([s0, s1]) => z < s0 || z > s1);
      if (!blocked) box(b - a, BATTEN_H_M, BATTEN_W_M, batten, mid, y0 + BATTEN_H_M / 2, z);
    }
  }
  // Sheets between the longitudinal battens
  const layers = stackLayers(defs, BATTEN_H_M - 0.003);
  for (const { def, d0, d1 } of layers) {
    const material = insulationMaterial(def);
    for (let i = 1; i < xs.length; i++) {
      const a = xs[i - 1]! + BATTEN_W_M / 2 + 0.002;
      const b = xs[i]! - BATTEN_W_M / 2 - 0.002;
      const mid = (a + b) / 2;
      for (const [z0, z1] of freeSpans(mid, (b - a) / 2, L, arches)) box(b - a, d1 - d0, z1 - z0, material, mid, y0 + (d0 + d1) / 2, (z0 + z1) / 2);
    }
  }
  return out;
}

function buildRear(layout: VanLayout, defs: readonly InsulationMaterialDef[]): FloorPart[] {
  const out: FloorPart[] = [];
  const inner = layout.cargoW / 2;
  const skinZ = layout.cargoL - 0.003;
  const y0 = 0.1;
  const y1 = layout.cargoH - 0.12;
  for (const { def, d0, d1 } of stackLayers(defs, 0.028)) {
    for (const side of [-1, 1]) {
      const w = inner - 0.1;
      out.push({
        geometry: createMetricBoxGeometry(w, y1 - y0, d1 - d0),
        material: insulationMaterial(def),
        position: [side * (0.05 + w / 2), (y0 + y1) / 2, skinZ - (d0 + d1) / 2],
      });
    }
  }
  return out;
}

export function InsulationLayer({ layout, arches, insulation, visible }: InsulationLayerProps) {
  const { root, refs } = usePanelGroups(layout);
  const defs = useMemo(
    () => insulation.map((id) => INSULATION_MATERIALS.find((def) => def.id === id)).filter((def): def is InsulationMaterialDef => Boolean(def)),
    [insulation],
  );
  const shell: ShellLayout = useMemo(() => shellLayout(layout), [layout]);
  const built = useMemo(() => {
    const { cargoH, cargoL } = layout;
    const wall = (side: 'right' | 'left') => {
      // Built on the passenger side (+X); the driver wall is drawn mirrored
      return buildSurface(defs, pathBetweenHeights(shell.right, 0.03, cargoH), frameBays(shell, side), PILLAR_DEPTH_M, WALL_STACK_M, cargoL);
    };
    const roofLength = arcLengths(shell.roof).at(-1) ?? 0;
    const roofPath = subPath(shell.roof, ROOF_EDGE_M, roofLength - ROOF_EDGE_M);
    const sheets = defs.filter((def) => SHEET_KINDS.has(def.kind));
    const outer = sheets.at(-1);
    const total = stackLayers(defs, WALL_STACK_M).at(-1)?.d1 ?? 0;
    const inner = layout.cargoW / 2;
    const archCovers = outer
      ? arches.map(({ center, size }) => {
          const [sx = 0, sy = 0, sz = 0] = size;
          const [cx = 0, , cz = 0] = center;
          const t = Math.max(0.004, Math.min(0.012, total));
          const innerFace = Math.abs(cx) - sx / 2 - t;
          const geometry = archHousingGeometry(sz, sy, inner + 0.03 - innerFace, t);
          // Built on +X; the driver side is mirrored by its group
          return { geometry, material: insulationMaterial(outer), position: [innerFace, SHELL_FLOOR_Y_M, cz] as [number, number, number], side: cx >= 0 ? 1 : -1 };
        })
      : [];
    return {
      right: wall('right'),
      left: wall('left'),
      roof: buildSurface(defs, roofPath, frameBays(shell, 'roof'), BOW_DEPTH_M, BOW_DEPTH_M - 0.004, cargoL),
      rear: buildRear(layout, defs),
      floor: sheets.length || defs.length ? buildFloor(layout, defs, arches) : [],
      archCovers,
    };
  }, [defs, shell, layout, arches]);
  useEffect(
    () => () => {
      for (const list of [built.right, built.left, built.roof, built.rear, built.floor, built.archCovers]) {
        list.forEach(({ geometry }) => geometry.dispose());
      }
    },
    [built],
  );

  if (defs.length === 0) return null;
  const meshes = (parts: readonly (Part & { position?: [number, number, number] })[]) =>
    parts.map(({ geometry, material, position }, index) => (
      <mesh key={index} geometry={geometry} material={material} position={position} receiveShadow />
    ));
  return (
    <group ref={root}>
      <group ref={refs.right}>
        <group visible={visible.walls}>{meshes(built.right)}</group>
      </group>
      <group ref={refs.left}>
        <group visible={visible.walls} scale={[-1, 1, 1]}>
          {meshes(built.left)}
        </group>
      </group>
      <group ref={refs.rear}>
        <group visible={visible.walls}>{meshes(built.rear)}</group>
      </group>
      <group ref={refs.roof}>
        <group visible={visible.roof}>{meshes(built.roof)}</group>
      </group>
      <group visible={visible.floor}>{meshes(built.floor)}</group>
      <group visible={visible.walls}>
        {built.archCovers.map(({ geometry, material, position, side }, index) => (
          <group key={index} scale={[side, 1, 1]}>
            <mesh geometry={geometry} material={material} position={position} receiveShadow />
          </group>
        ))}
      </group>
    </group>
  );
}
