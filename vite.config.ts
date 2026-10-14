import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { memoryApi } from './server/memoryApi'

export default defineConfig(({ mode }) => {
  // OPENAI_API_KEY (and optionally OPENAI_MODEL) come from .env and stay server-side
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      // `npm run dev:quest`: WebXR only starts on https, so the headset needs it over Wi-Fi
      mode === 'quest' && basicSsl(),
      memoryApi({
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL,
        passcode: env.DERIVE_PASSCODE,
        elevenKey: env.ELEVENLABS_API_KEY,
        voice: env.ELEVENLABS_VOICE_ID,
        speechModel: env.ELEVENLABS_MODEL,
        models: {
          interview: env.DERIVE_MODEL_INTERVIEW,
          historian: env.DERIVE_MODEL_HISTORIAN,
          literature: env.DERIVE_MODEL_LITERATURE,
          compare: env.DERIVE_MODEL_COMPARE,
        },
      }),
    ],
  }
})
