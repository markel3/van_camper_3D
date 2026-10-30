import { Vector3, type Material, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three';

// Wheel-arch notch cut (CSG-free): patched materials discard every fragment inside up to
// MAX_NOTCHES world-space boxes, so any prop (and the plain FurnitureBox) steps around the arch
// without touching its geometry. Box clipping planes cannot do this: a material's planes describe a
// single convex region, and a bed across the van needs one notch per arch.

export const MAX_NOTCHES = 2;

export interface NotchUniforms {
  notchMin: { value: Vector3[] };
  notchMax: { value: Vector3[] };
  notchCount: { value: number };
}

export const createNotchUniforms = (): NotchUniforms => ({
  notchMin: { value: Array.from({ length: MAX_NOTCHES }, () => new Vector3()) },
  notchMax: { value: Array.from({ length: MAX_NOTCHES }, () => new Vector3()) },
  notchCount: { value: 0 },
});

const VERTEX_HEAD = 'varying vec3 vNotchWorld;\n';
const VERTEX_HOOK = '#include <project_vertex>';
const FRAGMENT_HEAD = `varying vec3 vNotchWorld;
uniform vec3 notchMin[${MAX_NOTCHES}];
uniform vec3 notchMax[${MAX_NOTCHES}];
uniform int notchCount;
`;
const FRAGMENT_HOOK = '#include <clipping_planes_fragment>';
const FRAGMENT_CUT = `
  for (int i = 0; i < ${MAX_NOTCHES}; i++) {
    if (i < notchCount && all(greaterThan(vNotchWorld, notchMin[i])) && all(lessThan(vNotchWorld, notchMax[i]))) discard;
  }`;

// Built-in materials only: their shaders have the hooks. Custom ShaderMaterials (e.g. fat lines) stay uncut.
export const canNotch = (material: Material): boolean =>
  !(material as { isShaderMaterial?: boolean }).isShaderMaterial;

// Adds the cut to `material` in place, chaining any existing onBeforeCompile. Programs are shared
// by every notched material of the same kind (the uniforms are bound per material).
export function patchNotchMaterial(material: Material, uniforms: NotchUniforms): void {
  const previous = material.onBeforeCompile.bind(material);
  const previousKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer: WebGLRenderer) => {
    previous(shader, renderer);
    if (!shader.vertexShader.includes(VERTEX_HOOK) || !shader.fragmentShader.includes(FRAGMENT_HOOK)) return;
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader =
      VERTEX_HEAD +
      shader.vertexShader.replace(VERTEX_HOOK, `${VERTEX_HOOK}\n  vNotchWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = FRAGMENT_HEAD + shader.fragmentShader.replace(FRAGMENT_HOOK, `${FRAGMENT_HOOK}${FRAGMENT_CUT}`);
  };
  material.customProgramCacheKey = () => `${previousKey()}|notch-cut`;
  material.userData.notchCut = true;
  material.needsUpdate = true;
}
