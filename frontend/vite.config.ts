import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the backend dev server (backend/: `npm run dev`).
    // Same origin for the browser, so the login cookie works without CORS.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
