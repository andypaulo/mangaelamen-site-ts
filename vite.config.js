import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // 1. Mudamos a raiz para a pasta frontend geral
  root: './src/frontend', 
plugins: [
    tailwindcss(),
  ],
  
  server: {
    port: 5173,
    open: '/pages/homepage/index.html', 
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: '../dist-front',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/frontend/pages/homepage/index.html'),
        login: resolve(__dirname, 'src/frontend/pages/login/index.html'),
        // Adicione outras páginas aqui conforme for criando, ex:
        // contato: resolve(__dirname, 'frontend/pages/homepage/contato.html')
      }
    }
  }
});