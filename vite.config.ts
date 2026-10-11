import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { memoryApi } from './server/memoryApi'

export default defineConfig(({ mode }) => {
  // OPENAI_API_KEY (and optionally OPENAI_MODEL) come from .env and stay server-side
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), memoryApi({ apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL, passcode: env.DERIVE_PASSCODE })],
  }
})
