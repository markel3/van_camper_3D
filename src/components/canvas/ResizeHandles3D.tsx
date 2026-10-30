import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Matrix3, Quaternion, Vector3, type Group, type Object3D } from 'three';
import { useProjectStore } from '../../store/useProjectStore';
import { useViewStore } from '../../store/useViewStore';
import type { CamperItem } from '../../types/camper.types';
import { faceCentre, resizeByFace, vanNormal, type ResizeFace } from '../../utils/faceResize';
import { isBoardPiece, stretchFaces } from '../../utils/boardPieces';
import { OVERLAY_LAYER, OVERLAY_LAYERS } from './sceneLayers';
import { isHiddenInView } from './viewVisibility';

// Push/pull handles of the Resize tool (R) for free carpentry (boards and battens, boardPieces.ts):
// one grip on the centre of each stretchable edge, never on the thickness, which follows the board
// material. Dragging a grip moves only that edge; the opposite edge stays
// fixed (utils/faceResize.ts), with grid snap and a 30 mm magnet to walls, ceiling, wheel arches and
// neighbouring faces. The store updates live (shapes, notch, decor, mass, cost and CoG follow) with
// the Undo history paused, and the whole drag is committed as a single step on release.

const OVERLAY_ORDER = 1000;
const GRIP_COLOR = '#f59e0b';
const GRIP_HOVER = '#fde68a';
const GRIP_ACTIVE = '#38bdf8';
const GRIP_RADIUS_M = 0.035;

interface OrbitLike {
  enabled: boolean;
}

interface DragState {
  face: ResizeFace;
  start: CamperItem;
  origin: Vector3; // face centre at drag start, world space
  axis: Vector3; // outward face normal, world space
  pointerId: number;
}

// Parameter along the axis line (origin + t·axis) closest to the pointer ray, or null when the
// view looks straight down the axis
function axisParam(origin: Vector3, axis: Vector3, rayOrigin: Vector3, rayDir: Vector3): number | null {
  const b = axis.dot(rayDir);
  const denom = 1 - b * b;
  if (denom < 1e-4) return null;
  const w = origin.clone().sub(rayOrigin);
  return (b * rayDir.dot(w) - axis.dot(w)) / denom;
}

const isGrip = (hit: { object: Object3D }): boolean => hit.object.userData.resizeGrip === true;

const sizeLabel = (item: CamperItem): string =>
  `${item.dimensions.width} × ${item.dimensions.height} × ${item.dimensions.depth} mm`;

export function ResizeHandles3D() {
  const activeTool = useViewStore((state) => state.activeTool);
  const view = useViewStore((state) => state.view);
  const isWalkthrough = useViewStore((state) => state.isWalkthrough);
  const selectedId = useProjectStore((state) => state.selectedId);
  const item = useProjectStore((state) => state.items.find((i) => i.id === state.selectedId));
  const scene = useThree((state) => state.scene);
  const raycaster = useThree((state) => state.raycaster);
  const setEvents = useThree((state) => state.setEvents);
  const orbit = useThree((state) => state.controls) as OrbitLike | null;
  const [vanSpace, setVanSpace] = useState<Object3D | null>(null);
  const [hovered, setHovered] = useState<ResizeFace | null>(null);
  const [dragFace, setDragFace] = useState<ResizeFace | null>(null);
  const drag = useRef<DragState | null>(null);
  const root = useRef<Group | null>(null);
  // Latest controls, for the unmount cleanup
  const orbitRef = useRef(orbit);
  orbitRef.current = orbit;

  const active =
    activeTool === 'resize' &&
    !isWalkthrough &&
    !!item &&
    isBoardPiece(item.catalogId) &&
    !item.locked &&
    item.visible &&
    !isHiddenInView(item.catalogId, view);

  // Handles are drawn in van space: the parent of the module's object (FurnitureItem is named by id)
  useEffect(() => {
    setVanSpace(selectedId ? (scene.getObjectByName(selectedId)?.parent ?? null) : null);
  }, [scene, selectedId]);

  // The grips live on the overlay layer (no contact shadows, drawn after post-processing); the
  // event raycaster only tests layer 0 by default, so it is widened while they are shown
  useEffect(() => {
    if (!active) return;
    raycaster.layers.enable(OVERLAY_LAYER);
    // Grips are drawn over everything (no depth test), so they also win the pick over the module
    // surfaces in front of them
    setEvents({ filter: (hits) => [...hits.filter(isGrip), ...hits.filter((hit) => !isGrip(hit))] });
    return () => {
      raycaster.layers.disable(OVERLAY_LAYER);
      setEvents({ filter: undefined });
    };
  }, [active, raycaster, setEvents]);

  // Never leave the camera frozen or the history paused if the tool or selection changes mid-drag
  useEffect(() => () => endDrag(false), []); // eslint-disable-line react-hooks/exhaustive-deps

  const grips = useMemo(() => {
    if (!item) return [];
    return stretchFaces(item.catalogId).map((face) => {
      const centre = faceCentre(item, face);
      const normal = vanNormal(item, face);
      const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal);
      return { face, centre, quaternion };
    });
  }, [item]);

  // Drawn at the scene root in van-space coordinates (a portal would get its own event raycaster,
  // blind to the overlay layer): the root group follows the van-space transform
  useFrame(() => {
    const group = root.current;
    if (!group || !vanSpace) return;
    vanSpace.updateWorldMatrix(true, false);
    group.matrix.copy(vanSpace.matrixWorld);
  });

  if (!active || !item || !vanSpace) return null;

  function beginDrag(face: ResizeFace, event: ThreeEvent<PointerEvent>) {
    if (!item || !vanSpace || event.button !== 0) return;
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    vanSpace.updateWorldMatrix(true, false);
    const origin = faceCentre(item, face).applyMatrix4(vanSpace.matrixWorld);
    const axis = vanNormal(item, face).applyMatrix3(new Matrix3().setFromMatrix4(vanSpace.matrixWorld)).normalize();
    drag.current = { face, start: structuredClone(item), origin, axis, pointerId: event.pointerId };
    if (orbit) orbit.enabled = false;
    useProjectStore.temporal.getState().pause();
    setDragFace(face);
  }

  function updateDrag(event: ThreeEvent<PointerEvent>) {
    const state = drag.current;
    if (!state || event.pointerId !== state.pointerId) return;
    event.stopPropagation();
    const t = axisParam(state.origin, state.axis, event.ray.origin, event.ray.direction);
    if (t === null) return;
    const { van, items, snapStepMM, resizeItem } = useProjectStore.getState();
    const next = resizeByFace(van, items, state.start, state.face, t, snapStepMM);
    resizeItem(state.start.id, next.dimensions, next.position);
  }

  // Commit: back to the start pose with the history still paused, then one recorded resize
  function endDrag(commit: boolean) {
    const state = drag.current;
    if (!state) return;
    drag.current = null;
    setDragFace(null);
    if (orbitRef.current) orbitRef.current.enabled = true;
    const store = useProjectStore.getState();
    const current = store.items.find((i) => i.id === state.start.id);
    store.resizeItem(state.start.id, state.start.dimensions, state.start.position);
    useProjectStore.temporal.getState().resume();
    if (commit && current) store.resizeItem(state.start.id, current.dimensions, current.position);
  }

  const handleUp = (event: ThreeEvent<PointerEvent>) => {
    if (!drag.current || event.pointerId !== drag.current.pointerId) return;
    event.stopPropagation();
    (event.target as Element).releasePointerCapture?.(event.pointerId);
    endDrag(true);
  };

  const labelAt = dragFace ? grips.find((g) => g.face === dragFace)?.centre : undefined;

  return (
    <group ref={root} matrixAutoUpdate={false}>
      {grips.map(({ face, centre, quaternion }) => {
        const color = dragFace === face ? GRIP_ACTIVE : hovered === face ? GRIP_HOVER : GRIP_COLOR;
        return (
          <group key={face} position={centre} quaternion={quaternion}>
            {/* Grip: a disc on the face with an arrow pointing out of it */}
            <mesh
              layers={OVERLAY_LAYERS}
              renderOrder={OVERLAY_ORDER}
              userData={{ resizeGrip: true }}
              onPointerDown={(event) => beginDrag(face, event)}
              onPointerMove={updateDrag}
              onPointerUp={handleUp}
              onPointerOver={(event) => {
                event.stopPropagation();
                setHovered(face);
              }}
              onPointerOut={() => setHovered((current) => (current === face ? null : current))}
              onClick={(event) => event.stopPropagation()}
            >
              <sphereGeometry args={[GRIP_RADIUS_M, 20, 12]} />
              <meshBasicMaterial color={color} depthTest={false} transparent opacity={0.95} toneMapped={false} />
            </mesh>
            <mesh layers={OVERLAY_LAYERS} renderOrder={OVERLAY_ORDER} position={[0, GRIP_RADIUS_M * 2.1, 0]} raycast={() => null}>
              <coneGeometry args={[GRIP_RADIUS_M * 0.7, GRIP_RADIUS_M * 1.6, 16]} />
              <meshBasicMaterial color={color} depthTest={false} transparent opacity={0.95} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
      {labelAt && (
        <Html position={labelAt} center zIndexRange={[11, 0]} style={{ pointerEvents: 'none' }}>
          <div
            data-resize-label
            className="-translate-y-6 whitespace-nowrap rounded border border-sky-400/60 bg-slate-950/90 px-2 py-0.5 font-mono text-[11px] text-sky-200"
          >
            {sizeLabel(item)}
          </div>
        </Html>
      )}
    </group>
  );
}
