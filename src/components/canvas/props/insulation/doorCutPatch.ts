import type { Material, WebGLProgramParametersWithUniforms } from 'three';
import { doorCutUniforms } from '../van/vanDoorMotion';

// Interior layers (bare shell, insulation, lining) are cut out of an open cargo door's opening:
// fragments inside the world-space boxes of doorCutUniforms are discarded, so through the open
// door you see outside instead of the inner door skin, its insulation and the wall boards.
// Applied once to every interior material (interiorMaterials.ts registry). The patch function is
// shared, so three.js keeps one program per material setup (cache key = the function source).

const VERTEX_DECL = /* glsl */ `
varying vec3 vDoorCutWorld;
`;
const VERTEX_BODY = /* glsl */ `
#include <project_vertex>
{
  vec4 doorCutPos = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    doorCutPos = instanceMatrix * doorCutPos;
  #endif
  vDoorCutWorld = ( modelMatrix * doorCutPos ).xyz;
}
`;
const FRAGMENT_DECL = /* glsl */ `
varying vec3 vDoorCutWorld;
uniform vec3 uDoorCutMin[ 2 ];
uniform vec3 uDoorCutMax[ 2 ];
`;
const FRAGMENT_BODY = /* glsl */ `
#include <clipping_planes_fragment>
for ( int i = 0; i < 2; i ++ ) {
  if ( all( greaterThan( vDoorCutWorld, uDoorCutMin[ i ] ) ) && all( lessThan( vDoorCutWorld, uDoorCutMax[ i ] ) ) ) discard;
}
`;

function doorCutCompile(shader: WebGLProgramParametersWithUniforms): void {
  shader.uniforms.uDoorCutMin = doorCutUniforms.uDoorCutMin;
  shader.uniforms.uDoorCutMax = doorCutUniforms.uDoorCutMax;
  shader.vertexShader = VERTEX_DECL + shader.vertexShader.replace('#include <project_vertex>', VERTEX_BODY);
  shader.fragmentShader = FRAGMENT_DECL + shader.fragmentShader.replace('#include <clipping_planes_fragment>', FRAGMENT_BODY);
}

export function patchDoorCut(material: Material): void {
  // Not flagged in userData: clones copy userData but not onBeforeCompile
  material.onBeforeCompile = doorCutCompile;
}
