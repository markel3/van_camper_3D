import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Heavy 3D dependencies in their own long-cached chunks, so the app chunk stays small.
// Higher priority claims a module first; groups also pull in their dependencies, so the shared
// leaves (react, three) must outrank @react-three or they end up inside its chunk.
const vendorGroup = (name: string, packages: string, priority: number) => ({
  name,
  test: new RegExp(`[\\\\/]node_modules[\\\\/](${packages})[\\\\/]`),
  priority,
});

// Vite + React (Fast Refresh) + Tailwind CSS v4 (plugin nativo, sin PostCSS)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // three alone is ~740 kB minified and cannot be split further; the app chunk is ~100 kB
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            vendorGroup('three', 'three', 30),
            vendorGroup('react-three', '@react-three|three-stdlib|three-mesh-bvh|troika-[^\\\\/]+|camera-controls|maath|meshline|stats-gl|@monogrid', 20),
            vendorGroup('react', 'react|react-dom|scheduler', 40),
          ],
        },
      },
    },
  },
});
