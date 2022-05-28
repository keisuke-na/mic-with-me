import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    host: '0.0.0.0',
    port: 3030,
    proxy: {
      '/api' : 'http://localhost:5000',
      '/socket.io' : {
        target: 'http://localhost:5000',
        ws: true,
      }
    }
  },
  build: {
    outDir: '../server/public'
  }
})
