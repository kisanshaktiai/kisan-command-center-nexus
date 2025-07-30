
import { defineConfig } from 'vite';
import { splitVendorChunkPlugin } from 'vite';

export const optimizationConfig = defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts': ['recharts'],
          
          // Feature chunks
          'feature-admin': [
            './src/components/super-admin',
            './src/pages/super-admin'
          ],
          'feature-tenant': [
            './src/components/tenant',
            './src/domain/tenants'
          ],
          'feature-billing': [
            './src/components/billing',
            './src/domain/billing'
          ],
          'feature-metrics': [
            './src/components/monitoring',
            './src/domain/metrics'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false
  },
  plugins: [
    splitVendorChunkPlugin()
  ]
});
