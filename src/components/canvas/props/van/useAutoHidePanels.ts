import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Object3D } from 'three';
import { useViewStore } from '../../../../store/useViewStore';
import { panelFacing, type CargoPanelRule } from './cargoPanels';
import { chooseCargoOpening, isPanelOpen } from './sectionCut';

// A body panel group that hides when it stands between the camera and the cargo interior
export interface AutoHidePanel {
  ref: RefObject<Object3D | null>;
  rule: CargoPanelRule;
}

const cameraLocal = new Vector3();

// Per-frame panel visibility (WORKFLOWS.md, Flow 1): a panel hides when the camera is outside its
// outer face AND looks at the cargo roughly along its normal (cargoPanels.ts). Plain number maths on
// one module-level scratch vector: no allocations per frame. The cargo panels follow the same
// opening as the .glb section cut (roof + near wall in perspective); the cab keeps its own rule.
// In X-ray mode every panel stays visible (the ghost body is never opened).
export function useAutoHidePanels(
  root: RefObject<Object3D | null>,
  centre: readonly [number, number, number],
  panels: readonly AutoHidePanel[],
): void {
  const panelsRef = useRef(panels);
  panelsRef.current = panels;
  const rules = useMemo(() => panels.map((panel) => panel.rule), [panels]);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  useFrame(({ camera }) => {
    const group = root.current;
    if (!group) return;
    // Camera position in van space (VanScene shifts it on Z)
    group.worldToLocal(cameraLocal.copy(camera.position));
    const { view, isVanTransparent } = useViewStore.getState();
    const { x, y, z } = cameraLocal;
    const panels = panelsRef.current;
    const cut = chooseCargoOpening(x, y, z, centre, rulesRef.current, view === 'perspective');
    for (const { ref, rule } of panels) {
      const object = ref.current;
      if (!object) continue;
      const open =
        rule.id === 'cab' ? panelFacing(x, y, z, centre, rule) > rule.threshold : isPanelOpen(cut, rule.id);
      const visible = isVanTransparent || !open;
      if (object.visible !== visible) object.visible = visible;
    }
  });
}
