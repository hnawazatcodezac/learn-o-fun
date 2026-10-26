import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** The unit tests run the code as the development server does: with the development tools. */
export default defineConfig({
  plugins: [react()],
  define: { __DEV_TOOLS__: 'true' },
});
