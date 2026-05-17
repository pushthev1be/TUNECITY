import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const isItch = process.env.BUILD_TARGET === 'itch'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    ...(isItch ? [viteSingleFile()] : []),
  ],
  build: isItch ? {
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  } : {},
  test: {
    environment: 'node',
  },
})
