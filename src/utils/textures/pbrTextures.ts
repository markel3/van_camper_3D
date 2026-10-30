import * as THREE from 'three';

// Shared loader for photographic PBR texture sets (CC0, Poly Haven / ambientCG) served from
// public/textures/<setId>/. Every set uses the same file names:
//   color.jpg (sRGB albedo), normal.jpg (OpenGL normal), roughness.jpg, ao.jpg (optional)
// Each set is loaded once and cached; callers clone a texture only when they need their own repeat.
// `sizeM` is the real-world size covered by one tile, so metric UVs (1 unit = 1 m) can set
// repeat = 1 / sizeM.

export interface PbrTextureSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  aoMap: THREE.Texture | null;
  sizeM: number;
}

export interface PbrSetDef {
  sizeM: number; // real-world tile size in metres
  hasAo?: boolean;
}

const cache = new Map<string, PbrTextureSet>();
const loader = new THREE.TextureLoader();

// 1×1 mid-grey stand-in until the photo arrives: clones made before the load (Texture.copy flags an
// update) then upload a valid image instead of logging "no image data found".
let placeholder: HTMLCanvasElement | null = null;
function placeholderImage(): HTMLCanvasElement {
  if (!placeholder) {
    placeholder = document.createElement('canvas');
    placeholder.width = placeholder.height = 1;
    const ctx = placeholder.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 1, 1);
    }
  }
  return placeholder;
}

function load(url: string, color: boolean): THREE.Texture {
  const texture = loader.load(url, undefined, undefined, () => {
    console.warn(`[pbrTextures] missing texture ${url}`);
  });
  if (!texture.image) (texture as THREE.Texture).image = placeholderImage();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return texture;
}

export function getPbrTextures(setId: string, def: PbrSetDef): PbrTextureSet {
  const cached = cache.get(setId);
  if (cached) return cached;
  const base = `/textures/${setId}/`;
  const set: PbrTextureSet = {
    map: load(`${base}color.jpg`, true),
    normalMap: load(`${base}normal.jpg`, false),
    roughnessMap: load(`${base}roughness.jpg`, false),
    aoMap: def.hasAo ? load(`${base}ao.jpg`, false) : null,
    sizeM: def.sizeM,
  };
  cache.set(setId, set);
  return set;
}

// Clones a set with its own repeat (for surfaces whose UVs are not metric). Clones share the GPU image.
export function withRepeat(set: PbrTextureSet, repeatX: number, repeatY: number): PbrTextureSet {
  const clone = (texture: THREE.Texture): THREE.Texture => {
    const copy = texture.clone();
    copy.repeat.set(repeatX, repeatY);
    return copy;
  };
  return {
    map: clone(set.map),
    normalMap: clone(set.normalMap),
    roughnessMap: clone(set.roughnessMap),
    aoMap: set.aoMap ? clone(set.aoMap) : null,
    sizeM: set.sizeM,
  };
}

// Metric-UV helper: repeat so one tile spans `sizeM` metres
export function metricRepeat(set: PbrTextureSet): PbrTextureSet {
  return withRepeat(set, 1 / set.sizeM, 1 / set.sizeM);
}
