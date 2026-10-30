import { useEffect, useMemo } from 'react';
import { Color, MeshStandardMaterial, Vector3, type Material } from 'three';
import type { VanInteriorFinish } from '../../../types/camper.types';
import { useProjectStore } from '../../../store/useProjectStore';
import { useViewStore } from '../../../store/useViewStore';
import { wheelArchBoxes } from '../../../utils/collisionMath';
import type { VanLayout } from '../../../utils/vanLayout';
import { createMetricBoxGeometry } from '../../../utils/textures/metricBoxGeometry';
import { PANEL_PITCH_M, createTiledPlaneGeometry, getPanelSeamMask, type LiningSetKey } from '../../../utils/textures/liningTextures';
import { useLightingMood } from '../render/lightingMood';
import { BareShell, type ShellVisibility } from './insulation/BareShell';
import { InsulationLayer } from './insulation/InsulationLayer';
import { createBoardPanelGeometry, createSlatsGeometry } from './insulation/boardGeometry';
import { interiorMaterial, useInteriorClipping, woodMaterial } from './insulation/interiorMaterials';
import { usePanelGroups } from './insulation/usePanelGroups';

// Interior surfaces of the cargo box, in three layers that follow the workflow (useViewStore.layers):
// - Bare shell (BareShell): painted steel skin, frames, ribbed floor, wheel-arch housings. Shown on
//   every surface the lining does not cover (phases 1-2, or a finish left as bare metal).
// - Insulation (InsulationLayer, layer "insulation"): interiorFinish.insulation laid on that shell.
// - Lining (layer "structure"): a continuous wooden shell made of the oak/pine plank floor, both
//   side walls of tongue-and-groove boards with real V-grooves and inclined wall-to-ceiling
//   chamfers, the slatted oak ceiling with two warm LED strips, the bulkhead with its pass-through
//   and grey trim frame, and the inside of the rear doors. The wheel arches are boxed in the wall
//   wood by VanShellProp (liningArchMaterial).
//
// The lining is purely visual and outside the usable box wherever furniture can touch it: the floor
// is 2 mm proud of Y = 0, walls and doors stand 2 mm inside their faces, and the ceiling slats hang
// flush with the official interior height (their cavity is inside the roof thickness). Only the
// small chamfers cut into the top corners, as in real campers.
//
// Openings: each panel group follows the body's camera rules (usePanelGroups), and every interior
// material carries the shared section planes on the .glb body (useInteriorClipping).

const CHAMFER_M = 0.09; // legs of the 45° wall-to-ceiling chamfer
const WALL_T_M = 0.012;
const INSET_M = 0.002; // lining faces just inside the cargo box: no z-fight with the body
const GROOVE_M = 0.003; // V-groove depth (and half width) between boards
const FLOOR_T_M = 0.004;
const SLAT_T_M = 0.012;
const SLAT_W_M = 0.07;
const SLAT_GAP_M = 0.022;
const LED_W_M = 0.026;
const LED_X_FACTOR = 0.42;
const PASS_TOP_M = 1.45; // bulkhead pass-through height
const PILLAR_W_M = 0.26; // bulkhead side panels
const TRIM_W_M = 0.045; // pass-through frame
const TRIM_D_M = 0.02;
const LIGHT_Z_FACTORS = [0.18, 0.5, 0.82] as const;
const LED_COLOR = '#ffb46b'; // ≈ 3000 K
const LED_LIGHT_CD = 1.4; // per fill light at full LED intensity (day mood)

type WoodWall = Exclude<VanInteriorFinish['walls'], 'bare' | 'offWhite'>;
const WALL_WOOD: Record<WoodWall, { set: LiningSetKey; boardH: number; brightness: number }> = {
  warmWood: { set: 'pine', boardH: 0.095, brightness: 1.3 },
  lightWood: { set: 'oak', boardH: 0.12, brightness: 1.05 },
};
const FLOOR_SETS: Record<Exclude<VanInteriorFinish['floor'], 'bare'>, LiningSetKey> = { oak: 'oakFloor', pine: 'pineFloor' };

const flatMaterial = (key: string, color: string, roughness: number, metalness = 0) =>
  interiorMaterial(`flat:${key}`, () => new MeshStandardMaterial({ color, roughness, metalness }));
const seamMaterial = () =>
  interiorMaterial('seams:offWhite', () => new MeshStandardMaterial({ color: '#8a7f70', alphaMap: getPanelSeamMask(), transparent: true, depthWrite: false, roughness: 1 }));
// Powder-coated grey metal trim (pass-through frame, door split), as around camper windows
const trimMaterial = () => flatMaterial('trim', '#7d8287', 0.42, 0.55);

const isWoodWall = (walls: VanInteriorFinish['walls']): walls is WoodWall => walls === 'warmWood' || walls === 'lightWood';
const wallSurface = (walls: VanInteriorFinish['walls'], grainAlong: 'u' | 'v', vertexColors = false): Material =>
  isWoodWall(walls)
    ? woodMaterial(WALL_WOOD[walls].set, grainAlong, { brightness: WALL_WOOD[walls].brightness, vertexColors })
    : flatMaterial('offWhite', '#eee7db', 0.9);

// Material of the wheel-arch boxes drawn by VanShellProp. One shared instance, restyled by the lining
// (wall wood) and hidden while the bare shell shows its own pressed-steel housings.
const archMaterial = () => interiorMaterial('arch', () => new MeshStandardMaterial({ color: '#ffffff', roughness: 1 }));
export function liningArchMaterial(_finish: VanInteriorFinish): Material {
  return archMaterial();
}
function styleArch(walls: VanInteriorFinish['walls'], lined: boolean): void {
  const target = archMaterial();
  target.visible = lined;
  if (!lined) return;
  const source = wallSurface(walls, 'u') as MeshStandardMaterial;
  target.color.copy(source.color);
  target.map = source.map;
  target.normalMap = source.normalMap;
  target.roughnessMap = source.roughnessMap;
  target.roughness = source.roughness;
  target.needsUpdate = true;
}

interface InteriorLiningPropProps {
  layout: VanLayout;
  finish: VanInteriorFinish;
  // The body is the .glb with its section cut: the interior surfaces are cut by the same planes
  clipped: boolean;
}

export function InteriorLiningProp({ layout, finish, clipped }: InteriorLiningPropProps) {
  const structure = useViewStore((state) => state.layers.structure);
  const insulationLayer = useViewStore((state) => state.layers.insulation);
  const van = useProjectStore((state) => state.van);
  const arches = useMemo(
    () => wheelArchBoxes(van).map((box) => ({ center: box.getCenter(new Vector3()).toArray(), size: box.getSize(new Vector3()).toArray() })),
    [van],
  );
  const lined = {
    walls: structure && finish.walls !== 'bare',
    ceiling: structure && finish.ceiling === 'woodSlats',
    floor: structure && finish.floor !== 'bare',
  };
  const shell: ShellVisibility = { walls: !lined.walls, roof: !lined.ceiling, floor: !lined.floor };
  const shellKey = `${shell.walls}${shell.roof}${shell.floor}`;
  const shellVisible = useMemo(() => shell, [shellKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useInteriorClipping(clipped);
  useEffect(() => styleArch(finish.walls, lined.walls), [finish.walls, lined.walls]);

  return (
    <group>
      <BareShell layout={layout} arches={arches} visible={shellVisible} />
      {insulationLayer && <InsulationLayer layout={layout} arches={arches} insulation={finish.insulation} visible={shellVisible} />}
      {structure && <LiningPanels layout={layout} finish={finish} />}
    </group>
  );
}

function LiningPanels({ layout, finish }: { layout: VanLayout; finish: VanInteriorFinish }) {
  const { cargoW, cargoH, cargoL } = layout;
  const inner = cargoW / 2;
  const slats = finish.ceiling === 'woodSlats';
  const walls = finish.walls !== 'bare';
  const wood = isWoodWall(finish.walls) ? WALL_WOOD[finish.walls] : null;
  const ledXs = useMemo(() => [-inner * LED_X_FACTOR, inner * LED_X_FACTOR], [inner]);
  const mood = useLightingMood();

  // Slat centres between the chamfers; the LED strips take the place of the slats they fall on
  const slatXs = useMemo(() => {
    const pitch = SLAT_W_M + SLAT_GAP_M;
    const span = cargoW - 2 * CHAMFER_M;
    const count = Math.floor((span - SLAT_GAP_M) / pitch);
    const start = -((count - 1) * pitch) / 2;
    return Array.from({ length: count }, (_, i) => start + i * pitch).filter((x) =>
      ledXs.every((led) => Math.abs(x - led) > (SLAT_W_M + LED_W_M) / 2),
    );
  }, [cargoW, ledXs]);

  const wallH = cargoH - CHAMFER_M;
  const chamferW = CHAMFER_M * Math.SQRT2;
  const pillarH = Math.min(PASS_TOP_M, cargoH - 0.2);
  const headerH = cargoH - pillarH;
  const boardH = wood?.boardH ?? 0;

  const g = useMemo(() => {
    const boards = (length: number, height: number, seed: number) =>
      boardH > 0 ? createBoardPanelGeometry(length, height, boardH, GROOVE_M, seed) : null;
    return {
      floor: createMetricBoxGeometry(cargoW, FLOOR_T_M, cargoL),
      wall: createMetricBoxGeometry(WALL_T_M, wallH, cargoL),
      wallBoards: boards(cargoL, wallH, 1),
      wallSeams: createTiledPlaneGeometry(cargoL, wallH, PANEL_PITCH_M, 1),
      chamfer: createMetricBoxGeometry(chamferW, WALL_T_M, cargoL),
      backing: createMetricBoxGeometry(cargoW - 2 * CHAMFER_M + 0.02, 0.004, cargoL),
      slats: createSlatsGeometry(slatXs, SLAT_W_M, SLAT_T_M, cargoL - 0.01),
      ledChannel: createMetricBoxGeometry(LED_W_M + 0.01, 0.009, cargoL - 0.12),
      ledDiffuser: createMetricBoxGeometry(LED_W_M - 0.004, 0.002, cargoL - 0.14),
      pillar: createMetricBoxGeometry(PILLAR_W_M, pillarH, WALL_T_M),
      pillarBoards: boards(PILLAR_W_M, pillarH, 3),
      pillarSeams: createTiledPlaneGeometry(PILLAR_W_M, pillarH, PANEL_PITCH_M, 1),
      header: createMetricBoxGeometry(cargoW, headerH, WALL_T_M),
      headerBoards: boards(cargoW, headerH, 4),
      trimSide: createMetricBoxGeometry(TRIM_W_M, pillarH, TRIM_D_M),
      trimTop: createMetricBoxGeometry(cargoW - 2 * PILLAR_W_M + 2 * TRIM_W_M, TRIM_W_M, TRIM_D_M),
      doors: createMetricBoxGeometry(cargoW, cargoH, WALL_T_M),
      doorsBoards: boards(cargoW, cargoH, 5),
      doorsSeams: createTiledPlaneGeometry(cargoW, cargoH, PANEL_PITCH_M, 1),
      doorSplit: createMetricBoxGeometry(0.008, cargoH, 0.004),
    };
  }, [cargoW, cargoL, cargoH, wallH, chamferW, pillarH, headerH, boardH, slatXs]);
  useEffect(() => () => Object.values(g).forEach((geometry) => geometry?.dispose()), [g]);

  const { root, refs } = usePanelGroups(layout);

  // Board fronts carry the grain along U; boxes behind them (edges, section cuts) along Z or X
  const boardMaterial = walls ? wallSurface(finish.walls, 'u', true) : null;
  const wallBox = walls ? wallSurface(finish.walls, 'u') : null;
  const chamferMaterial = walls ? wallSurface(finish.walls, 'v') : null;
  const seams = walls && !wood ? seamMaterial() : null;
  const backOff = wood ? GROOVE_M + 0.0005 : 0; // box faces sit behind the bottom of the grooves

  const ledOn = finish.ledStrips;
  const diffuser = interiorMaterial('led:diffuser', () => new MeshStandardMaterial({ color: '#fff4e6', roughness: 0.35, emissive: new Color(LED_COLOR) }));
  useEffect(() => {
    diffuser.emissiveIntensity = ledOn ? mood.ledEmissiveIntensity : 0;
  }, [diffuser, ledOn, mood.ledEmissiveIntensity]);
  const channel = flatMaterial('ledChannel', '#b9bdc1', 0.35, 0.9);
  const ledY = slats ? cargoH + 0.0045 : cargoH - 0.0045;

  // A board panel on a wall plane: `rotationY` turns its +Z front to face the cabin
  const boardsOn = (geometry: typeof g.wallBoards, position: [number, number, number], rotationY: number) =>
    geometry && boardMaterial ? <mesh geometry={geometry} material={boardMaterial} position={position} rotation={[0, rotationY, 0]} receiveShadow /> : null;

  const sideWall = (side: 1 | -1) => (
    // Built on +X and mirrored for the driver side
    <group key={side} ref={side === 1 ? refs.right : refs.left} scale={[side, 1, 1]}>
      <mesh geometry={g.wall} material={wallBox!} position={[inner - INSET_M + backOff + WALL_T_M / 2, wallH / 2, cargoL / 2]} receiveShadow />
      {boardsOn(g.wallBoards, [inner - INSET_M, 0, cargoL / 2], -Math.PI / 2)}
      {seams && <mesh geometry={g.wallSeams} material={seams} position={[inner - INSET_M - 0.0005, wallH / 2, cargoL / 2]} rotation={[0, -Math.PI / 2, 0]} />}
      {/* 45° chamfer from the wall top to the ceiling plane; its outer face sits in the corner */}
      <mesh
        geometry={g.chamfer}
        material={chamferMaterial!}
        position={[inner - CHAMFER_M / 2 + WALL_T_M / (2 * Math.SQRT2), cargoH - CHAMFER_M / 2 + WALL_T_M / (2 * Math.SQRT2), cargoL / 2]}
        rotation={[0, 0, (3 * Math.PI) / 4]}
        receiveShadow
      />
    </group>
  );

  return (
    <group ref={root}>
      {finish.floor !== 'bare' && (
        <mesh geometry={g.floor} material={woodMaterial(FLOOR_SETS[finish.floor], 'v', { roughness: 0.9 })} position={[0, FLOOR_T_M / 2 - 0.002, cargoL / 2]} receiveShadow />
      )}

      {walls && (
        <>
          {sideWall(1)}
          {sideWall(-1)}

          {/* Bulkhead: side panels, upper header and a grey frame around the cab pass-through */}
          <group ref={refs.cab}>
            {([-1, 1] as const).map((side) => (
              <group key={side}>
                <mesh geometry={g.pillar} material={wallBox!} position={[side * (inner - PILLAR_W_M / 2), pillarH / 2, INSET_M - backOff - WALL_T_M / 2]} receiveShadow />
                {boardsOn(g.pillarBoards, [side * (inner - PILLAR_W_M / 2), 0, INSET_M], 0)}
                {seams && <mesh geometry={g.pillarSeams} material={seams} position={[side * (inner - PILLAR_W_M / 2), pillarH / 2, INSET_M + 0.0005]} />}
                <mesh geometry={g.trimSide} material={trimMaterial()} position={[side * (inner - PILLAR_W_M + TRIM_W_M / 2), pillarH / 2, INSET_M + TRIM_D_M / 2]} castShadow />
              </group>
            ))}
            <mesh geometry={g.header} material={wallBox!} position={[0, pillarH + headerH / 2, INSET_M - backOff - WALL_T_M / 2]} receiveShadow />
            {boardsOn(g.headerBoards, [0, pillarH, INSET_M], 0)}
            <mesh geometry={g.trimTop} material={trimMaterial()} position={[0, pillarH + TRIM_W_M / 2, INSET_M + TRIM_D_M / 2]} castShadow />
          </group>

          {/* Inside of the rear doors, with the split between the two leaves */}
          <group ref={refs.rear}>
            <mesh geometry={g.doors} material={wallBox!} position={[0, cargoH / 2, cargoL - INSET_M + backOff + WALL_T_M / 2]} receiveShadow />
            {boardsOn(g.doorsBoards, [0, 0, cargoL - INSET_M], Math.PI)}
            {seams && <mesh geometry={g.doorsSeams} material={seams} position={[0, cargoH / 2, cargoL - INSET_M - 0.0005]} rotation={[0, Math.PI, 0]} />}
            <mesh geometry={g.doorSplit} material={trimMaterial()} position={[0, cargoH / 2, cargoL - INSET_M - 0.002]} />
          </group>
        </>
      )}

      <group ref={refs.roof}>
        {slats && (
          <>
            <mesh geometry={g.backing} material={flatMaterial('slatBacking', '#1d1712', 0.95)} position={[0, cargoH + SLAT_T_M + 0.002, cargoL / 2]} />
            <mesh geometry={g.slats} material={woodMaterial('oak', 'v', { brightness: 1.05, vertexColors: true })} position={[0, cargoH + SLAT_T_M / 2, cargoL / 2]} receiveShadow />
          </>
        )}
        {(slats || ledOn) &&
          ledXs.map((x) => (
            <group key={x}>
              <mesh geometry={g.ledChannel} material={channel} position={[x, ledY + 0.0035, cargoL / 2]} />
              <mesh geometry={g.ledDiffuser} material={diffuser} position={[x, ledY - 0.0015, cargoL / 2]} />
            </group>
          ))}
      </group>
      {/* Warm fill from the strips; outside the ceiling group so it stays on when the roof is cut */}
      {ledOn &&
        LIGHT_Z_FACTORS.map((f) => (
          <pointLight key={f} color={LED_COLOR} intensity={LED_LIGHT_CD * mood.ledBoost} distance={3} decay={2} position={[0, cargoH - 0.08, cargoL * f]} />
        ))}
    </group>
  );
}
