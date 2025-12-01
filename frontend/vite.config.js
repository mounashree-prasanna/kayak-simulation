import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
plugins: [react()],
root: resolve(__dirname),
server: {
  port: 5174,
  watch: {
    // Use a function to determine what to ignore
    ignored: (path) => {
      // Ignore everything outside the frontend directory
      const frontendPath = resolve(__dirname)
      const normalizedPath = resolve(path)
      
      // If path is outside frontend directory, ignore it
      if (!normalizedPath.startsWith(frontendPath)) {
        return true
      }
      
      // Ignore standard patterns
      if (path.includes('node_modules') || 
          path.includes('.git') || 
          path.includes('dist') || 
          path.includes('build')) {
        return true
      }
      
      return false
    }
  },
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  },
  strictPort: true,
  // Restrict file system access to frontend directory only
  fs: {
    strict: true,
    allow: [resolve(__dirname)]
  }
},
optimizeDeps: {
  exclude: []
}
})

