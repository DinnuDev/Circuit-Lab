import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[Circuit Lab Error Boundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100%', gap: 16, padding: 32, background: '#0f1117', color: '#e2e8f0',
        }}>
          <div style={{ fontSize: 40 }}>⚡</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#ef4444' }}>Something crashed</div>
          <div style={{ fontSize: 13, color: '#64748b', maxWidth: 420, textAlign: 'center' }}>
            {this.state.error?.message ?? 'An unexpected error occurred in this section.'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 20px', borderRadius: 8, background: '#3b82f6', color: 'white',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            Try to recover
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '6px 16px', borderRadius: 8, background: 'transparent',
              color: '#64748b', border: '1px solid #2a2d3e', cursor: 'pointer', fontSize: 12,
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
