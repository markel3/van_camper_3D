import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type Group } from 'three';
import { requestContactShadowRefresh } from '../contactShadowRefresh';
import type { Vec3Tuple } from './propParts';

// Doors, lids and drawers of articulated modules (CamperItem.isOpen). They ease towards the target
// pose (≈ 0.3 s) and re-bake the contact shadow while moving. Visual only: collisions keep the
// closed shape (utils/shapes).

// Default swing of hinged parts: enough to check the aisle without hitting a side wall
export const DOOR_OPEN_RAD = MathUtils.degToRad(85);
const DAMPING = 12; // 1/s
const SETTLED = 1e-4;

interface HingeProps {
  // Hinge line position (prop space) and the axis it turns about
  position: Vec3Tuple;
  axis: 'x' | 'y';
  // Signed angle when open (radians); the closed pose is 0
  openAngle: number;
  open: boolean;
  children: ReactNode;
}

// Children are placed relative to the hinge line (e.g. a door's edge sits at local x = 0)
export function Hinge({ position, axis, openAngle, open, children }: HingeProps) {
  const ref = useRef<Group | null>(null);
  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    const target = open ? openAngle : 0;
    const current = group.rotation[axis];
    if (Math.abs(current - target) < SETTLED) return;
    const next = MathUtils.damp(current, target, DAMPING, delta);
    group.rotation[axis] = Math.abs(next - target) < SETTLED ? target : next;
    requestContactShadowRefresh();
  });
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

interface SlideProps {
  position: Vec3Tuple;
  // Travel along +Z (the module's front) when open, in metres
  openTravel: number;
  open: boolean;
  children: ReactNode;
}

// Drawer runner: slides its children out of the module's front
export function Slide({ position, openTravel, open, children }: SlideProps) {
  const ref = useRef<Group | null>(null);
  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    const target = position[2] + (open ? openTravel : 0);
    const current = group.position.z;
    if (Math.abs(current - target) < SETTLED) return;
    const next = MathUtils.damp(current, target, DAMPING, delta);
    group.position.z = Math.abs(next - target) < SETTLED ? target : next;
    requestContactShadowRefresh();
  });
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}
