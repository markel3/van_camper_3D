import { CylinderGeometry, DoubleSide, FrontSide, MeshPhysicalMaterial, Vector2, type WebGLProgramParametersWithUniforms } from 'three';
import { GRAVITY } from './dropletField';

// Lit water surfaces: three's physical material (environment reflections, lights, shadows, AO and
// tone mapping like everything else) with a small shader patch. No `transmission` on purpose: it
// would render the whole scene again every frame. Clear water is mostly what it reflects, so the
// alpha is driven by the Fresnel term and the specular light actually received: grazing edges and
// highlights read as water, the face-on body stays nearly invisible.
//
// - Stream (tap): a unit open cylinder reshaped in the vertex shader into a laminar jet: the
//   radius narrows as the water accelerates (continuity: r = r0·√(v0/v), v = √(v0² + 2gd)),
//   varicose ripples grow towards the bottom (Plateau–Rayleigh) and travel down with the flow,
//   with a slight wobble; the visible span [uTail, uHead] lets the jet fall in and break off.
//   A scrolling normal perturbation gives the moving highlights of real flowing water.
// - Film (sink bottom, shower tray): a flat wet layer whose normal carries expanding ripple rings
//   (rain mode: up to 10 random impacts; steady mode: waves around one impact point).

const ALPHA_PATCH = /* glsl */ `
float waterNV = abs( dot( normal, normalize( vViewPosition ) ) );
float waterFresnel = pow( 1.0 - waterNV, 4.0 );
float waterSpec = dot( totalSpecular, vec3( 0.2126, 0.7152, 0.0722 ) );
diffuseColor.a = clamp( uWaterAlpha * ( uWaterBase + 0.7 * waterFresnel + 1.4 * waterSpec ), 0.0, 1.0 );
#include <opaque_fragment>
`;

const STREAM_VERTEX_DECL = /* glsl */ `
uniform float uTime;
uniform float uLength;
uniform float uR0;
uniform float uV0;
uniform float uHead;
uniform float uTail;
varying float vStreamD;
varying float vStreamAngle;
`;

const STREAM_NORMAL = /* glsl */ `
float streamD = clamp( clamp( - position.y, 0.0, 1.0 ) * uLength, uTail, uHead );
float streamV = sqrt( uV0 * uV0 + 2.0 * ${GRAVITY.toFixed(2)} * streamD );
float streamGrow = streamD / max( uLength, 1e-3 );
float streamR = uR0 * sqrt( uV0 / streamV );
streamR *= 1.0 + streamGrow * streamGrow * ( 0.12 * sin( 150.0 * streamD - 34.0 * uTime ) + 0.06 * sin( 67.0 * streamD - 19.0 * uTime + 1.3 ) );
// Rounded leading front and, once the tap is closed, trailing end
streamR *= sqrt( clamp( ( uHead - streamD ) / ( 1.5 * uR0 ), 0.0, 1.0 ) );
if ( uTail > 0.0 ) streamR *= sqrt( clamp( ( streamD - uTail ) / ( 1.5 * uR0 ), 0.0, 1.0 ) );
vec2 streamWobble = vec2( sin( uTime * 7.0 + streamD * 9.0 ), cos( uTime * 5.3 + streamD * 11.0 ) ) * 0.0015 * streamGrow;
vec3 objectNormal = normalize( vec3( position.x, 0.0, position.z ) );
vStreamD = streamD;
vStreamAngle = atan( position.z, position.x );
`;

const STREAM_POSITION = /* glsl */ `
vec3 transformed = vec3( position.x * streamR + streamWobble.x, - streamD, position.z * streamR + streamWobble.y );
`;

const STREAM_FRAGMENT_DECL = /* glsl */ `
uniform float uTime;
uniform float uWaterAlpha;
uniform float uWaterBase;
varying float vStreamD;
varying float vStreamAngle;
`;

const STREAM_NORMAL_PERTURB = /* glsl */ `
#include <normal_fragment_maps>
{
  float flow = vStreamD * 60.0 - uTime * 24.0;
  float n1 = sin( flow + 3.0 * sin( vStreamAngle * 3.0 + vStreamD * 20.0 ) );
  float n2 = sin( flow * 1.7 + vStreamAngle * 5.0 + 1.3 );
  normal = normalize( normal + 0.2 * vec3( n1, n2, 0.0 ) );
}
`;

export interface StreamUniforms {
  uTime: { value: number };
  uLength: { value: number };
  uR0: { value: number };
  uV0: { value: number };
  uHead: { value: number };
  uTail: { value: number };
  uWaterAlpha: { value: number };
  uWaterBase: { value: number };
}

export function createStreamUniforms(): StreamUniforms {
  return {
    uTime: { value: 0 },
    uLength: { value: 0.3 },
    uR0: { value: 0.007 },
    uV0: { value: 0.65 },
    uHead: { value: 0 },
    uTail: { value: 0 },
    uWaterAlpha: { value: 1 },
    uWaterBase: { value: 0.32 },
  };
}

// Water surfaces look the same for every fixture; uniforms are per instance (time, shape)
function baseWater(): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    color: '#0b1a20',
    roughness: 0.04,
    metalness: 0,
    ior: 1.333,
    specularIntensity: 1,
    transparent: true,
    depthWrite: false,
  });
  material.userData.skinExempt = true;
  return material;
}

export function createStreamMaterial(uniforms: StreamUniforms): MeshPhysicalMaterial {
  const material = baseWater();
  // Aerated tap water: a milky, slightly bright body (air bubbles scatter light) under the reflections
  material.color.set('#c9d8df');
  material.side = FrontSide;
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = STREAM_VERTEX_DECL + shader.vertexShader
      .replace('#include <beginnormal_vertex>', STREAM_NORMAL)
      .replace('#include <begin_vertex>', STREAM_POSITION);
    shader.fragmentShader = STREAM_FRAGMENT_DECL + shader.fragmentShader
      .replace('#include <normal_fragment_maps>', STREAM_NORMAL_PERTURB)
      .replace('#include <opaque_fragment>', ALPHA_PATCH);
  };
  material.customProgramCacheKey = () => 'water-stream';
  return material;
}

// Unit jet: open cylinder of radius 1 from y = 0 (outlet) down to y = −1, densely cut along its length
export function createStreamGeometry(radialSegments: number): CylinderGeometry {
  const geometry = new CylinderGeometry(1, 1, 1, radialSegments, 96, true);
  geometry.translate(0, -0.5, 0);
  return geometry;
}

// ---- Wet film with ripples ----

const FILM_VERTEX_DECL = /* glsl */ `
varying vec2 vFilmPos;
varying vec3 vFilmTX;
varying vec3 vFilmTZ;
`;
const FILM_VERTEX = /* glsl */ `
#include <begin_vertex>
vFilmPos = position.xz;
vFilmTX = normalize( ( modelViewMatrix * vec4( 1.0, 0.0, 0.0, 0.0 ) ).xyz );
vFilmTZ = normalize( ( modelViewMatrix * vec4( 0.0, 0.0, 1.0, 0.0 ) ).xyz );
`;

const FILM_FRAGMENT_DECL = /* glsl */ `
uniform float uTime;
uniform float uOn;
uniform float uOff;
uniform float uWaterAlpha;
uniform float uWaterBase;
uniform vec2 uRippleCentre;
uniform vec2 uRippleSpread;
uniform float uSteady;
varying vec2 vFilmPos;
varying vec3 vFilmTX;
varying vec3 vFilmTZ;

float filmHash( vec2 p ) {
  return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
}

// Gradient of one expanding ring (Gaussian-windowed wave train), damped with age
vec2 filmRing( vec2 p, vec2 centre, float age ) {
  vec2 d = p - centre;
  float r = length( d ) + 1e-4;
  float w = 0.008 + age * 0.02;
  float x = ( r - age * 0.25 ) / w;
  float env = exp( - x * x ) * exp( - age * 3.5 ) * 0.0012;
  float dh = env * ( 3.0 * cos( 3.0 * x ) - 2.0 * x * sin( 3.0 * x ) ) / w;
  return dh * d / r;
}
`;

const FILM_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
{
  vec2 grad = vec2( 0.0 );
  for ( int i = 0; i < 10; i ++ ) {
    float fi = float( i );
    float period = 0.32 + 0.25 * filmHash( vec2( fi, 1.7 ) );
    float phase = filmHash( vec2( fi, 4.3 ) );
    float cycle = floor( uTime / period + phase );
    float age = ( uTime / period + phase - cycle ) * period;
    float spawn = uTime - age;
    if ( spawn < uOn || spawn > uOff ) continue;
    vec2 jitter = vec2( filmHash( vec2( fi, cycle ) ), filmHash( vec2( cycle, fi + 9.1 ) ) ) * 2.0 - 1.0;
    grad += filmRing( vFilmPos, uRippleCentre + jitter * uRippleSpread, age );
  }
  if ( uSteady > 0.5 && uTime - uOff < 0.0 ) {
    // Continuous waves running out of a stream's impact point
    vec2 d = vFilmPos - uRippleCentre;
    float r = length( d ) + 1e-4;
    float k = 260.0;
    float decay = exp( - r / 0.05 );
    float dh = 0.0007 * decay * ( k * cos( k * r - 45.0 * uTime ) - sin( k * r - 45.0 * uTime ) / 0.05 );
    grad += dh * d / r;
  }
  normal = normalize( normal - grad.x * vFilmTX - grad.y * vFilmTZ );
}
`;

export interface FilmUniforms {
  uTime: { value: number };
  uOn: { value: number };
  uOff: { value: number };
  uWaterAlpha: { value: number };
  uWaterBase: { value: number };
  uRippleCentre: { value: Vector2 };
  uRippleSpread: { value: Vector2 };
  uSteady: { value: number };
}

export function createFilmUniforms(): FilmUniforms {
  return {
    uTime: { value: 0 },
    uOn: { value: 0 },
    uOff: { value: -1 },
    uWaterAlpha: { value: 0 },
    uWaterBase: { value: 0.14 },
    uRippleCentre: { value: new Vector2() },
    uRippleSpread: { value: new Vector2(0.1, 0.1) },
    uSteady: { value: 0 },
  };
}

export function createFilmMaterial(uniforms: FilmUniforms): MeshPhysicalMaterial {
  const material = baseWater();
  material.side = DoubleSide;
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -1;
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = FILM_VERTEX_DECL + shader.vertexShader.replace('#include <begin_vertex>', FILM_VERTEX);
    shader.fragmentShader = FILM_FRAGMENT_DECL + shader.fragmentShader
      .replace('#include <normal_fragment_maps>', FILM_NORMAL)
      .replace('#include <opaque_fragment>', ALPHA_PATCH);
  };
  material.customProgramCacheKey = () => 'water-film';
  return material;
}
