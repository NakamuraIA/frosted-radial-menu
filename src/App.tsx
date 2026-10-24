import { getCurrentWindow } from '@tauri-apps/api/window';
import { RadialMenu } from './components/radial/RadialMenu';
import { SettingsPanel } from './components/settings/SettingsPanel';
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

  if (windowLabel === 'settings') {
    return <SettingsPanel />;
  }

  return (
    <div className="app-wrapper">
      <RadialMenu />
    </div>
  );
}

export default App;
