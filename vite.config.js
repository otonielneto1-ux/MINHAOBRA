import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // O @supabase/supabase-js sozinho leva o pacote para ~550 kB (≈150 kB comprimido).
    // App de tela única: dividir em pedaços não compensa agora. Reavaliar se passar de 700 kB.
    chunkSizeWarningLimit: 700,
  },
})
