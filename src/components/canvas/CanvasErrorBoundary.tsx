import { Component, useState, type ErrorInfo, type ReactNode } from 'react';

// WebGL2 availability probe on a throwaway canvas (the context is released right away)
export function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}

function WebGLFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" data-webgl-fallback className="absolute inset-0 z-0 flex items-center justify-center p-6 text-center">
      <div className="max-w-md rounded-md border border-cad-border bg-cad-panel p-5 text-cad-text shadow-lg">
        <h2 className="text-[15px] font-semibold">Tu navegador no puede mostrar el visor 3D (WebGL no disponible).</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-left text-[13px] text-cad-muted">
          <li>Activa la aceleración por hardware en los ajustes del navegador.</li>
          <li>Actualiza el navegador y los controladores de la tarjeta gráfica.</li>
          <li>Prueba con Chrome o Firefox.</li>
        </ul>
        <p className="mt-3 text-[12px] text-cad-faint">El catálogo, las propiedades y la telemetría siguen funcionando.</p>
        <button type="button" onClick={onRetry} className="mt-4 rounded-md bg-cad-accent px-4 py-1.5 text-[13px] text-white hover:opacity-90">
          Reintentar
        </button>
      </div>
    </div>
  );
}

interface BoundaryProps {
  onRetry: () => void;
  children: ReactNode;
}

class Boundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('3D viewport failed', error, info.componentStack);
  }
  override render() {
    return this.state.failed ? <WebGLFallback onRetry={this.props.onRetry} /> : this.props.children;
  }
}

// Wraps the R3F canvas: pre-checks WebGL2 and catches renderer errors, keeping the rest of the UI alive
export function CanvasErrorBoundary({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((n) => n + 1);
  if (!hasWebGL2()) return <WebGLFallback onRetry={retry} />;
  return (
    <Boundary key={attempt} onRetry={retry}>
      {children}
    </Boundary>
  );
}
