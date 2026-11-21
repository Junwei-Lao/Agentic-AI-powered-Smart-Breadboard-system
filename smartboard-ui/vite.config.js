import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nemotronMiddleware } from './server/nemotronMiddleware.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'NVIDIA_');
  const middleware = nemotronMiddleware(env);
  return {
    plugins: [react(), {
      name: 'pinpoint-nemotron',
      configureServer(server) { server.middlewares.use(middleware); },
      configurePreviewServer(server) { server.middlewares.use(middleware); },
    }],
    server: { port: 5173, open: false },
  };
});
