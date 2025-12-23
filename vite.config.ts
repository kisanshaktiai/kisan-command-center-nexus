import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Generate build hash from timestamp (short hash for display)
const generateBuildHash = () => {
  const now = Date.now();
  return now.toString(36).slice(-7); // Short hash like "a9f3c12"
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // Inject version info at build time
  define: {
    // Read version from package.json (fallback to 0.0.1)
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '0.0.1'),
    // Generate unique build hash for each build
    'import.meta.env.VITE_BUILD_HASH': JSON.stringify(process.env.VITE_BUILD_HASH || generateBuildHash()),
    // App key for version API
    'import.meta.env.VITE_APP_KEY': JSON.stringify(process.env.VITE_APP_KEY || 'USER_APP'),
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
