import {
  CatmullRomCurve3,
  CylinderGeometry,
  LatheGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from 'three';
import { finishMaterials } from '../finishMaterials';
import { createBevelBox } from '../propGeometry';
import { Part, useGeometries, type PropProps } from '../propParts';
import { DECOR_MODELS, FittedModel } from './DecorModel';
import { COFFEE_TRAY_T_M, MUG_H_M, MUG_R_M, coffeeLayout } from '../../../../utils/shapes/decorShapes';

const TRAY_T_M = COFFEE_TRAY_T_M;

// Mug: open lathe shell (outer wall, rim, inner wall) of radius r and height hgt
function mugProfile(r: number, hgt: number): Vector2[] {
  const wall = 0.004;
  return [
    new Vector2(0.001, 0),
    new Vector2(r * 0.92, 0),
    new Vector2(r, 0.01),
    new Vector2(r, hgt - 0.002),
    new Vector2(r - wall / 2, hgt),
    new Vector2(r - wall, hgt - 0.002),
    new Vector2(r - wall, 0.012),
    new Vector2(0.001, 0.01),
  ];
}

// Gooseneck pour-over kettle body: flat base, wide shoulder, narrow neck under the lid
function kettleProfile(r: number, hgt: number): Vector2[] {
  const points: Vector2[] = [new Vector2(0.001, 0)];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const radius = r * (0.92 + 0.08 * Math.sin(t * Math.PI * 0.8)) * (t > 0.75 ? 1 - (t - 0.75) * 1.6 : 1);
    points.push(new Vector2(radius, t * hgt));
  }
  points.push(new Vector2(0.001, hgt));
  return points;
}

// Coffee corner (cafetera y menaje): oak serving board (CC0 model, procedural fallback), a
// matte-black gooseneck kettle, a glass French press with brewed coffee and two glazed mugs.
export function CoffeeSetProp({ width: w, height: h, depth: d }: PropProps) {
  // Shared with the collision shape (utils/shapes/decorShapes.ts)
  const l = coffeeLayout(w, h, d);
  const { kettleR, kettleH, pressR, pressH } = l;
  const mugR = MUG_R_M;
  const mugH = MUG_H_M;

  const g = useGeometries((): Record<string, BufferGeometry> => {
    const spout = new CatmullRomCurve3([
      new Vector3(kettleR * 0.8, kettleH * 0.15, 0),
      new Vector3(kettleR * 1.25, kettleH * 0.45, 0),
      new Vector3(kettleR * 1.45, kettleH * 0.95, 0),
      new Vector3(kettleR * 1.75, kettleH * 1.08, 0),
      new Vector3(kettleR * 2.0, kettleH * 1.0, 0),
    ]);
    const handle = new CatmullRomCurve3([
      new Vector3(-kettleR * 0.8, kettleH * 0.9, 0),
      new Vector3(-kettleR * 1.45, kettleH * 1.0, 0),
      new Vector3(-kettleR * 1.55, kettleH * 0.55, 0),
      new Vector3(-kettleR * 0.95, kettleH * 0.25, 0),
    ]);
    return {
      tray: createBevelBox(w, TRAY_T_M * 0.6, d, 0.006),
      kettle: new LatheGeometry(kettleProfile(kettleR, kettleH), 36),
      spout: new TubeGeometry(spout, 32, 0.0055, 10),
      handle: new TubeGeometry(handle, 24, 0.008, 10),
      lid: new CylinderGeometry(kettleR * 0.55, kettleR * 0.6, 0.012, 28),
      knob: new CylinderGeometry(0.008, 0.01, 0.02, 14),
      pressGlass: new CylinderGeometry(pressR, pressR, pressH * 0.85, 32, 1, true),
      pressCoffee: new CylinderGeometry(pressR * 0.96, pressR * 0.96, pressH * 0.55, 28),
      pressLid: new CylinderGeometry(pressR * 1.04, pressR * 1.04, pressH * 0.08, 28),
      pressBase: new CylinderGeometry(pressR * 1.06, pressR * 1.06, pressH * 0.06, 28),
      plunger: new CylinderGeometry(0.003, 0.003, pressH * 0.18, 8),
      plungerKnob: new CylinderGeometry(0.011, 0.011, 0.012, 14).translate(0, 0, 0),
      mug: new LatheGeometry(mugProfile(mugR, mugH), 32),
      mugHandle: new TorusGeometry(0.024, 0.0055, 8, 20, Math.PI * 1.25),
      coffee: new CylinderGeometry(mugR - 0.005, mugR - 0.005, 0.002, 24),
    };
  }, [w, d, kettleR, kettleH, pressR, pressH]);

  const top = TRAY_T_M;
  const black = finishMaterials.matteBlack();
  const tray = <Part geometry={g.tray!} material={finishMaterials.oak()} position={[0, (TRAY_T_M * 0.6) / 2, 0]} />;
  return (
    <group>
      <FittedModel url={DECOR_MODELS.cuttingBoard} size={[w, TRAY_T_M, d]} fallback={tray} />
      {/* Gooseneck kettle, spout towards +X */}
      <group position={[l.kettle.x, top, l.kettle.z]} rotation={[0, l.kettle.turn, 0]}>
        <Part geometry={g.kettle!} material={black} position={[0, 0, 0]} />
        <Part geometry={g.spout!} material={black} position={[0, 0, 0]} />
        <Part geometry={g.handle!} material={black} position={[0, 0, 0]} />
        <Part geometry={g.lid!} material={black} position={[0, kettleH + 0.004, 0]} />
        <Part geometry={g.knob!} material={finishMaterials.oak()} position={[0, kettleH + 0.02, 0]} />
      </group>
      {/* French press */}
      <group position={[l.press.x, top, l.press.z]}>
        <Part geometry={g.pressBase!} material={finishMaterials.brushedSteel()} position={[0, pressH * 0.03, 0]} />
        <Part geometry={g.pressCoffee!} material={finishMaterials.coffee()} position={[0, pressH * 0.06 + pressH * 0.275, 0]} castShadow={false} />
        <Part geometry={g.pressGlass!} material={finishMaterials.glass()} position={[0, pressH * 0.06 + pressH * 0.425, 0]} castShadow={false} />
        <Part geometry={g.pressLid!} material={black} position={[0, pressH * 0.91 + pressH * 0.04, 0]} />
        <Part geometry={g.plunger!} material={finishMaterials.brushedSteel()} position={[0, pressH * 0.99 + pressH * 0.09, 0]} />
        <Part geometry={g.plungerKnob!} material={black} position={[0, pressH * 1.17, 0]} />
      </group>
      {/* Two mugs: sage and white */}
      {l.mugs.map((placement, i) => ({ ...placement, material: i === 0 ? finishMaterials.ceramicSage() : finishMaterials.ceramicWhite() })).map((mug) => (
        <group key={mug.x} position={[mug.x, top, mug.z]} rotation={[0, mug.turn, 0]}>
          <Part geometry={g.mug!} material={mug.material} position={[0, 0, 0]} />
          <Part geometry={g.coffee!} material={finishMaterials.coffee()} position={[0, mugH * 0.8, 0]} castShadow={false} />
          <group position={[mugR + 0.004, mugH * 0.5, 0]} rotation={[0, 0, -Math.PI * 0.625]}>
            <Part geometry={g.mugHandle!} material={mug.material} position={[0, 0, 0]} />
          </group>
        </group>
      ))}
    </group>
  );
}
