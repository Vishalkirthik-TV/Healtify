import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dotenv from 'dotenv'

dotenv.config()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.fbx', '**/*.obj', '**/*.onnx', '**/*.wasm'],
  build: {
    rollupOptions: {
      external: [],
    },
  },
  optimizeDeps: {
    exclude: ['three']
  },
  define: {
    global: 'globalThis',
  },
  server: {
    allowedHosts: ['localhost', '127.0.0.1', "excel-oval-liberal-bloomberg.trycloudflare.com", "plugin-exams-sleep-insert.trycloudflare.com"],
    headers: {
      // Relaxed COOP/COEP to allow CDN resources (like ONNX WASM files) to load
      // 'Cross-Origin-Embedder-Policy': 'require-corp',  // Commented out to allow CDN WASM loading
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    fs: {
      // Allow serving files from the public directory
      strict: false
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  publicDir: 'public'
})
