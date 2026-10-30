import { useEffect, useRef, type RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import { useViewStore } from '../../../store/useViewStore';
import { MAX_PITCH_RAD, MOUSE_SENSITIVITY } from './walkConstants';
import { pointerLocked } from './walkStore';

export interface WalkInput {
  keys: Set<string>;
  yaw: number;
  pitch: number;
  // Incremented on each [E] press; the frame loop consumes it
  interactRequests: number;
}

// Ignore the Escape that the browser itself used to release the pointer lock
const ESC_AFTER_UNLOCK_MS = 400;

const MOVE_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ShiftLeft',
  'ShiftRight',
]);

const isTextField = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

// Keyboard + mouse look for the walkthrough. Mouse look uses the Pointer Lock API (click the
// viewport); where it is unavailable (headless, iframes) dragging with the left button looks around.
// Esc releases the lock first; a second Esc (or "Cerrar Recorrido") leaves the walkthrough.
export function useWalkInput(initialYaw: number): RefObject<WalkInput> {
  const canvas = useThree((state) => state.gl.domElement);
  const input = useRef<WalkInput>({ keys: new Set(), yaw: initialYaw, pitch: 0, interactRequests: 0 });

  useEffect(() => {
    const state = input.current;
    let dragging = false;
    // Drag fallback works from client coordinates (movementX is not reliable without the lock)
    let lastX = 0;
    let lastY = 0;
    let unlockedAt = -Infinity;

    const look = (dx: number, dy: number) => {
      state.yaw -= dx * MOUSE_SENSITIVITY;
      state.pitch = Math.max(-MAX_PITCH_RAD, Math.min(MAX_PITCH_RAD, state.pitch - dy * MOUSE_SENSITIVITY));
    };
    const isLocked = () => document.pointerLockElement === canvas;

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      if (!isLocked() && typeof canvas.requestPointerLock === 'function') {
        try {
          // Chrome returns a promise that rejects when the lock is refused: keep drag-to-look then
          const result = canvas.requestPointerLock() as unknown;
          if (result instanceof Promise) result.catch(() => undefined);
        } catch {
          // Pointer lock unsupported: drag-to-look remains
        }
      }
    };
    const onMouseUp = () => {
      dragging = false;
    };
    const onMouseMove = (event: MouseEvent) => {
      if (isLocked()) look(event.movementX, event.movementY);
      else if (dragging && (event.buttons & 1) === 1) look(event.clientX - lastX, event.clientY - lastY);
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onLockChange = () => {
      const locked = isLocked();
      if (!locked && pointerLocked.get()) unlockedAt = performance.now();
      pointerLocked.set(locked);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextField(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.code === 'Escape') {
        if (isLocked()) document.exitPointerLock();
        else if (performance.now() - unlockedAt > ESC_AFTER_UNLOCK_MS) useViewStore.getState().setWalkthrough(false);
        return;
      }
      if (event.code === 'KeyE') {
        if (!event.repeat) state.interactRequests += 1;
        event.preventDefault();
        return;
      }
      if (MOVE_CODES.has(event.code)) {
        state.keys.add(event.code);
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => state.keys.delete(event.code);
    const onBlur = () => state.keys.clear();

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onLockChange);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onLockChange);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      if (isLocked()) document.exitPointerLock();
      pointerLocked.set(false);
      state.keys.clear();
    };
  }, [canvas]);

  return input;
}
