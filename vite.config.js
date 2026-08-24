import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    https: true,
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['.ngrok-free.app'],
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        home: 'index.html',
        ar: 'ar.html',
        labels: 'qr-labels.html',
      },
    },
  },
})
