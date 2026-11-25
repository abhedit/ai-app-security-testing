import { defineConfig } from 'vite';
import { createApi } from './server/api.js';

export default defineConfig({
  server: { host: '0.0.0.0', allowedHosts: ['terminal.local'] },
  plugins: [{
    name: 'aegis-api',
    configureServer(server) {
      server.middlewares.use(createApi());
    },
  }],
});
