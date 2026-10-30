import { useMemo } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useViewStore } from '../../store/useViewStore';
import { findAdaptations } from '../../utils/fitAdaptation';
import { FurnitureItem } from './FurnitureItem';
import { isHiddenInView } from './viewVisibility';

// All installed modules, read live from the store, gated by the Furniture / Decoration layers.
export function FurnitureLayer() {
  const items = useProjectStore((state) => state.items);
  const van = useProjectStore((state) => state.van);
  // Notches and hosting follow the committed scene (during a drag only the red preview is live)
  const adaptations = useMemo(() => findAdaptations(van, items), [van, items]);
  const selectedId = useProjectStore((state) => state.selectedId);
  const select = useProjectStore((state) => state.select);
  const dragCollisionIds = useProjectStore((state) => state.dragCollisionIds);
  const view = useViewStore((state) => state.view);
  const showFurniture = useViewStore((state) => state.layers.furniture);
  const showDecor = useViewStore((state) => state.layers.decor);

  return (
    <group>
      {items.map((item) => (
        <FurnitureItem
          key={item.id}
          // Hidden in this view or by its layer (Decoration for 'decor', Furniture for the rest):
          // drawn and picked like a module hidden from the Inspector, but it still counts in mass,
          // CoG and collisions
          item={
            isHiddenInView(item.catalogId, view) || !(item.category === 'decor' ? showDecor : showFurniture)
              ? { ...item, visible: false }
              : item
          }
          selected={item.id === selectedId}
          // While dragging, the live preview wins over the committed flags
          colliding={dragCollisionIds ? dragCollisionIds.includes(item.id) : item.hasCollision === true}
          onSelect={select}
          adaptations={adaptations.get(item.id)}
        />
      ))}
    </group>
  );
}
