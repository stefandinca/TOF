import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        library: 'library.html',
        import: 'import-games.html',
        admin: 'admin.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
