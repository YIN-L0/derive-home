import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Preview the headset version without a headset: open the dev server with ?emulate and an
// emulated Quest 3 (Meta's IWER) stands in for navigator.xr, with on-screen controls to move it
// and a synthetic room behind the dollhouse in place of passthrough.
async function emulateQuest() {
  const [{ XRDevice, metaQuest3 }, { DevUI }, { SyntheticEnvironmentModule }] = await Promise.all([
    import('iwer'),
    import('@iwer/devui'),
    import('@iwer/sem'),
  ])
  const device = new XRDevice(metaQuest3)
  device.installRuntime({ forceInstall: true }) // desktop Chrome has its own navigator.xr
  device.installDevUI(DevUI)
  device.installSEM(SyntheticEnvironmentModule)
  device.sem?.loadDefaultEnvironment('living_room')
}

const emulate = import.meta.env.DEV && new URLSearchParams(location.search).has('emulate')
;(emulate ? emulateQuest() : Promise.resolve()).finally(() =>
  createRoot(document.getElementById('root')!).render(<App />),
)
