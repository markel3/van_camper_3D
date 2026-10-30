import { DoorClosed, DoorOpen } from 'lucide-react';
import { VAN_DOOR_IDS, VAN_DOOR_LABEL, useInteractionStore } from '../../../store/useInteractionStore';
import { IconButton } from '../../ui/IconButton';

// Rail buttons that open / close the van's side door and rear doors (visual only)
export function VanDoorButtons() {
  const vanDoors = useInteractionStore((state) => state.vanDoors);
  const toggleVanDoor = useInteractionStore((state) => state.toggleVanDoor);
  return (
    <>
      {VAN_DOOR_IDS.map((door) => {
        const open = vanDoors[door];
        const name = VAN_DOOR_LABEL[door];
        return (
          <IconButton
            key={door}
            icon={open ? DoorOpen : DoorClosed}
            label={`${open ? 'Cerrar' : 'Abrir'} ${name.toLowerCase()}`}
            dataId={`van-door-${door}`}
            active={open}
            onClick={() => toggleVanDoor(door)}
          />
        );
      })}
    </>
  );
}
