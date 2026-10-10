import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tauri-apps/api/core': path.resolve(__dirname, './src/mocks/tauriCore.ts'),
      '@tauri-apps/api/event': path.resolve(__dirname, './src/mocks/tauriEvent.ts'),
      '@tauri-apps/api/app': path.resolve(__dirname, './src/mocks/tauriApp.ts'),
      '@tauri-apps/plugin-autostart': path.resolve(__dirname, './src/mocks/tauriAutostart.ts'),
      '@tauri-apps/plugin-updater': path.resolve(__dirname, './src/mocks/tauriUpdater.ts'),
      '@tauri-apps/plugin-process': path.resolve(__dirname, './src/mocks/tauriProcess.ts'),
      '@tauri-apps/plugin-store': path.resolve(__dirname, './src/mocks/tauriStore.ts'),
      '@tauri-apps/plugin-shell': path.resolve(__dirname, './src/mocks/tauriShell.ts'),
      '@tauri-apps/plugin-fs': path.resolve(__dirname, './src/mocks/tauriFs.ts'),
    },
  },

  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor'
          if (id.includes('node_modules/@mui/')) return 'ui'
          if (id.includes('node_modules/recharts')) return 'charts'
        },
      },
    },
  },
})
