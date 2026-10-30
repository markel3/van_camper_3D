import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, ShaderMaterial, Sphere, Vector2, Vector3, Vector4 } from 'three';

// GPU droplets: every drop is a camera-facing quad stretched along its own velocity over a short
// "exposure" (the streak the eye integrates for a fast drop, like motion blur). Its whole life is
// computed in the vertex shader from per-drop random seeds and one time uniform: ballistic flight
// from the shower head (exit speed + gravity, so the impact speed is the physical √(v0² + 2gh)),
// landing clamped to the tray (or a raised obstacle), then splash droplets thrown back up at the
// impact point. Nothing is updated on the CPU per drop and nothing is allocated per frame.
//
// Turning the water on/off only moves two uniforms: a drop exists while its spawn time lies in
// [uOn, uOff], so the last drops still fall after the tap closes and the first ones need their
// fall time to reach the floor.
//
// Two emitters:
// - shower (uPointMode = 0): rain from a nozzle disc, one or more splash particles per drop at its
//   landing point, timed by the drop's own cycle;
// - point (uPointMode = 1): splash particles only, around a steady impact point (the tap stream).
//
// Thin drops narrower than ~1.5 px are drawn 1.5 px wide with proportionally lower alpha (pixel
// coverage), so distant rain neither aliases nor disappears.

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uOn;
uniform float uOff;
uniform float uGravity;
uniform vec3 uOrigin;
uniform float uNozzleR;
uniform float uSpeed;
uniform float uSpread;
uniform vec2 uBoxMin;
uniform vec2 uBoxMax;
uniform float uFloorY;
uniform vec4 uObstacle;
uniform float uObstacleY;
uniform float uPointMode;
uniform vec3 uImpact;
uniform float uImpactR;
uniform float uDropR;
uniform float uSplashR;
uniform float uSplashSpeed;
uniform float uExposure;
uniform float uViewportH;
attribute vec4 aSeed;
attribute vec4 aSeed2;
varying float vAcross;
varying float vAlong;
varying float vAlpha;

const float TAU = 6.2831853;

float fallTime( float v0, float h ) {
  return ( - v0 + sqrt( v0 * v0 + 2.0 * uGravity * max( h, 0.0 ) ) ) / uGravity;
}

vec3 ballistic( vec3 start, vec3 v0, float t ) {
  return start + v0 * t - vec3( 0.0, 0.5 * uGravity * t * t, 0.0 );
}

void main() {
  float kind = position.z; // 0 = rain drop, 1 = splash droplet
  bool alive = true;
  vec3 start;
  vec3 v0;
  float age;
  float radius;

  // Parent drop (the rain drop itself, or the drop a splash belongs to)
  float a = aSeed.x * TAU;
  vec2 dir = vec2( cos( a ), sin( a ) );
  float rr = sqrt( aSeed.y );
  vec3 nozzle = uOrigin + vec3( dir.x, 0.0, dir.y ) * rr * uNozzleR;
  float speed = uSpeed * ( 0.8 + 0.4 * aSeed.z );
  float ja = fract( aSeed.x * 7.13 + aSeed.z * 3.71 ) * TAU;
  vec2 vh = ( dir * rr * uSpread + vec2( cos( ja ), sin( ja ) ) * 0.025 ) * speed;
  float floorY = uFloorY;
  float fall = fallTime( speed, nozzle.y - floorY );
  vec2 land = clamp( nozzle.xz + vh * fall, uBoxMin, uBoxMax );
  if ( all( greaterThan( land, uObstacle.xy ) ) && all( lessThan( land, uObstacle.zw ) ) ) {
    floorY = uObstacleY;
    fall = fallTime( speed, nozzle.y - floorY );
  }
  vh = ( land - nozzle.xz ) / fall;

  float phase = aSeed.w;
  float period = fall;
  if ( uPointMode > 0.5 ) {
    period = 0.12 + 0.2 * aSeed.w;
    phase = aSeed.z;
  }
  float cycle = floor( uTime / period + phase );
  float spawn = ( cycle - phase ) * period;
  age = uTime - spawn;

  if ( kind < 0.5 ) {
    alive = spawn >= uOn && spawn <= uOff;
    start = nozzle;
    v0 = vec3( vh.x, - speed, vh.y );
    radius = uDropR * ( 0.6 + 0.8 * fract( aSeed.y * 13.7 + aSeed.w * 5.3 ) );
  } else {
    vec3 impact;
    if ( uPointMode > 0.5 ) {
      float b = aSeed.x * TAU;
      impact = uImpact + vec3( cos( b ), 0.0, sin( b ) ) * sqrt( aSeed.y ) * uImpactR;
      alive = spawn >= uOn && spawn <= uOff;
    } else {
      // The splash of the parent's previous landing, which happened exactly at this cycle's spawn
      impact = vec3( land.x, floorY, land.y );
      alive = spawn - period >= uOn && spawn - period <= uOff;
    }
    float b = aSeed2.x * TAU;
    float up = uSplashSpeed * ( 0.3 + 0.7 * aSeed2.y );
    float side = uSplashSpeed * ( 0.2 + 0.6 * aSeed2.z );
    start = impact + vec3( 0.0, 0.002, 0.0 );
    v0 = vec3( cos( b ) * side, up, sin( b ) * side );
    float life = min( 2.0 * up / uGravity, period );
    alive = alive && age < life && aSeed2.w > 0.15;
    radius = uSplashR * ( 0.5 + aSeed2.w );
  }

  float tailAge = max( age - uExposure, 0.0 );
  vec3 head = ballistic( start, v0, age );
  vec3 tail = ballistic( start, v0, tailAge );

  vec4 hv = modelViewMatrix * vec4( head, 1.0 );
  vec4 tv = modelViewMatrix * vec4( tail, 1.0 );
  vec2 axis = hv.xy - tv.xy;
  float axisLength = length( axis );
  vec2 along = axisLength > 1e-6 ? axis / axisLength : vec2( 0.0, 1.0 );
  vec2 across = vec2( - along.y, along.x );
  vec4 pos = mix( tv, hv, position.y );
  bool perspective = projectionMatrix[ 2 ][ 3 ] != 0.0;
  float pixel = 2.0 / ( projectionMatrix[ 1 ][ 1 ] * uViewportH ) * ( perspective ? max( - pos.z, 0.01 ) : 1.0 );
  float width = max( 2.0 * radius, 1.5 * pixel );
  pos.xy += across * position.x * width * 0.5 + along * ( position.y * 2.0 - 1.0 ) * radius;

  // Coverage of sub-pixel drops, and the light a fast drop spreads along its streak
  float streak = distance( head, tail );
  float blur = clamp( 6.0 * ( 2.0 * radius ) / ( streak + 2.0 * radius ), 0.6, 1.0 );
  vAlpha = alive ? ( 2.0 * radius / width ) * blur : 0.0;
  vAcross = position.x;
  vAlong = position.y;
  gl_Position = alive ? projectionMatrix * pos : vec4( 2.0, 2.0, 2.0, 1.0 );
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uBody;
uniform vec3 uGlint;
uniform float uOpacity;
varying float vAcross;
varying float vAlong;
varying float vAlpha;

void main() {
  float edge = 1.0 - vAcross * vAcross;
  if ( vAlpha <= 0.001 || edge <= 0.0 ) discard;
  // Cross-section of a water cylinder: a faint refracted body, a Fresnel rim and one specular line.
  // Added to what is behind (additive light), so water only ever brightens the background and
  // overlapping drops need no sorting.
  float ny = sqrt( edge );
  float fresnel = 0.04 + 0.96 * pow( 1.0 - ny, 5.0 );
  float glint = pow( max( 0.0, 1.0 - abs( vAcross + 0.35 ) * 3.0 ), 4.0 );
  // Streak brightness: fades in from the tail (motion blur) and softens at the head
  float ends = smoothstep( 0.0, 0.5, vAlong ) * ( 1.0 - 0.5 * smoothstep( 0.9, 1.0, vAlong ) );
  vec3 color = uBody * ( 0.3 + 0.7 * fresnel ) + uGlint * ( 0.8 * fresnel + 1.2 * glint );
  float alpha = vAlpha * uOpacity * ends * smoothstep( 0.0, 0.35, edge );
  gl_FragColor = vec4( color, clamp( alpha, 0.0, 1.0 ) );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export interface DropletUniforms {
  [name: string]: { value: unknown };
  uTime: { value: number };
  uOn: { value: number };
  uOff: { value: number };
  uGravity: { value: number };
  uOrigin: { value: Vector3 };
  uNozzleR: { value: number };
  uSpeed: { value: number };
  uSpread: { value: number };
  uBoxMin: { value: Vector2 };
  uBoxMax: { value: Vector2 };
  uFloorY: { value: number };
  uObstacle: { value: Vector4 };
  uObstacleY: { value: number };
  uPointMode: { value: number };
  uImpact: { value: Vector3 };
  uImpactR: { value: number };
  uDropR: { value: number };
  uSplashR: { value: number };
  uSplashSpeed: { value: number };
  uExposure: { value: number };
  uViewportH: { value: number };
  uBody: { value: Color };
  uGlint: { value: Color };
  uOpacity: { value: number };
}

export const GRAVITY = 9.81;
// Streak exposure: about what the eye integrates for a fast drop
export const STREAK_EXPOSURE_S = 1 / 45;
// Brightness of the drops' refracted body and highlights at full daylight (linear, below the
// bloom threshold so the spray glitters without blowing out)
export const DROP_BODY = new Color(0.5, 0.55, 0.6);
export const DROP_GLINT = new Color(1.1, 1.14, 1.2);

export function createDropletMaterial(): ShaderMaterial & { uniforms: DropletUniforms } {
  const uniforms: DropletUniforms = {
    uTime: { value: 0 },
    uOn: { value: 0 },
    uOff: { value: -1 },
    uGravity: { value: GRAVITY },
    uOrigin: { value: new Vector3() },
    uNozzleR: { value: 0.05 },
    uSpeed: { value: 2.5 },
    uSpread: { value: 0.15 },
    uBoxMin: { value: new Vector2(-1, -1) },
    uBoxMax: { value: new Vector2(1, 1) },
    uFloorY: { value: 0 },
    uObstacle: { value: new Vector4(1e3, 1e3, -1e3, -1e3) },
    uObstacleY: { value: 0 },
    uPointMode: { value: 0 },
    uImpact: { value: new Vector3() },
    uImpactR: { value: 0.01 },
    uDropR: { value: 0.0008 },
    uSplashR: { value: 0.0005 },
    uSplashSpeed: { value: 0.8 },
    uExposure: { value: STREAK_EXPOSURE_S },
    uViewportH: { value: 720 },
    uBody: { value: DROP_BODY.clone() },
    uGlint: { value: DROP_GLINT.clone() },
    uOpacity: { value: 0.75 },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    // The billboard's winding flips with the streak direction
    side: DoubleSide,
  });
  // Selection tint / notch overrides must leave the water alone (adapt/ItemSkin)
  material.userData.skinExempt = true;
  return material as ShaderMaterial & { uniforms: DropletUniforms };
}

// Deterministic PRNG, so a fixture always gets the same spray pattern
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CORNERS = [
  [-1, 0],
  [1, 0],
  [1, 1],
  [-1, 1],
] as const;

// `groups` drops, each made of `rainPerGroup` rain quads (0 or 1) followed by `splashPerGroup`
// splash quads sharing the parent's seed. Groups are contiguous, so a draw range over the first
// N groups is a consistent lower-quality subset.
export function createDropletGeometry(groups: number, rainPerGroup: 0 | 1, splashPerGroup: number, seed: number): BufferGeometry {
  const perGroup = rainPerGroup + splashPerGroup;
  const quads = groups * perGroup;
  const position = new Float32Array(quads * 4 * 3);
  const seedA = new Float32Array(quads * 4 * 4);
  const seedB = new Float32Array(quads * 4 * 4);
  const index = new Uint32Array(quads * 6);
  const random = mulberry32(seed);
  let quad = 0;
  for (let g = 0; g < groups; g += 1) {
    const parent = [random(), random(), random(), random()];
    for (let k = 0; k < perGroup; k += 1) {
      const kind = k < rainPerGroup ? 0 : 1;
      const own = [random(), random(), random(), random()];
      for (let c = 0; c < 4; c += 1) {
        const v = quad * 4 + c;
        position.set([CORNERS[c]![0], CORNERS[c]![1], kind], v * 3);
        seedA.set(parent, v * 4);
        seedB.set(own, v * 4);
      }
      index.set([quad * 4, quad * 4 + 1, quad * 4 + 2, quad * 4, quad * 4 + 2, quad * 4 + 3], quad * 6);
      quad += 1;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seedA, 4));
  geometry.setAttribute('aSeed2', new BufferAttribute(seedB, 4));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
}

// Index count drawing the first `groups` groups
export const dropletDrawCount = (groups: number, rainPerGroup: 0 | 1, splashPerGroup: number): number =>
  groups * (rainPerGroup + splashPerGroup) * 6;

// The quads' attribute positions are not where they are drawn: the bounds are the spray volume
export function setDropletBounds(geometry: BufferGeometry, centre: Vector3, radius: number): void {
  geometry.boundingSphere = new Sphere(centre.clone(), radius);
}
