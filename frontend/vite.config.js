import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: '0.0.0.0'
    },
    envPrefix: ['VITE_', 'REACT_APP_'],
    define: {
      __REACT_APP_API_URL__: JSON.stringify(env.REACT_APP_API_URL || ''),
      __REACT_APP_SOCKET_URL__: JSON.stringify(env.REACT_APP_SOCKET_URL || '')
    }
  };
});
