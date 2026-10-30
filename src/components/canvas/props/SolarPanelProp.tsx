import { BoxGeometry, PlaneGeometry } from 'three';
import { propMaterials } from './propMaterials';
import { Part, useGeometries, type PropProps } from './propParts';
import { solarLayout } from '../../../utils/shapes/fixtureShapes';

const CELL_PITCH_M = 0.125; // monocrystalline cell + gap

// Framed photovoltaic panel: aluminium perimeter, recessed glass-covered cell wafer.
export function SolarPanelProp({ width: w, height: h, depth: d }: PropProps) {
  // Shared with the collision shape (utils/shapes/fixtureShapes.ts)
  const { frame, waferT, waferTop } = solarLayout(w, h, d);
  const innerW = w - 2 * frame;
  const innerD = d - 2 * frame;

  const geometries = useGeometries(() => {
    const cells = new PlaneGeometry(innerW, innerD).rotateX(-Math.PI / 2);
    // UVs count cells, so the one-cell texture repeats a whole number of times across the wafer
    const cols = Math.max(1, Math.round(innerW / CELL_PITCH_M));
    const rows = Math.max(1, Math.round(innerD / CELL_PITCH_M));
    const uv = cells.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * cols, uv.getY(i) * rows);
    return {
      railX: new BoxGeometry(w, h, frame),
      railZ: new BoxGeometry(frame, h, innerD),
      wafer: new BoxGeometry(innerW, waferT, innerD),
      cells,
    };
  }, [w, h, innerW, innerD, frame, waferT]);

  const aluminium = propMaterials.anodisedFrame();
  return (
    <group>
      <Part geometry={geometries.railX} material={aluminium} position={[0, h / 2, d / 2 - frame / 2]} />
      <Part geometry={geometries.railX} material={aluminium} position={[0, h / 2, -d / 2 + frame / 2]} />
      <Part geometry={geometries.railZ} material={aluminium} position={[w / 2 - frame / 2, h / 2, 0]} />
      <Part geometry={geometries.railZ} material={aluminium} position={[-w / 2 + frame / 2, h / 2, 0]} />
      <Part geometry={geometries.wafer} material={propMaterials.gasket()} position={[0, waferTop - waferT / 2, 0]} />
      {/* Lifted 0.5 mm off the wafer top to avoid z-fighting */}
      <Part geometry={geometries.cells} material={propMaterials.solarCells()} position={[0, waferTop + 0.0005, 0]} />
    </group>
  );
}
