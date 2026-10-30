import { useEffect, useMemo } from 'react';
import { Edges } from '@react-three/drei';
import type { CamperItem } from '../../types/camper.types';
import { mmToM } from '../../utils/unitConverters';
import { findMaterial } from '../../data/materialsCatalog';
import { getMaterialTextures } from '../../utils/textureGenerator';
import { createMetricBoxGeometry } from '../../utils/textures/metricBoxGeometry';
import { CATEGORY_COLORS } from './props/propMaterials';

// Used when a module references a material missing from the catalog (e.g. an old project file)
const FALLBACK_ROUGHNESS = 0.7;
const COLLISION_COLOR = '#ef4444';
const SELECTION_EMISSIVE = '#0ea5e9';

interface FurnitureBoxProps {
  item: CamperItem;
  selected: boolean;
  colliding: boolean;
}

// Textured box for a module without a procedural prop (unknown ids from old files): here the box is
// what is drawn, and its collision shape is that same box (utils/shapes/itemShape.ts).
// Its pivot is the centre of its base, so it is lifted by height / 2. It tints itself (its JSX
// material is owned by this module), so ItemSkin leaves it alone apart from wheel-arch notches.
export function FurnitureBox({ item, selected, colliding }: FurnitureBoxProps) {
  const width = mmToM(item.dimensions.width);
  const height = mmToM(item.dimensions.height);
  const depth = mmToM(item.dimensions.depth);
  const geometry = useMemo(() => createMetricBoxGeometry(width, height, depth), [width, height, depth]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Catalogue entries are stable objects, so the cached texture set is looked up once per material
  const material = findMaterial(item.materialId);
  const textures = useMemo(() => (material ? getMaterialTextures(material) : null), [material]);
  const baseColor = textures ? '#ffffff' : (material?.texture.baseColor ?? CATEGORY_COLORS[item.category]);
  // With a roughness map the factor is 1: the map holds absolute roughness
  const roughness = textures ? 1 : (material?.texture.roughness ?? FALLBACK_ROUGHNESS);
  // Red multiplies the texture; a faint red glow keeps the tint readable on dark boards
  const emissive = colliding ? COLLISION_COLOR : selected ? SELECTION_EMISSIVE : '#000000';
  const emissiveIntensity = colliding ? 0.2 : selected ? 0.35 : 0;

  return (
    <mesh geometry={geometry} position={[0, height / 2, 0]} castShadow receiveShadow>
      <meshStandardMaterial
        // Map defines change the shader, so switching textured ↔ flat rebuilds the material
        key={textures ? 'pbr' : 'flat'}
        // Owned by this module alone: ItemSkin notches it in place and does not tint it
        userData={{ notchInPlace: true }}
        color={colliding ? COLLISION_COLOR : baseColor}
        map={textures?.map ?? null}
        normalMap={textures?.normalMap ?? null}
        roughnessMap={textures?.roughnessMap ?? null}
        roughness={roughness}
        metalness={textures?.metalness ?? 0}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
      <Edges color={colliding ? COLLISION_COLOR : selected ? '#38bdf8' : '#1e293b'} />
    </mesh>
  );
}
