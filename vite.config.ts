import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

const isTauriBuild = Boolean(
  process.env.TAURI_ENV_PLATFORM || process.env.VITE_TAURI === 'true'
)

const aliases: Record<string, string> = {
  '@': path.resolve(__dirname, './src'),
}

// Only alias to web mocks when running outside a real Tauri native container
if (!isTauriBuild) {
  Object.assign(aliases, {
    '@tauri-apps/api/core': path.resolve(__dirname, './src/mocks/tauriCore.ts'),
    '@tauri-apps/api/event': path.resolve(__dirname, './src/mocks/tauriEvent.ts'),
    '@tauri-apps/api/app': path.resolve(__dirname, './src/mocks/tauriApp.ts'),
    '@tauri-apps/plugin-autostart': path.resolve(__dirname, './src/mocks/tauriAutostart.ts'),
    '@tauri-apps/plugin-updater': path.resolve(__dirname, './src/mocks/tauriUpdater.ts'),
    '@tauri-apps/plugin-process': path.resolve(__dirname, './src/mocks/tauriProcess.ts'),
    '@tauri-apps/plugin-store': path.resolve(__dirname, './src/mocks/tauriStore.ts'),
    '@tauri-apps/plugin-shell': path.resolve(__dirname, './src/mocks/tauriShell.ts'),
    '@tauri-apps/plugin-fs': path.resolve(__dirname, './src/mocks/tauriFs.ts'),
  })
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  resolve: {
    alias: aliases,
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
