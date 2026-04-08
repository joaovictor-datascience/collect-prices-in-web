import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  cacheDir: '/tmp/collect-prices-vite',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
