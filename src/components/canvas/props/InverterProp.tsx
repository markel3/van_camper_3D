import { BoxGeometry, CylinderGeometry } from 'three';
import { propMaterials } from './propMaterials';
import { Part, clamp, useGeometries, type PropProps } from './propParts';

const CAP_W_M = 0.035; // dark end caps
const FIN_COUNT = 9;

// 12 V / 230 V inverter in a technical blue case (Victron Phoenix style): dark end caps, cooling
// fins on top, a light label panel with status LEDs and a rocker switch on the front (+Z), the
// 230 V socket on the +X cap and the red/black DC studs on the −X cap.
export function InverterProp({ width: w, height: h, depth: d }: PropProps) {
  const finH = clamp(h * 0.12, 0.01, 0.03);
  const bodyH = h - finH;
  const bodyW = w - 2 * CAP_W_M;
  const finPitch = bodyW / FIN_COUNT;

  const g = useGeometries(
    () => ({
      body: new BoxGeometry(bodyW, bodyH, d),
      cap: new BoxGeometry(CAP_W_M, h, d),
      fin: new BoxGeometry(finPitch * 0.35, finH, d * 0.9),
      label: new BoxGeometry(bodyW * 0.42, bodyH * 0.38, 0.003),
      led: new CylinderGeometry(0.005, 0.005, 0.004, 16).rotateX(Math.PI / 2),
      switch: new BoxGeometry(0.024, 0.04, 0.012),
      socket: new CylinderGeometry(Math.min(0.03, d * 0.25), Math.min(0.03, d * 0.25), 0.01, 28).rotateZ(Math.PI / 2),
      stud: new CylinderGeometry(0.009, 0.009, 0.014, 18).rotateZ(Math.PI / 2),
    }),
    [bodyW, bodyH, d, h, finPitch, finH],
  );

  const blue = propMaterials.inverterBlue();
  const frontZ = d / 2;
  return (
    <group>
      <Part geometry={g.body} material={blue} position={[0, bodyH / 2, 0]} />
      {Array.from({ length: FIN_COUNT }, (_, i) => (
        <Part key={i} geometry={g.fin} material={blue} position={[-bodyW / 2 + (i + 0.5) * finPitch, bodyH + finH / 2, 0]} />
      ))}
      {([-1, 1] as const).map((side) => (
        <Part key={side} geometry={g.cap} material={propMaterials.batteryLid()} position={[side * (w / 2 - CAP_W_M / 2), h / 2, 0]} />
      ))}
      {/* Front: label panel, status LEDs and rocker switch */}
      <Part geometry={g.label} material={propMaterials.labelPanel()} position={[-bodyW * 0.18, bodyH * 0.55, frontZ + 0.0015]} castShadow={false} />
      {[0, 1].map((i) => (
        <Part
          key={i}
          geometry={g.led}
          material={i === 0 ? propMaterials.statusLed() : propMaterials.lcd()}
          position={[bodyW * 0.12 + i * 0.03, bodyH * 0.65, frontZ + 0.002]}
          castShadow={false}
        />
      ))}
      <Part geometry={g.switch} material={propMaterials.terminalBlack()} position={[bodyW * 0.32, bodyH * 0.5, frontZ - 0.002]} />
      {/* 230 V socket on the +X cap, DC studs (+ red, − black) on the −X cap */}
      <Part geometry={g.socket} material={propMaterials.terminalBlack()} position={[w / 2 - 0.004, bodyH * 0.5, 0]} castShadow={false} />
      <Part geometry={g.stud} material={propMaterials.terminalRed()} position={[-w / 2 + 0.006, bodyH * 0.62, d * 0.15]} castShadow={false} />
      <Part geometry={g.stud} material={propMaterials.terminalBlack()} position={[-w / 2 + 0.006, bodyH * 0.38, d * 0.15]} castShadow={false} />
    </group>
  );
}
