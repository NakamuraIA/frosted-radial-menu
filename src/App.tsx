import { lazy, Suspense } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { RadialMenu } from './components/radial/RadialMenu';
import './styles/app.css';

// O menu não carrega o código do painel de configurações (páginas grandes)
// até a janela de settings ser aberta.
const SettingsShell = lazy(() =>
  import('./components/settings/SettingsShell').then((module) => ({
    default: module.SettingsShell,
  })),
);

/** Cada janela do Tauri carrega a mesma SPA com um componente diferente. */
function getWindowLabel() {
  const previewLabel = new URLSearchParams(window.location.search).get('window');
  if (previewLabel) return previewLabel;

  try {
    return getCurrentWindow().label;
  } catch {
    return 'main';
  }
}

function App() {
  const windowLabel = getWindowLabel();

  return (
    <ErrorBoundary>
      {windowLabel === 'settings' ? (
        <Suspense
          fallback={
            <div className="settings-loading" role="status">
              Carregando configurações…
            </div>
          }
        >
          <SettingsShell />
        </Suspense>
      ) : (
        <div className="app-wrapper">
          <RadialMenu />
        </div>
      )}
    </ErrorBoundary>
  );
}

export default App;
