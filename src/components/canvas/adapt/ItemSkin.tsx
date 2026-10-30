import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box3, Color, type Group, type Material, type Object3D } from 'three';
import { MAX_NOTCHES, canNotch, createNotchUniforms, patchNotchMaterial } from './notchMaterial';

// Selection and collision are shown on the module's visible geometry itself, never on a box:
// a cyan glow when selected, a red tint when it collides (red wins).
export type SkinTint = 'none' | 'selected' | 'colliding';

const SELECTED_EMISSIVE = new Color('#0ea5e9');
const COLLIDING_EMISSIVE = new Color('#ef4444');
const COLLIDING_COLOR = new Color('#ff3b3b');
const TINT_EMISSIVE: Record<Exclude<SkinTint, 'none'>, { color: Color; intensity: number }> = {
  selected: { color: SELECTED_EMISSIVE, intensity: 0.4 },
  colliding: { color: COLLIDING_EMISSIVE, intensity: 0.45 },
};
const COLLIDING_COLOR_MIX = 0.45;

interface ItemSkinProps {
  // Regions cut out of the module, in its local frame (Adaptation 'archNotch' localBox)
  notches: readonly Box3[];
  tint: SkinTint;
  children: ReactNode;
}

type WithMaterial = Object3D & { material?: Material | Material[] };
type Tintable = Material & { color?: Color; emissive?: Color; emissiveIntensity?: number };

const scratch = new Box3();

// Applies the tint to an override clone, from its source's own colours
function applyTint(clone: Tintable, source: Tintable, tint: SkinTint): void {
  if (clone.color && source.color) {
    clone.color.copy(source.color);
    if (tint === 'colliding') clone.color.lerp(COLLIDING_COLOR, COLLIDING_COLOR_MIX);
  }
  if (clone.emissive && source.emissive) {
    const glow = tint === 'none' ? null : TINT_EMISSIVE[tint];
    clone.emissive.copy(glow ? glow.color : source.emissive);
    clone.emissiveIntensity = glow ? glow.intensity : (source.emissiveIntensity ?? 1);
  }
}

// Material overrides of one module, for everything drawn inside it:
// - wheel-arch notches (fitAdaptation.ts): fragments inside the notch boxes are discarded, so every
//   part is drawn split around the arch exactly like its collision shape (the parts are split by
//   the same boxes in utils/fitAdaptation.ts);
// - selection / collision tint on the visible meshes.
// Prop materials are shared by every module, so this instance swaps them for its own clones while
// it needs them, and restores the originals when neither applies. Materials flagged
// userData.notchInPlace (owned by one module, e.g. FurnitureBox's JSX material, which tints itself)
// are notched in place instead. The notch boxes follow the module's world matrix every frame, so the
// cut moves with it while it is dragged.
export function ItemSkin({ notches, tint, children }: ItemSkinProps) {
  const group = useRef<Group>(null);
  const uniforms = useMemo(createNotchUniforms, []);
  const clones = useRef(new Map<Material, Material>()); // source → clone
  const sources = useRef(new Map<Material, Material>()); // clone → source
  // What the current clones were built for: notch patch (fixed per clone) and tint (re-applied)
  const built = useRef({ notched: false, tint: 'none' as SkinTint });
  const latest = useRef({ notches, tint });
  latest.current = { notches, tint };

  const dropClones = () => {
    clones.current.forEach((clone) => clone.dispose());
    clones.current.clear();
    sources.current.clear();
  };
  useEffect(() => dropClones, []);

  useFrame(() => {
    const root = group.current;
    if (!root) return;
    const { notches: cuts, tint: mode } = latest.current;
    const notched = cuts.length > 0;
    const active = notched || mode !== 'none';
    if (!active && clones.current.size === 0 && uniforms.notchCount.value === 0) return;

    root.updateWorldMatrix(true, false);
    const list = cuts.slice(0, MAX_NOTCHES);
    list.forEach((box, index) => {
      scratch.copy(box).applyMatrix4(root.matrixWorld);
      uniforms.notchMin.value[index]!.copy(scratch.min);
      uniforms.notchMax.value[index]!.copy(scratch.max);
    });
    // Also clears the cut of in-place patched materials once the notch is gone
    uniforms.notchCount.value = list.length;

    // Clones are patched (or not) for the cut when built: a notch change rebuilds them all
    const rebuild = clones.current.size > 0 && (!active || built.current.notched !== notched);
    const resolve = (material: Material): Material => {
      const source = sources.current.get(material) ?? material;
      // Running water keeps its own (shader-animated) materials
      if (!active || rebuild || source.userData.skinExempt) return source;
      if (source.userData.notchInPlace) {
        if (notched && !source.userData.notchCut && canNotch(source)) patchNotchMaterial(source, uniforms);
        return source;
      }
      let clone = clones.current.get(source);
      if (!clone) {
        clone = source.clone();
        if (notched && canNotch(clone)) patchNotchMaterial(clone, uniforms);
        applyTint(clone as Tintable, source as Tintable, mode);
        clones.current.set(source, clone);
        sources.current.set(clone, source);
      }
      return clone;
    };

    // New parts (resize, open doors) and materials R3F swapped back are picked up on the next frame
    root.traverse((object: WithMaterial) => {
      const { material } = object;
      if (!material) return;
      if (Array.isArray(material)) {
        const next = material.map(resolve);
        if (next.some((m, i) => m !== material[i])) object.material = next;
      } else {
        const next = resolve(material);
        if (next !== material) object.material = next;
      }
    });

    if (rebuild) {
      // Sources are back in place: the next frame builds fresh clones for the new notch state
      dropClones();
      return;
    }
    if (built.current.tint !== mode) {
      clones.current.forEach((clone, source) => applyTint(clone as Tintable, source as Tintable, mode));
    }
    built.current = { notched, tint: mode };
  });

  return <group ref={group}>{children}</group>;
}
