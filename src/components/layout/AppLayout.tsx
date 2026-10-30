import { MenuBar } from './menubar/MenuBar';
import { LeftSidebar } from './catalog/LeftSidebar';
import { PropertiesSidebar } from './properties/PropertiesSidebar';
import { Viewport } from './viewport/Viewport';
import { WorkflowBar } from './workflow/WorkflowBar';
import { NewProjectModal } from './newProject/NewProjectModal';
import { PanelTab } from '../ui/Panel';

// Desktop-CAD shell: menu bar; «Módulos» dock | «3D Workspace» + workflow stepper | «Propiedades» dock.
// The viewport takes all remaining space and is never squeezed below the docks' minimums.
export function AppLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-cad-bg">
      <MenuBar />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <PanelTab>3D Workspace</PanelTab>
          <Viewport />
          <WorkflowBar />
        </div>
        <PropertiesSidebar />
      </div>
      <NewProjectModal />
    </div>
  );
}
