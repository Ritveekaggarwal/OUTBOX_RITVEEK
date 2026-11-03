import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:4000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      // Same-origin API calls: the session cookie stays httpOnly + SameSite=Lax.
      proxy: {
        '/api': { target: apiTarget, changeOrigin: false },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            editor: ['@tiptap/react', '@tiptap/starter-kit'],
          },
        },
      },
    },
  };
});
