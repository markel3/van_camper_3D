import { SceneCanvas } from '../../canvas/SceneCanvas';
import { CanvasErrorBoundary } from '../../canvas/CanvasErrorBoundary';
import { useViewStore } from '../../../store/useViewStore';
import { WalkthroughOverlay } from '../walkthrough/WalkthroughOverlay';
import { ViewportToolRail } from './ViewportToolRail';
import { FloatingToolbar } from './FloatingToolbar';

// «3D Workspace»: the R3F canvas with the tool rail, the floating toolbar and the walkthrough HUD
export function Viewport() {
  const isWalkthrough = useViewStore((state) => state.isWalkthrough);
  return (
    <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-cad-viewport" data-viewport>
      <CanvasErrorBoundary>
        <SceneCanvas />
      </CanvasErrorBoundary>
      {!isWalkthrough && <ViewportToolRail />}
      {!isWalkthrough && <FloatingToolbar />}
      <WalkthroughOverlay />
    </main>
  );
}
