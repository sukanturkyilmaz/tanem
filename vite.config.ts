import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 8080,
    strictPort: true,
    host: '0.0.0.0',
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://ebmjfuvairqzxsisshep.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibWpmdXZhaXJxenhzaXNzaGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMDk5ODUsImV4cCI6MjA3NDg4NTk4NX0.Vm0cgAW0Oxt-DXKbs1TNIYbA-Zqp7b2rkI9arFEhZic'),
  },
});
