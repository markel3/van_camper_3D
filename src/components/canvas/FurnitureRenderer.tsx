import type { ComponentType } from 'react';
import type { Adaptation } from '../../types/adaptation.types';
import type { CamperItem } from '../../types/camper.types';
import { mmToM } from '../../utils/unitConverters';
import { useInteractionStore } from '../../store/useInteractionStore';
import { FurnitureBox } from './FurnitureBox';
import { NotchBoxing } from './adapt/NotchBoxing';
import type { PropProps } from './props/propParts';
import { SolarPanelProp } from './props/SolarPanelProp';
import { SkylightProp } from './props/SkylightProp';
import { BedProp } from './props/BedProp';
import { KitchenProp } from './props/KitchenProp';
import { FridgeProp } from './props/FridgeProp';
import { BatteryProp } from './props/BatteryProp';
import { GreyWaterTankProp, WaterTankProp } from './props/WaterTankProp';
import { ShowerCabinProp } from './props/ShowerCabinProp';
import { ToiletProp } from './props/ToiletProp';
import { OverheadCabinetProp } from './props/OverheadCabinetProp';
import { DrawerUnitProp } from './props/DrawerUnitProp';
import { CustomBoardProp, WoodSlatProp } from './props/CustomBoardProp';
import { LagunTableProp } from './props/LagunTableProp';
import { HydraulicKitProp } from './props/HydraulicKitProp';
import { InverterProp } from './props/InverterProp';
import { SeatChestProp, StorageBenchProp } from './props/StorageBenchProp';
import { HangingPlantProp } from './props/decor/HangingPlantProp';
import { BooksProp, JuteRugProp, LinenCushionsProp, PottedPlantProp } from './props/decor/SmallDecorProps';
import { CoffeeSetProp } from './props/decor/CoffeeSetProp';
import { LedStringProp } from './props/decor/LedStringProp';
import { SurfboardProp } from './props/decor/SurfboardProp';

// Procedural look per catalogue product. Anything not listed (unknown ids from old files) is drawn
// as the textured box.
const PROCEDURAL_PROPS: Readonly<Record<string, ComponentType<PropProps>>> = {
  'solar-panel-100w': SolarPanelProp,
  'skylight-400': SkylightProp,
  'bed-fixed-1900': BedProp,
  'kitchen-block-1000': KitchenProp,
  'fridge-65l-12v': FridgeProp,
  'battery-lifepo4-100ah': BatteryProp,
  'water-tank-clean-100l': WaterTankProp,
  'locker-side-1000': StorageBenchProp,
  'shower-cabin-800': ShowerCabinProp,
  'toilet-portable': ToiletProp,
  'overhead-cabinet-1000': OverheadCabinetProp,
  'drawer-unit-600': DrawerUnitProp,
  'lagun-table': LagunTableProp,
  'grey-water-tank-90l': GreyWaterTankProp,
  'water-pump-boiler-kit': HydraulicKitProp,
  'inverter-2000va': InverterProp,
  'seat-chest-1000': SeatChestProp,
  'bed-rear-garage': BedProp,
  'fridge-85l': FridgeProp,
  'fridge-100l': FridgeProp,
  // Free carpentry (boardPieces.ts): loose boards and battens stretched by the push/pull grips
  'board-horizontal': CustomBoardProp,
  'board-vertical': CustomBoardProp,
  'wood-slat': WoodSlatProp,
  // Decoration layer
  'decor-hanging-plant': HangingPlantProp,
  'decor-potted-plant': PottedPlantProp,
  'decor-linen-cushions': LinenCushionsProp,
  'decor-led-string': LedStringProp,
  'decor-coffee-set': CoffeeSetProp,
  'decor-jute-rug': JuteRugProp,
  'decor-surfboard': SurfboardProp,
  'decor-books': BooksProp,
};

interface FurnitureRendererProps {
  item: CamperItem;
  selected: boolean;
  colliding: boolean;
  // Fit adaptations (findAdaptations): wheel-arch notches and hosted devices
  adaptations?: readonly Adaptation[];
}

// Draws a module without a .glb: its procedural prop, or the textured box when there is no prop.
// Nothing invisible is drawn around it: picking, selection and collision tints all act on these
// visible meshes (FurnitureItem, adapt/ItemSkin). A module notched around a wheel arch gets the
// boxing boards that close the notch (NotchBoxing; the cut itself is ItemSkin's). A container
// hosting devices draws them visible (PropProps.hosting).
export function FurnitureRenderer({ item, selected, colliding, adaptations }: FurnitureRendererProps) {
  const Prop = PROCEDURAL_PROPS[item.catalogId];
  const boards = (adaptations ?? []).flatMap((a) => (a.kind === 'archNotch' ? a.boards : []));
  const hosting = (adaptations ?? []).some((a) => a.kind === 'hosts');
  const waterRunning = useInteractionStore((state) => state.runningWater[item.id] === true);

  return (
    <>
      {Prop ? (
        <Prop
          width={mmToM(item.dimensions.width)}
          height={mmToM(item.dimensions.height)}
          depth={mmToM(item.dimensions.depth)}
          materialId={item.materialId}
          category={item.category}
          open={item.isOpen === true}
          hosting={hosting}
          waterRunning={waterRunning}
        />
      ) : (
        <FurnitureBox item={item} selected={selected} colliding={colliding} />
      )}
      {boards.length > 0 && <NotchBoxing boards={boards} materialId={item.materialId} category={item.category} />}
    </>
  );
}
