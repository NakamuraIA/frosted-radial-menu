import { getCurrentWindow } from '@tauri-apps/api/window';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { RadialMenu } from './components/radial/RadialMenu';
import { SettingsShell } from './components/settings/SettingsShell';
import './styles/app.css';

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
        <SettingsShell />
      ) : (
        <div className="app-wrapper">
          <RadialMenu />
        </div>
      )}
    </ErrorBoundary>
  );
}

export default App;
