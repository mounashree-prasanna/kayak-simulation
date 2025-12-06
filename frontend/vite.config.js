import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = resolve(__filename, '..')
const frontendPath = resolve(__dirname)

export default defineConfig({
  plugins: [react()],
  root: frontendPath,
  server: {
    port: 5174,
    watch: {
      // Use a function to ignore files outside frontend directory
      ignored: (path) => {
        const normalizedPath = resolve(path)
        
        // Only watch files inside frontend directory
        if (!normalizedPath.startsWith(frontendPath)) {
          return true
        }
        
        // Ignore standard patterns even within frontend
        if (path.includes('node_modules') || 
            path.includes('.git') || 
            path.includes('dist') || 
            path.includes('build') ||
            path.includes('.vite')) {
          return true
        }
        
        return false
      },
      // Reduce polling interval to prevent excessive restarts
      usePolling: false,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/events': {
        target: 'ws://localhost:8001',
        ws: true,
        changeOrigin: true,
        secure: false
      },
      '/health': {
        target: 'http://localhost:8001',
        changeOrigin: true
      }
    },
    strictPort: true,
    // Restrict file system access to frontend directory only
    fs: {
      strict: true,
      allow: [frontendPath]
    }
  },
  optimizeDeps: {
    exclude: []
  }
})

