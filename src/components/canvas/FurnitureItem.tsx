import { Suspense, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Adaptation } from '../../types/adaptation.types';
import type { CamperItem } from '../../types/camper.types';
import { ITEMS_CATALOG } from '../../data/itemsCatalog';
import { mmToM } from '../../utils/unitConverters';
import { FurnitureRenderer } from './FurnitureRenderer';
import { FurnitureModel } from './FurnitureModel';
import { ModelErrorBoundary } from './ModelErrorBoundary';
import { ItemSkin, type SkinTint } from './adapt/ItemSkin';

interface FurnitureItemProps {
  item: CamperItem;
  selected: boolean;
  colliding: boolean;
  onSelect: (id: string) => void;
  adaptations?: readonly Adaptation[];
}

// Renders one module: a catalogue .glb fitted to its box when available (it wins over props),
// otherwise its procedural prop or the textured box (FurnitureRenderer).
// The pivot sits at the centre of the module's base. There is no invisible box: the module is
// picked through its visible meshes (R3F raycasts the group's children), and selection/collision
// tint those meshes (ItemSkin), together with the wheel-arch notch cut.
export function FurnitureItem({ item, selected, colliding, onSelect, adaptations }: FurnitureItemProps) {
  // The model URL lives only in the catalogue, so saved projects pick up new models automatically
  const modelUrl = useMemo(
    () => ITEMS_CATALOG.find((def) => def.catalogId === item.catalogId)?.modelUrl,
    [item.catalogId],
  );
  const notches = useMemo(
    () => (adaptations ?? []).flatMap((a) => (a.kind === 'archNotch' ? [a.localBox] : [])),
    [adaptations],
  );

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(item.id);
  };

  // Procedural prop or textured box: shown without a model, while it loads and if it fails
  const fallback = <FurnitureRenderer item={item} selected={selected} colliding={colliding} adaptations={adaptations} />;
  const tint: SkinTint = colliding ? 'colliding' : selected ? 'selected' : 'none';

  return (
    <group
      // The gizmo looks the object up by id, so no Three.js objects need to live in the store
      name={item.id}
      position={[item.position.x, item.position.y, item.position.z]}
      rotation={[item.rotation.x, item.rotation.y, item.rotation.z]}
      visible={item.visible}
      // Three's raycaster ignores `visible`, so hidden modules are simply not pickable
      onClick={item.visible ? handleClick : undefined}
    >
      <ItemSkin notches={notches} tint={tint}>
        {modelUrl ? (
          <ModelErrorBoundary url={modelUrl} fallback={fallback}>
            <Suspense fallback={fallback}>
              <FurnitureModel
                url={modelUrl}
                width={mmToM(item.dimensions.width)}
                height={mmToM(item.dimensions.height)}
                depth={mmToM(item.dimensions.depth)}
              />
            </Suspense>
          </ModelErrorBoundary>
        ) : (
          fallback
        )}
      </ItemSkin>
    </group>
  );
}
