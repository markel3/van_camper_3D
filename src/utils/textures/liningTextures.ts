import { CanvasTexture, PlaneGeometry, RepeatWrapping, type Texture } from 'three';
import { getPbrTextures, type PbrTextureSet } from './pbrTextures';

// Photographic texture sets of the cargo shell, its insulation and the interior lining
// (public/textures/<id>/, CC0: Poly Haven and ambientCG, see each entry). Geometry using them has
// metric UVs (1 unit = 1 m), so every texture repeats once per `sizeM` metres.

export type LiningSetKey =
  | 'oak' // light oak veneer: wall boards and ceiling slats
  | 'pine' // varnished pine: warm wall boards and floor battens
  | 'oakFloor' // oak laminate planks
  | 'pineFloor' // pine floor planks
  | 'kaiflex' // closed-cell foam micro relief (neoprene)
  | 'felt' // fleece / felt fibres
  | 'rockwool' // stone wool
  | 'foil'; // crinkled aluminium foil

export interface LiningSetDef {
  id: string;
  sizeM: number; // real-world size of one tile
  // The grain (or plank direction) of the image runs along V; rotate to lay it along U
  grainAlongV: boolean;
  hasAo: boolean;
  source: string;
}

export const LINING_SETS: Record<LiningSetKey, LiningSetDef> = {
  oak: { id: 'lining-oak', sizeM: 1.83, grainAlongV: true, hasAo: false, source: 'Poly Haven oak_veneer_01' },
  pine: { id: 'lining-pine', sizeM: 0.74, grainAlongV: false, hasAo: false, source: 'Poly Haven coated_pine' },
  oakFloor: { id: 'lining-oak-floor', sizeM: 1.7, grainAlongV: false, hasAo: false, source: 'Poly Haven laminate_floor_02' },
  pineFloor: { id: 'lining-pine-floor', sizeM: 1.7, grainAlongV: true, hasAo: false, source: 'Poly Haven wood_floor' },
  kaiflex: { id: 'insul-kaiflex', sizeM: 0.28, grainAlongV: false, hasAo: false, source: 'Poly Haven scuba_suede' },
  felt: { id: 'insul-felt', sizeM: 0.27, grainAlongV: false, hasAo: false, source: 'Poly Haven polar_fleece' },
  rockwool: { id: 'insul-rockwool', sizeM: 0.5, grainAlongV: false, hasAo: true, source: 'ambientCG Carpet016' },
  foil: { id: 'insul-foil', sizeM: 0.45, grainAlongV: false, hasAo: true, source: 'ambientCG Foil003' },
};

const variants = new Map<string, PbrTextureSet>();

// Texture set with metric repeat. `grainAlong` lays the image's grain on the U or V axis of the
// geometry (rotating the image a quarter turn when needed); `scale` stretches the tile.
export function getLiningTextures(key: LiningSetKey, grainAlong: 'u' | 'v' = 'v', scale = 1): PbrTextureSet {
  const def = LINING_SETS[key];
  const cacheKey = `${key}:${grainAlong}:${scale}`;
  const cached = variants.get(cacheKey);
  if (cached) return cached;
  const base = getPbrTextures(def.id, { sizeM: def.sizeM, hasAo: def.hasAo });
  const rotate = (grainAlong === 'v') !== def.grainAlongV;
  const repeat = 1 / (def.sizeM * scale);
  const variant = (texture: Texture): Texture => {
    const copy = texture.clone();
    copy.repeat.set(repeat, repeat);
    copy.rotation = rotate ? Math.PI / 2 : 0;
    return copy;
  };
  const set: PbrTextureSet = {
    map: variant(base.map),
    normalMap: variant(base.normalMap),
    roughnessMap: variant(base.roughnessMap),
    aoMap: base.aoMap ? variant(base.aoMap) : null,
    sizeM: def.sizeM * scale,
  };
  variants.set(cacheKey, set);
  return set;
}

// ---- Off-white panelling: vertical joints drawn as a dark alpha mask over flat panels ----

// One vertical joint per tile
export const PANEL_PITCH_M = 0.6;

let panelMask: CanvasTexture | null = null;
// alphaMap: white = dark seam line, black = clear
export function getPanelSeamMask(): CanvasTexture {
  if (panelMask) return panelMask;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 4;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 64, 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 2, 4);
  }
  panelMask = new CanvasTexture(canvas);
  panelMask.wrapS = RepeatWrapping;
  panelMask.wrapT = RepeatWrapping;
  panelMask.anisotropy = 4;
  return panelMask;
}

// Plane whose UVs count tiles: one UV unit = one tile of tileU × tileV metres
export function createTiledPlaneGeometry(width: number, height: number, tileU: number, tileV: number): PlaneGeometry {
  const geometry = new PlaneGeometry(width, height);
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * width) / tileU, (uv.getY(i) * height) / tileV);
  uv.needsUpdate = true;
  return geometry;
}

let holeMasks: Record<'u' | 'v' | 'panel', CanvasTexture> | null = null;
// Lightening hole centred in a tile (alphaMap: white = metal, black = hole): an oval elongated
// along U or V, or ('panel') the large rounded opening of a stamped inner panel
export function getLighteningHoleMask(along: 'u' | 'v' | 'panel'): CanvasTexture {
  if (!holeMasks) {
    const make = (alongU: boolean, panel = false): CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#000';
        ctx.beginPath();
        if (panel) ctx.roundRect(14, 14, 100, 100, 26);
        else ctx.ellipse(64, 64, alongU ? 44 : 36, alongU ? 36 : 44, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const texture = new CanvasTexture(canvas);
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      return texture;
    };
    holeMasks = { u: make(true), v: make(false), panel: make(true, true) };
  }
  return holeMasks[along];
}
