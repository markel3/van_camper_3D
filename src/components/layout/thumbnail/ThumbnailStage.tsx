import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, useProgress } from '@react-three/drei';
import { Box3, Sphere, Vector3, type Group, type PerspectiveCamera } from 'three';
import { ITEMS_CATALOG } from '../../../data/itemsCatalog';
import { DEFAULT_VAN, VANS_CATALOG, findVan } from '../../../data/vansCatalog';
import { useProjectStore } from '../../../store/useProjectStore';
import { useViewStore } from '../../../store/useViewStore';
import type { CamperItem } from '../../../types/camper.types';
import { createItemFromCatalog } from '../../../utils/itemFactory';
import { FurnitureRenderer } from '../../canvas/FurnitureRenderer';
import { VanShellProp } from '../../canvas/props/VanShellProp';
import { StudioLights } from '../../canvas/StudioLights';
import { StudioEnvironment } from '../../canvas/StudioEnvironment';

// Thumbnail capture mode (scripts/capture-thumbnails.mjs): `?thumbnail=<catalogId>` renders one
// catalogue prop, `?thumbnail=van:<vanId>` the van exterior, `?thumbnail=__list` publishes the ids.
// The page flags `window.__thumbnailReady` once models are loaded and the camera has settled.

declare global {
  interface Window {
    __thumbnailReady?: boolean;
    __thumbnailIds?: string[];
  }
}

export const THUMBNAIL_PARAM = 'thumbnail';

// Output file stem: catalogue id, or van-<id>
export const thumbnailIds = (): string[] => [
  ...ITEMS_CATALOG.map((def) => def.catalogId),
  ...VANS_CATALOG.map((van) => `van:${van.id}`),
];

// Camera direction (from target): products are seen from the front-right (+Z front),
// vans from the front-right three-quarter (cab towards −Z)
const ITEM_DIRECTION = new Vector3(0.95, 0.8, 1.45).normalize();
const VAN_DIRECTION = new Vector3(1.25, 0.42, -1.55).normalize();
const SETTLE_FRAMES = 20;

function FitAndFlag({ target, direction, margin }: { target: RefObject<Group | null>; direction: Vector3; margin: number }) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const { active } = useProgress();
  const frames = useRef(0);
  const box = useMemo(() => new Box3(), []);
  const sphere = useMemo(() => new Sphere(), []);

  useFrame(() => {
    if (!target.current) return;
    // Re-applied every frame: CloseBodyForCapture moves the camera inside the cargo box first
    box.setFromObject(target.current);
    if (box.isEmpty()) return;
    box.getBoundingSphere(sphere);
    const distance = (sphere.radius * margin) / Math.sin((camera.fov * Math.PI) / 360);
    camera.position.copy(sphere.center).addScaledVector(direction, distance);
    camera.near = distance / 50;
    camera.far = distance * 10;
    camera.lookAt(sphere.center);
    camera.updateProjectionMatrix();
    frames.current = active ? 0 : frames.current + 1;
    if (frames.current > SETTLE_FRAMES && !window.__thumbnailReady) window.__thumbnailReady = true;
  });
  return null;
}

// The editor opens the body (roof + near wall, cab) when the camera looks in from outside
// (useAutoHidePanels). A catalogue picture shows the closed van: this frame callback is subscribed
// before the body's, so the auto-hide sees the camera inside the cargo box and keeps every panel;
// FitAndFlag (subscribed after it) puts the camera back before the frame is drawn.
function CloseBodyForCapture() {
  const camera = useThree((state) => state.camera);
  const van = useProjectStore((state) => state.van);
  useFrame(() => {
    camera.position.set(0, van.interiorHeightMM / 2000, van.interiorLengthMM / 2000);
  });
  return null;
}

function ItemSubject({ item }: { item: CamperItem }) {
  return <FurnitureRenderer item={item} selected={false} colliding={false} />;
}

export function ThumbnailStage({ subject }: { subject: string }) {
  const groupRef = useRef<Group | null>(null);
  const [ready, setReady] = useState(false);
  const vanId = subject.startsWith('van:') ? subject.slice(4) : null;
  const def = ITEMS_CATALOG.find((entry) => entry.catalogId === subject);

  useEffect(() => {
    document.body.classList.add('thumbnail-mode');
    window.__thumbnailIds = thumbnailIds();
    if (vanId) {
      const van = findVan(vanId);
      if (van) useProjectStore.getState().loadProject({ van, items: [], interiorFinish: useProjectStore.getState().interiorFinish });
      useViewStore.getState().setWorkflowPhase('model');
    }
    setReady(true);
  }, [vanId]);

  if (subject === '__list') return <p>{thumbnailIds().length} ids</p>;
  if (!ready || (!vanId && !def)) return <p className="p-4 text-white">Sin miniatura para «{subject}»</p>;
  const item = def ? { ...createItemFromCatalog(def, DEFAULT_VAN), id: 'thumbnail', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } } : null;

  return (
    <div className="h-full w-full">
      <Canvas shadows="percentage" dpr={1} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} camera={{ fov: 30 }}>
        <StudioLights />
        <StudioEnvironment />
        {vanId && <CloseBodyForCapture />}
        <group ref={groupRef}>{item ? <ItemSubject item={item} /> : <VanShellProp />}</group>
        <ContactShadows position={[0, vanId ? -(findVan(vanId)?.floorHeightMM ?? 540) / 1000 : 0.001, 0]} scale={vanId ? 9 : 3} blur={2.4} far={3} opacity={0.55} />
        <FitAndFlag target={groupRef} direction={vanId ? VAN_DIRECTION : ITEM_DIRECTION} margin={vanId ? 0.78 : 0.9} />
      </Canvas>
    </div>
  );
}
