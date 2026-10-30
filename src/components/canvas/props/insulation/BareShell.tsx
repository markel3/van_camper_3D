import { useEffect, useMemo } from 'react';
import { ExtrudeGeometry, Shape, type BufferGeometry, type Material } from 'three';
import type { VanLayout } from '../../../../utils/vanLayout';
import { arcLengths, MeshBuilder, pathBetweenHeights, thickSweep, type Vec2 } from './shellProfile';
import {
  BELT_RAIL_Y,
  BOW_DEPTH_M,
  HOLE_PITCH_M,
  PILLAR_DEPTH_M,
  RAIL_DEPTH_M,
  SHELL_FLOOR_Y_M,
  SLIDING_DOOR_Z_M,
  frameBays,
  shellLayout,
  type ShellLayout,
} from './shellLayout';
import { paintedSteel, perforatedSteel } from './interiorMaterials';
import { usePanelGroups } from './usePanelGroups';

// Bare painted-steel cargo shell (workflow phases 1-2, and any surface left as "bare metal"):
// inner skin following the body profile, ring frames (side pillars + roof bows) with oval lightening
// holes, belt rails, cant rails, the stamped inner frames of the sliding and rear doors, the ribbed
// cargo floor and the wheel-arch housings. Purely visual: nothing here takes part in collisions.

export interface ShellVisibility {
  walls: boolean;
  roof: boolean;
  floor: boolean;
}

interface BareShellProps {
  layout: VanLayout;
  arches: readonly { center: readonly number[]; size: readonly number[] }[];
  visible: ShellVisibility;
}

const DOOR_PANEL_INSET_M = 0.03;
// Stamped inner panels between the pillars, as fractions of the interior height
const BAY_PANELS_Y: readonly (readonly [number, number])[] = [
  [0.07, 0.46],
  [0.6, 0.86],
];
const BAY_PANEL_INSET_M = 0.022; // stamped inner door frames stand this far off the door skin
const DOOR_PANEL_HOLE_PITCH_M = 0.62;
const REAR_PANEL_DEPTH_M = 0.032;

interface Part {
  geometry: BufferGeometry;
  material: Material;
}

// Collects geometry per material key, then builds one mesh per material
class PartSet {
  private builders = new Map<string, { builder: MeshBuilder; material: () => Material }>();
  get(key: string, material: () => Material): MeshBuilder {
    let entry = this.builders.get(key);
    if (!entry) {
      entry = { builder: new MeshBuilder(), material };
      this.builders.set(key, entry);
    }
    return entry.builder;
  }
  build(): Part[] {
    return [...this.builders.values()]
      .filter(({ builder }) => !builder.empty)
      .map(({ builder, material }) => ({ geometry: builder.build(), material: material() }));
  }
}

const pathLength = (path: readonly Vec2[]): number => arcLengths(path).at(-1) ?? 0;

function buildWall(shell: ShellLayout, side: 'right' | 'left', cargoH: number): Part[] {
  const parts = new PartSet();
  // Both walls are built on the passenger side (+X); the driver wall is drawn mirrored
  const path = shell.right;
  const frame = parts.get('frame', () => paintedSteel('frame'));
  thickSweep(parts.get('skin', () => paintedSteel('skin')), path, 0, 0, 0, shell.cargoL, { front: true });

  // Pillars from just above the floor to the roof corner
  const pillarPath = pathBetweenHeights(path, 0.03, cargoH);
  for (const { z, width, right } of shell.frames) {
    if (side === 'right' && !right) continue;
    const z0 = z - width / 2;
    const z1 = Math.min(shell.cargoL, z + width / 2);
    thickSweep(frame, pillarPath, 0, PILLAR_DEPTH_M, z0, z1, { sides: true, ends: true });
    const flange = parts.get(`holes:${width}`, () => perforatedSteel('u', HOLE_PITCH_M, width));
    thickSweep(flange, pillarPath, 0, PILLAR_DEPTH_M, z0, z1, { front: true });
  }

  // Belt rail (behind the sliding door on the passenger side)
  const railPath = pathBetweenHeights(path, BELT_RAIL_Y[0] * cargoH, BELT_RAIL_Y[1] * cargoH);
  const railH = pathLength(railPath);
  const railZ0 = side === 'right' ? SLIDING_DOOR_Z_M[1] : 0;
  thickSweep(frame, railPath, 0, RAIL_DEPTH_M, railZ0, shell.cargoL, { sides: true, ends: true });
  thickSweep(parts.get('rail', () => perforatedSteel('v', HOLE_PITCH_M * 1.4, railH)), railPath, 0, RAIL_DEPTH_M, railZ0, shell.cargoL, {
    front: true,
  });

  // Stamped inner panels in every bay (lower and upper), each with one large opening
  for (const [z0, z1] of frameBays(shell, side, 0.012)) {
    if (side === 'right' && z0 < SLIDING_DOOR_Z_M[1] - 0.05) continue;
    for (const [y0, y1] of BAY_PANELS_Y) {
      const panelPath = pathBetweenHeights(path, y0 * cargoH, y1 * cargoH);
      const height = pathLength(panelPath);
      thickSweep(frame, panelPath, 0, BAY_PANEL_INSET_M, z0, z1, { sides: true, ends: true });
      const key = `bay:${height.toFixed(3)}:${(z1 - z0).toFixed(3)}`;
      thickSweep(parts.get(key, () => perforatedSteel('panel', height, z1 - z0)), panelPath, 0, BAY_PANEL_INSET_M, z0, z1, { front: true });
    }
  }

  if (side === 'right') {
    // Sliding door: stamped inner frame with large openings
    const doorPath = pathBetweenHeights(path, 0.12, cargoH * 0.86);
    const [dz0, dz1] = [SLIDING_DOOR_Z_M[0] + 0.08, SLIDING_DOOR_Z_M[1] - 0.06];
    thickSweep(frame, doorPath, 0, DOOR_PANEL_INSET_M, dz0, dz1, { sides: true, ends: true });
    const panel = parts.get('doorPanel', () => perforatedSteel('u', DOOR_PANEL_HOLE_PITCH_M, dz1 - dz0));
    thickSweep(panel, doorPath, 0, DOOR_PANEL_INSET_M, dz0, dz1, { front: true });
  }
  return parts.build();
}

function buildRoof(shell: ShellLayout): Part[] {
  const parts = new PartSet();
  const frame = parts.get('frame', () => paintedSteel('frame'));
  thickSweep(parts.get('skin', () => paintedSteel('skin')), shell.roof, 0, 0, 0, shell.cargoL, { front: true });
  for (const { z, width } of shell.frames) {
    const z0 = z - width / 2;
    const z1 = Math.min(shell.cargoL, z + width / 2);
    thickSweep(frame, shell.roof, 0, BOW_DEPTH_M, z0, z1, { sides: true, ends: true });
    thickSweep(parts.get(`holes:${width}`, () => perforatedSteel('u', HOLE_PITCH_M, width)), shell.roof, 0, BOW_DEPTH_M, z0, z1, {
      front: true,
    });
  }
  // Cant rails along both roof corners (solid box sections)
  const length = pathLength(shell.roof);
  for (const [s0, s1] of [
    [0, 0.09],
    [length - 0.09, length],
  ] as const) {
    const corner = arcSlice(shell.roof, s0, s1);
    thickSweep(frame, corner, 0, 0.022, 0, shell.cargoL);
  }
  return parts.build();
}

function arcSlice(path: readonly Vec2[], s0: number, s1: number): Vec2[] {
  const s = arcLengths(path);
  const out: Vec2[] = [];
  path.forEach((p, i) => {
    if (s[i]! >= s0 - 1e-6 && s[i]! <= s1 + 1e-6) out.push(p);
  });
  return out.length >= 2 ? out : [...path.slice(0, 2)];
}

function buildRear(layout: VanLayout): Part[] {
  const parts = new PartSet();
  const { cargoW, cargoH, cargoL } = layout;
  const inner = cargoW / 2;
  const skinZ = cargoL - 0.003;
  const panelZ = skinZ - REAR_PANEL_DEPTH_M;
  const n: [number, number, number] = [0, 0, -1];
  const skin = parts.get('skin', () => paintedSteel('skin'));
  const xs = inner + 0.04;
  const top = cargoH + 0.026;
  skin.quad([-xs, 0, skinZ], [xs, 0, skinZ], [xs, top, skinZ], [-xs, top, skinZ], [[0, 0], [2 * xs, 0], [2 * xs, top], [0, top]], n);
  const frame = parts.get('frame', () => paintedSteel('frame'));
  const y0 = 0.1;
  const y1 = cargoH - 0.12;
  for (const side of [-1, 1] as const) {
    const x0 = side * 0.03;
    const x1 = side * (inner - 0.06);
    const width = Math.abs(x1 - x0);
    const panel = parts.get(`rear:${width.toFixed(3)}`, () => perforatedSteel('v', (y1 - y0) / 2, width));
    const lo = Math.min(x0, x1);
    const hi = Math.max(x0, x1);
    panel.quad([lo, y0, panelZ], [hi, y0, panelZ], [hi, y1, panelZ], [lo, y1, panelZ], [[0, 0], [width, 0], [width, y1 - y0], [0, y1 - y0]], n);
    // Return flanges around the panel, back to the door skin
    const d = REAR_PANEL_DEPTH_M;
    const edges: [[number, number], [number, number], [number, number, number]][] = [
      [[lo, y0], [hi, y0], [0, -1, 0]],
      [[lo, y1], [hi, y1], [0, 1, 0]],
      [[lo, y0], [lo, y1], [-1, 0, 0]],
      [[hi, y0], [hi, y1], [1, 0, 0]],
    ];
    for (const [[ax, ay], [bx, by], normal] of edges) {
      const span = Math.hypot(bx - ax, by - ay);
      frame.quad([ax, ay, panelZ], [bx, by, panelZ], [bx, by, skinZ], [ax, ay, skinZ], [[0, 0], [span, 0], [span, d], [0, d]], [
        -normal[0],
        -normal[1],
        0,
      ]);
    }
  }
  return parts.build();
}

function buildFloor(layout: VanLayout): Part[] {
  const parts = new PartSet();
  const xs = layout.cargoW / 2 + 0.042;
  const y = SHELL_FLOOR_Y_M;
  const L = layout.cargoL;
  parts
    .get('floor', () => paintedSteel('floor'))
    .quad([-xs, y, 0], [xs, y, 0], [xs, y, L], [-xs, y, L], [[0, 0], [2 * xs, 0], [2 * xs, L], [0, L]], [0, 1, 0]);
  return parts.build();
}

// Pressed wheel-arch housing inside the collision box: rounded top, bevelled inner edge, reaching
// from the box's inner face out to the body skin
export function archHousingGeometry(length: number, height: number, depth: number, expand = 0): ExtrudeGeometry {
  const half = length / 2 + expand;
  const h = height + expand;
  const r = Math.min(0.17 + expand, h * 0.6);
  const shape = new Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(half, 0);
  shape.lineTo(half, h - r);
  shape.quadraticCurveTo(half, h, half - r, h);
  shape.lineTo(-half + r, h);
  shape.quadraticCurveTo(-half, h, -half, h - r);
  shape.closePath();
  const bevel = 0.018;
  const geometry = new ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - 2 * bevel),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 3,
    curveSegments: 10,
  });
  // Bevelled caps span [−bevel, depth − bevel]: shift to [0, depth]. Shape X → van Z, extrusion → van X.
  geometry.translate(0, 0, bevel);
  geometry.rotateY(Math.PI / 2);
  return geometry;
}

const usePartsDisposal = (parts: Part[]): void => {
  useEffect(() => () => parts.forEach(({ geometry }) => geometry.dispose()), [parts]);
};

function Parts({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map(({ geometry, material }, index) => (
        <mesh key={index} geometry={geometry} material={material} receiveShadow />
      ))}
    </>
  );
}

export function BareShell({ layout, arches, visible }: BareShellProps) {
  const { root, refs } = usePanelGroups(layout);
  const shell = useMemo(() => shellLayout(layout), [layout]);
  const right = useMemo(() => buildWall(shell, 'right', layout.cargoH), [shell, layout.cargoH]);
  const left = useMemo(() => buildWall(shell, 'left', layout.cargoH), [shell, layout.cargoH]);
  const roof = useMemo(() => buildRoof(shell), [shell]);
  const rear = useMemo(() => buildRear(layout), [layout]);
  const floor = useMemo(() => buildFloor(layout), [layout]);
  const inner = layout.cargoW / 2;
  const housings = useMemo(
    () =>
      arches.map(({ center, size }) => {
        const [sx = 0, sy = 0, sz = 0] = size;
        const [cx = 0, , cz = 0] = center;
        const innerFace = Math.abs(cx) - sx / 2;
        const depth = inner + 0.042 - innerFace;
        // Built on +X; the driver side is mirrored by its group
        return { geometry: archHousingGeometry(sz, sy, depth), position: [innerFace, 0, cz] as const, side: cx >= 0 ? 1 : -1 };
      }),
    [arches, inner],
  );
  usePartsDisposal(right);
  usePartsDisposal(left);
  usePartsDisposal(roof);
  usePartsDisposal(rear);
  usePartsDisposal(floor);
  useEffect(() => () => housings.forEach(({ geometry }) => geometry.dispose()), [housings]);

  // Panel groups open with the body (auto-hide writes their `visible`); the gating sits one level in
  return (
    <group ref={root}>
      <group ref={refs.right}>
        <group visible={visible.walls}>
          <Parts parts={right} />
        </group>
      </group>
      <group ref={refs.left}>
        <group visible={visible.walls} scale={[-1, 1, 1]}>
          <Parts parts={left} />
        </group>
      </group>
      <group ref={refs.rear}>
        <group visible={visible.walls}>
          <Parts parts={rear} />
        </group>
      </group>
      <group ref={refs.roof}>
        <group visible={visible.roof}>
          <Parts parts={roof} />
        </group>
      </group>
      <group visible={visible.floor}>
        <Parts parts={floor} />
      </group>
      <group visible={visible.walls}>
        {housings.map(({ geometry, position, side }, index) => (
          <group key={index} scale={[side, 1, 1]}>
            <mesh geometry={geometry} material={paintedSteel('frame')} position={position} receiveShadow castShadow />
          </group>
        ))}
      </group>
    </group>
  );
}
