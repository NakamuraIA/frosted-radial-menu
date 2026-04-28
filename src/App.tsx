import { getCurrentWindow } from '@tauri-apps/api/window';
import { RadialMenu } from './components/RadialMenu'
import { SettingsPanel } from './components/SettingsPanel'
import './App.css'

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
  )
}

export default App
