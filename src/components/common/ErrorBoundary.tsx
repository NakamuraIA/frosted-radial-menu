import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Evita a janela em branco quando uma página quebra no render: mostra o erro e
 * um botão para recarregar (o estado do rascunho pode ser perdido, mas a janela
 * continua utilizável).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro de render na interface:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    return (
      <div className="app-crash" role="alert">
        <div className="app-crash__card">
          <span className="app-crash__kicker">Erro inesperado</span>
          <h1>Esta janela quebrou</h1>
          <p>
            Algo falhou ao renderizar a interface. Recarregue para voltar ao estado salvo — o que
            não foi salvo no painel será perdido.
          </p>
          <pre>{error.message}</pre>
          <button type="button" onClick={() => window.location.reload()}>
            Recarregar janela
          </button>
        </div>
      </div>
    );
  }
}
