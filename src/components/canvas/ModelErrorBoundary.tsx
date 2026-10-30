import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ModelErrorBoundaryProps {
  url: string;
  fallback: ReactNode;
  children: ReactNode;
}

interface ModelErrorBoundaryState {
  url: string;
  failed: boolean;
}

// Falls back to the textured box when a .glb is missing or invalid. Resets when the URL changes.
export class ModelErrorBoundary extends Component<ModelErrorBoundaryProps, ModelErrorBoundaryState> {
  override state: ModelErrorBoundaryState = { url: this.props.url, failed: false };

  static getDerivedStateFromError(): Partial<ModelErrorBoundaryState> {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: ModelErrorBoundaryProps,
    state: ModelErrorBoundaryState,
  ): Partial<ModelErrorBoundaryState> | null {
    return props.url === state.url ? null : { url: props.url, failed: false };
  }

  override componentDidCatch(error: Error, _info: ErrorInfo): void {
    console.warn(`3D model ${this.props.url} could not be loaded; drawing the box instead.`, error);
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
