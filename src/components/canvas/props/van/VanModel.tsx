import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Vector3, type Group, type Plane } from 'three';
import type { VanSpec } from '../../../../types/camper.types';
import type { VanLayout } from '../../../../utils/vanLayout';
import { useViewStore } from '../../../../store/useViewStore';
import { requestContactShadowRefresh } from '../../contactShadowRefresh';
import { cargoCentre, cargoPanelRules } from './cargoPanels';
import { SECTION_PLANES, chooseCargoOpening, resetSectionPlanes, writeSectionPlanes } from './sectionCut';
import { prepareVanModel, type VanModelDoors } from './vanModelFit';
import { phase, setDoorSectionCut, setVanDoorAperture, vanDoorProgress } from './vanDoorMotion';

interface VanModelProps {
  url: string;
  van: VanSpec;
  layout: VanLayout;
}

const cameraLocal = new Vector3();

// Door motion in the model frame (metres before the fit scale; the model's front is +Z and its
// passenger side −X). The sliding door first pops out of the body, then rolls back on its track;
// the barn doors swing out on their outer hinges, the handle leaf first.
const SIDE_POP_M = 0.1;
const SIDE_TRAVEL_EXTRA_M = 0.1;
const REAR_OPEN_RAD = (100 * Math.PI) / 180;

function poseDoors(doors: VanModelDoors, sideTravel: number): void {
  const side = vanDoorProgress.side;
  const rear = vanDoorProgress.rear;
  const sideBase = doors.side && doors.base.get(doors.side);
  if (doors.side && sideBase) {
    const pop = phase(side, 0, 0.25) * SIDE_POP_M;
    const slide = phase(side, 0.18, 1) * sideTravel;
    doors.side.position.set(sideBase.position.x - pop, sideBase.position.y, sideBase.position.z - slide);
  }
  const right = doors.rearRight && doors.base.get(doors.rearRight);
  if (doors.rearRight && right) doors.rearRight.rotation.y = right.rotationY + REAR_OPEN_RAD * phase(rear, 0, 0.7);
  const left = doors.rearLeft && doors.base.get(doors.rearLeft);
  if (doors.rearLeft && left) doors.rearLeft.rotation.y = left.rotationY - REAR_OPEN_RAD * phase(rear, 0.3, 1);
}

// Real vehicle model (van.modelUrl) fitted to the chassis data, with a camera-driven section cut
// that opens the cargo wall facing the camera (roof + near wall in perspective), like the
// procedural body's panel hiding. In X-ray mode the cut materials drop their planes (ghostChassis).
export function VanModel({ url, van, layout }: VanModelProps) {
  const { scene } = useGLTF(url);
  const root = useRef<Group | null>(null);
  // The scene's shared section planes (also used by the interior lining); left uncut on unmount
  const planes = SECTION_PLANES as Plane[];
  useEffect(() => resetSectionPlanes, []);
  const prepared = useMemo(() => prepareVanModel(scene, van, layout, planes), [scene, van, layout, planes]);
  useEffect(() => () => prepared.materials.forEach((material) => material.dispose()), [prepared]);
  // The baked contact shadow still shows the fallback body until it is re-rendered
  useLayoutEffect(() => {
    requestContactShadowRefresh();
  }, [prepared]);

  // Register this body's door openings (aim test and interior cut); the fallback body re-registers its own
  useLayoutEffect(() => {
    setVanDoorAperture('side', prepared.doors.apertures.side);
    setVanDoorAperture('rear', prepared.doors.apertures.rear);
  }, [prepared]);
  // Slide length in model units: the door's own length plus a little clearance
  const sideTravel = useMemo(() => {
    const aperture = prepared.doors.apertures.side;
    if (!aperture) return 0;
    const lengthM = aperture.max.z - aperture.min.z;
    return lengthM / (prepared.fit.scale * prepared.fit.stretchZ) + SIDE_TRAVEL_EXTRA_M;
  }, [prepared]);

  const rules = useMemo(() => cargoPanelRules(layout), [layout]);
  const centre = useMemo(() => cargoCentre(layout), [layout]);

  useFrame(({ camera }) => {
    const group = root.current;
    if (!group) return;
    group.worldToLocal(cameraLocal.copy(camera.position));
    const doubleCut = useViewStore.getState().view === 'perspective';
    const cut = chooseCargoOpening(cameraLocal.x, cameraLocal.y, cameraLocal.z, centre, rules, doubleCut);
    writeSectionPlanes(planes, cut, layout, prepared.fit.bounds, group.matrixWorld);
    // Doors: posed every frame (cheap), cut with the body only while closed
    poseDoors(prepared.doors, sideTravel);
    setDoorSectionCut(prepared.doors.materials.side, planes, vanDoorProgress.side <= 0.001);
    setDoorSectionCut(prepared.doors.materials.rear, planes, vanDoorProgress.rear <= 0.001);
  });

  return (
    <group ref={root}>
      <primitive object={prepared.object} />
    </group>
  );
}
